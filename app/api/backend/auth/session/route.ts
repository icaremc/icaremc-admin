import { NextResponse } from "next/server";
import {
  BACKEND_ACCESS_COOKIE,
  BACKEND_REFRESH_COOKIE,
  getBackendApiBaseUrl,
  isBackendApiEnabled,
} from "@/lib/backend/config";

function readAccessToken(cookieHeader: string): string | null {
  const match = cookieHeader.match(
    new RegExp(`(?:^|;\\s*)${BACKEND_ACCESS_COOKIE}=([^;]+)`),
  );
  return match?.[1] ? decodeURIComponent(match[1]) : null;
}

export async function GET(request: Request) {
  if (!isBackendApiEnabled()) {
    return NextResponse.json(
      { error: "Backend API mode is disabled on this deploy" },
      { status: 404 },
    );
  }

  const token = readAccessToken(request.headers.get("cookie") ?? "");
  if (!token) {
    return NextResponse.json({ user: null, mode: "backend", token: null });
  }

  try {
    const upstream = await fetch(`${getBackendApiBaseUrl()}/api/v1/auth/session`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    });

    if (!upstream.ok) {
      const response = NextResponse.json({ user: null, mode: "backend", token: null });
      response.cookies.delete(BACKEND_ACCESS_COOKIE);
      response.cookies.delete(BACKEND_REFRESH_COOKIE);
      return response;
    }

    const session = (await upstream.json()) as {
      mode?: string;
      token?: string | null;
      user?: {
        id?: string;
        email?: string | null;
        name?: string | null;
        adminRole?: string | null;
        admin_role?: string | null;
      } | null;
    };

    const user = session.user;
    if (!user?.id) {
      return NextResponse.json({ user: null, mode: "backend", token: null });
    }

    return NextResponse.json({
      mode: session.mode ?? "backend",
      token: session.token ?? token,
      user: {
        id: user.id,
        email: user.email ?? "",
        name: user.name ?? "Admin",
        adminRole: user.adminRole ?? user.admin_role ?? "support",
      },
    });
  } catch {
    return NextResponse.json({ user: null, mode: "backend", token: null });
  }
}

export async function DELETE() {
  const response = NextResponse.json({ ok: true });
  response.cookies.delete(BACKEND_ACCESS_COOKIE);
  response.cookies.delete(BACKEND_REFRESH_COOKIE);
  return response;
}
