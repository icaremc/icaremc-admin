/**
 * Temporary: browser calls api.icaremchealth.com so DevTools Network shows the real API.
 * Restore bridge-only: set NEXT_PUBLIC_BACKEND_BRIDGE_ONLY=true (or remove this installer).
 * // ponytail: remove when staging debugging is done
 */

import { adaptBackendResponse } from "@/lib/backend/adapters";
import { mapAdminApiToBackend } from "@/lib/backend/capabilities";
import {
  getBackendApiBaseUrl,
  isBackendApiEnabled,
} from "@/lib/backend/config";

let cachedToken: string | null = null;
let installed = false;

export function isBackendDirectEnabled(): boolean {
  if (!isBackendApiEnabled()) return false;
  const bridgeOnly =
    process.env.NEXT_PUBLIC_BACKEND_BRIDGE_ONLY?.trim().toLowerCase() ?? "";
  return !(
    bridgeOnly === "1" ||
    bridgeOnly === "true" ||
    bridgeOnly === "yes"
  );
}

async function readBackendToken(): Promise<string | null> {
  if (cachedToken) return cachedToken;
  const res = await fetch("/api/backend/auth/session", {
    credentials: "same-origin",
    cache: "no-store",
  });
  if (!res.ok) return null;
  const body = (await res.json()) as { token?: string };
  cachedToken = typeof body.token === "string" ? body.token : null;
  return cachedToken;
}

function adminPathFromUrl(raw: string): {
  adminPath: string;
  searchParams: URLSearchParams;
} | null {
  try {
    const url = new URL(raw, window.location.origin);
    if (!url.pathname.startsWith("/api/admin/")) return null;
    // Keep Chapa / local activity-log on the Next server
    if (
      url.pathname.startsWith("/api/admin/payout-requests/chapa-") ||
      url.pathname === "/api/admin/activity/log" ||
      url.pathname.startsWith("/api/admin/activity/log/")
    ) {
      return null;
    }
    return {
      adminPath: url.pathname.slice("/api/admin/".length).replace(/\/+$/, ""),
      searchParams: url.searchParams,
    };
  } catch {
    return null;
  }
}

export function installBackendDirectFetch(): () => void {
  if (typeof window === "undefined" || installed || !isBackendDirectEnabled()) {
    return () => {};
  }
  installed = true;
  const originalFetch = window.fetch.bind(window);

  window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    const raw =
      typeof input === "string"
        ? input
        : input instanceof URL
          ? input.href
          : input.url;

    const parsed = adminPathFromUrl(raw);
    if (!parsed) return originalFetch(input, init);

    const method = (init?.method ?? "GET").toUpperCase();
    const contentType =
      new Headers(init?.headers).get("content-type") ??
      (input instanceof Request ? input.headers.get("content-type") : null) ??
      "";

    // Multipart / upload rewrites stay on the bridge
    if (contentType.includes("multipart/form-data")) {
      return originalFetch(input, init);
    }

    const backendPath = mapAdminApiToBackend(parsed.adminPath, {
      method,
      searchParams: parsed.searchParams,
    });
    if (!backendPath || backendPath.startsWith("__")) {
      return originalFetch(input, init);
    }

    const token = await readBackendToken();
    if (!token) return originalFetch(input, init);

    const target = new URL(`${getBackendApiBaseUrl()}${backendPath}`);
    parsed.searchParams.forEach((value, key) => {
      target.searchParams.set(key, value);
    });

    const headers = new Headers(init?.headers);
    headers.set("Authorization", `Bearer ${token}`);
    if (init?.body && !headers.has("Content-Type") && !contentType) {
      headers.set("Content-Type", "application/json");
    }

    const upstream = await originalFetch(target.href, {
      ...init,
      method,
      headers,
      credentials: "omit",
      cache: "no-store",
    });

    if (upstream.status === 401) {
      cachedToken = null;
    }

    if (upstream.status === 204 || upstream.status === 205) {
      return upstream;
    }

    const text = await upstream.text();
    if (!text) return new Response(null, { status: upstream.status });

    let parsedBody: unknown = text;
    try {
      parsedBody = JSON.parse(text);
    } catch {
      return new Response(text, {
        status: upstream.status,
        headers: {
          "content-type":
            upstream.headers.get("content-type") ?? "text/plain",
        },
      });
    }

    const adapted = adaptBackendResponse(
      parsed.adminPath,
      method,
      upstream.status,
      parsedBody,
      { searchParams: parsed.searchParams },
    );

    return new Response(JSON.stringify(adapted), {
      status: upstream.status,
      headers: { "content-type": "application/json" },
    });
  };

  return () => {
    window.fetch = originalFetch;
    installed = false;
    cachedToken = null;
  };
}
