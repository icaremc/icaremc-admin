import { NextResponse } from "next/server";
import { adaptBackendResponse } from "@/lib/backend/adapters";
import {
  BACKEND_ACCESS_COOKIE,
  getBackendApiBaseUrl,
  isBackendApiEnabled,
} from "@/lib/backend/config";
import { mapAdminApiToBackend } from "@/lib/backend/capabilities";

export function readAccessToken(request: Request): string | null {
  const header = request.headers.get("authorization");
  if (header?.toLowerCase().startsWith("bearer ")) {
    return header.slice(7).trim() || null;
  }
  const cookie = request.headers.get("cookie") ?? "";
  const match = cookie.match(new RegExp(`(?:^|;\\s*)${BACKEND_ACCESS_COOKIE}=([^;]+)`));
  return match?.[1] ? decodeURIComponent(match[1]) : null;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/** Rewrite admin request bodies/methods to match Render admin API shapes. */
function rewriteUpstreamRequest(
  adminPath: string,
  method: string,
  rawBody: ArrayBuffer | null,
): { method: string; body: ArrayBuffer | null; contentType: string | null } {
  const path = adminPath.replace(/^\/+/, "").replace(/\/+$/, "");
  const segments = path.split("/").filter(Boolean);
  const head = segments[0] ?? "";
  const rest = segments.slice(1);
  const upper = method.toUpperCase();

  if (!rawBody || rawBody.byteLength === 0) {
    return { method: upper, body: null, contentType: null };
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(new TextDecoder().decode(rawBody));
  } catch {
    return { method: upper, body: rawBody, contentType: "application/json" };
  }

  // PATCH /doctors/:id { is_verified } → POST /doctors/:id/verify
  if (head === "doctors" && rest.length === 1 && upper === "PATCH") {
    return {
      method: "POST",
      body: new TextEncoder().encode(JSON.stringify(parsed)).buffer as ArrayBuffer,
      contentType: "application/json",
    };
  }

  // PATCH /payout-requests/:id { action, adminNote } → POST { status, admin_note }
  if (head === "payout-requests" && rest.length === 1 && (upper === "PATCH" || upper === "POST")) {
    if (isPlainObject(parsed) && typeof parsed.action === "string") {
      const statusMap: Record<string, string> = {
        approve: "approved",
        reject: "rejected",
        complete: "completed",
      };
      const status = statusMap[parsed.action] ?? parsed.action;
      const rewritten = {
        status,
        admin_note:
          typeof parsed.adminNote === "string"
            ? parsed.adminNote
            : typeof parsed.admin_note === "string"
              ? parsed.admin_note
              : null,
      };
      return {
        method: "POST",
        body: new TextEncoder().encode(JSON.stringify(rewritten)).buffer as ArrayBuffer,
        contentType: "application/json",
      };
    }
  }

  // POST /users|:id/push or /doctors/:id/push → /push/notify
  if (
    (head === "users" || head === "doctors") &&
    rest.length === 2 &&
    rest[1] === "push" &&
    upper === "POST"
  ) {
    if (isPlainObject(parsed)) {
      const rewritten = {
        user_id: rest[0],
        title: typeof parsed.title === "string" ? parsed.title : "",
        body: typeof parsed.body === "string" ? parsed.body : "",
        type: "generic",
        data:
          typeof parsed.route === "string" && parsed.route
            ? { route: parsed.route }
            : {},
      };
      return {
        method: "POST",
        body: new TextEncoder().encode(JSON.stringify(rewritten)).buffer as ArrayBuffer,
        contentType: "application/json",
      };
    }
  }

  // PATCH app-version-settings → PUT settings { data }
  if (head === "app-version-settings" && (upper === "PATCH" || upper === "PUT")) {
    if (isPlainObject(parsed)) {
      const data = parsed.appVersionSettings ?? parsed.data ?? parsed;
      return {
        method: "PUT",
        body: new TextEncoder().encode(JSON.stringify({ data })).buffer as ArrayBuffer,
        contentType: "application/json",
      };
    }
  }

  // PATCH finance/payment/app-membership settings → PUT { data }
  if (
    (head === "finance-settings" ||
      head === "payment-settings" ||
      head === "app-membership-settings") &&
    (upper === "PATCH" || upper === "PUT")
  ) {
    if (isPlainObject(parsed)) {
      const data =
        parsed.financeSettings ??
        parsed.paymentSettings ??
        parsed.appMembershipSettings ??
        parsed.data ??
        parsed;
      return {
        method: "PUT",
        body: new TextEncoder().encode(JSON.stringify({ data })).buffer as ArrayBuffer,
        contentType: "application/json",
      };
    }
  }

  return { method: upper, body: rawBody, contentType: "application/json" };
}

export async function proxyAdminRequestToBackend(
  request: Request,
  adminPath: string,
): Promise<NextResponse> {
  if (!isBackendApiEnabled()) {
    return NextResponse.json(
      { error: "Backend API mode is disabled", stagingUnavailable: false },
      { status: 404 },
    );
  }

  const incomingUrl = new URL(request.url);
  const method = request.method.toUpperCase();
  const backendPath = mapAdminApiToBackend(adminPath, {
    method,
    searchParams: incomingUrl.searchParams,
  });
  if (!backendPath) {
    return NextResponse.json(
      {
        error:
          "This admin API is not available on the staging Render backend yet. Production still uses Supabase.",
        stagingUnavailable: true,
        adminPath,
      },
      { status: 501 },
    );
  }

  const token = readAccessToken(request);
  if (!token) {
    return NextResponse.json(
      { error: "Not signed in to staging backend. Sign in again.", stagingUnavailable: false },
      { status: 401 },
    );
  }

  const target = new URL(`${getBackendApiBaseUrl()}${backendPath}`);
  incomingUrl.searchParams.forEach((value, key) => {
    if (key === "app" && adminPath.replace(/^\/+/, "").startsWith("app-version-settings")) {
      return;
    }
    target.searchParams.set(key, value);
  });

  const rawBody =
    method !== "GET" && method !== "HEAD" ? await request.arrayBuffer() : null;
  const rewritten = rewriteUpstreamRequest(adminPath, method, rawBody);

  const headers = new Headers();
  headers.set("Authorization", `Bearer ${token}`);
  if (rewritten.contentType) headers.set("Content-Type", rewritten.contentType);

  const init: RequestInit = {
    method: rewritten.method,
    headers,
    cache: "no-store",
  };
  if (rewritten.body) init.body = rewritten.body;

  try {
    const upstream = await fetch(target, init);
    const text = await upstream.text();
    let parsed: unknown = text;
    try {
      parsed = text ? JSON.parse(text) : null;
    } catch {
      return new NextResponse(text, {
        status: upstream.status,
        headers: { "content-type": upstream.headers.get("content-type") ?? "text/plain" },
      });
    }

    const adapted = adaptBackendResponse(
      adminPath,
      method,
      upstream.status,
      parsed,
      { searchParams: incomingUrl.searchParams },
    );

    if (
      isPlainObject(adapted) &&
      adapted.stagingNotFound === true
    ) {
      return NextResponse.json(
        { error: typeof adapted.error === "string" ? adapted.error : "Not found" },
        { status: 404 },
      );
    }

    return NextResponse.json(adapted, { status: upstream.status });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to reach staging backend",
        stagingUnavailable: true,
      },
      { status: 502 },
    );
  }
}
