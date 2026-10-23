/**
 * Browser calls api.icaremchealth.com so DevTools Network shows the real API.
 * Auth login/session stay on /api/backend/* (httpOnly cookies).
 * Force bridge-only: NEXT_PUBLIC_BACKEND_BRIDGE_ONLY=true
 */

import { adaptBackendResponse } from "@/lib/backend/adapters";
import { mapAdminApiToBackend } from "@/lib/backend/capabilities";
import {
  getBackendApiBaseUrl,
  isBackendApiEnabled,
} from "@/lib/backend/config";
import { enrichPayoutBankInfo } from "@/lib/backend/enrichPayoutBankInfo";
import {
  isSettingsAdminPath,
  rewriteSettingsPutBody,
  shouldRewriteSettingsMethod,
} from "@/lib/backend/settingsRewrite";
import {
  parsePushAdminPath,
  rewritePushNotifyBody,
  rewriteUserNotifyBody,
} from "@/lib/backend/pushRewrite";

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
    const bodyIsFormData =
      typeof FormData !== "undefined" &&
      (init?.body instanceof FormData ||
        (input instanceof Request && input.headers.get("content-type")?.includes("multipart")));

    // Multipart / FormData rewrites (hospitals, membership grant, …) stay on the bridge
    // ponytail: browser sets multipart Content-Type later; FormData itself is the signal
    if (bodyIsFormData || contentType.includes("multipart/form-data")) {
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
      // ponytail: app selects settings row id; not a backend query param
      if (
        key === "app" &&
        parsed.adminPath.replace(/^\/+/, "").startsWith("app-version-settings")
      ) {
        return;
      }
      target.searchParams.set(key, value);
    });

    let upstreamMethod = method;
    let upstreamBody = init?.body;
    if (
      isSettingsAdminPath(parsed.adminPath) &&
      shouldRewriteSettingsMethod(method) &&
      typeof init?.body === "string"
    ) {
      try {
        upstreamMethod = "PUT";
        upstreamBody = JSON.stringify(
          rewriteSettingsPutBody(JSON.parse(init.body)),
        );
      } catch {
        upstreamMethod = "PUT";
      }
    }

    const pushPath =
      method === "POST" ? parsePushAdminPath(parsed.adminPath) : null;
    if (pushPath && typeof init?.body === "string") {
      try {
        const parsedBody = JSON.parse(init.body) as unknown;
        upstreamBody = JSON.stringify(
          pushPath.kind === "user"
            ? rewriteUserNotifyBody(parsedBody)
            : rewritePushNotifyBody(pushPath.id, parsedBody),
        );
      } catch {
        // keep original body
      }
    }

    const headers = new Headers(init?.headers);
    headers.set("Authorization", `Bearer ${token}`);
    if (upstreamBody && !headers.has("Content-Type") && !contentType) {
      headers.set("Content-Type", "application/json");
    }

    const upstream = await originalFetch(target.href, {
      ...init,
      method: upstreamMethod,
      body: upstreamBody,
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

    let bodyForAdapt = parsedBody;
    const adminHead = parsed.adminPath.split("/").filter(Boolean)[0] ?? "";
    if (
      upstream.ok &&
      upstreamMethod === "GET" &&
      token &&
      (adminHead === "payout-requests" || adminHead === "patient-withdrawals")
    ) {
      bodyForAdapt = await enrichPayoutBankInfo(
        parsed.adminPath,
        upstreamMethod,
        parsedBody,
        {
          baseUrl: getBackendApiBaseUrl(),
          token,
          fetchImpl: originalFetch,
        },
      );
    }

    const adapted = adaptBackendResponse(
      parsed.adminPath,
      upstreamMethod,
      upstream.status,
      bodyForAdapt,
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
