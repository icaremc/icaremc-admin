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

  const backendPath = mapAdminApiToBackend(adminPath);
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

  const incomingUrl = new URL(request.url);
  const target = new URL(`${getBackendApiBaseUrl()}${backendPath}`);
  incomingUrl.searchParams.forEach((value, key) => {
    target.searchParams.set(key, value);
  });

  const headers = new Headers();
  headers.set("Authorization", `Bearer ${token}`);
  const contentType = request.headers.get("content-type");
  if (contentType) headers.set("Content-Type", contentType);

  const method = request.method.toUpperCase();
  const init: RequestInit = { method, headers, cache: "no-store" };
  if (method !== "GET" && method !== "HEAD") {
    init.body = await request.arrayBuffer();
  }

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

    const adapted = adaptBackendResponse(adminPath, method, upstream.status, parsed);
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
