import { NextResponse } from "next/server";
import {
  BACKEND_ACCESS_COOKIE,
  BACKEND_REFRESH_COOKIE,
  getBackendApiBaseUrl,
  isBackendApiEnabled,
} from "@/lib/backend/config";

const COOKIE_MAX_AGE = 60 * 60 * 24 * 7;

function cookieOptions() {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: COOKIE_MAX_AGE,
  };
}

export async function POST(request: Request) {
  if (!isBackendApiEnabled()) {
    return NextResponse.json(
      { error: "Backend API mode is disabled on this deploy" },
      { status: 404 },
    );
  }

  let body: { email?: string; password?: string };
  try {
    body = (await request.json()) as { email?: string; password?: string };
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const email = body.email?.trim().toLowerCase() ?? "";
  const password = body.password ?? "";
  if (!email || !password) {
    return NextResponse.json({ error: "Email and password are required" }, { status: 400 });
  }

  try {
    const upstream = await fetch(`${getBackendApiBaseUrl()}/api/v1/auth/admin/login`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ username: email, password }).toString(),
      cache: "no-store",
    });

    const payload = (await upstream.json()) as {
      access_token?: string;
      refresh_token?: string;
      user_id?: string;
      admin_role?: string | null;
      role?: string | null;
      roles?: string[] | null;
      detail?: string | { msg?: string }[];
      message?: string;
    };

    if (!upstream.ok || !payload.access_token || !payload.user_id) {
      const detail =
        typeof payload.detail === "string"
          ? payload.detail
          : Array.isArray(payload.detail)
            ? payload.detail.map((d) => d.msg).filter(Boolean).join(", ")
            : payload.message;
      return NextResponse.json(
        { error: detail || "Staging login failed" },
        { status: upstream.status || 401 },
      );
    }

    const adminRole =
      payload.admin_role ??
      payload.role ??
      (payload.roles?.includes("super_admin") ? "super_admin" : "support");

    const response = NextResponse.json({
      user: {
        id: payload.user_id,
        email,
        name: email.split("@")[0] || "Admin",
        adminRole,
      },
      token: payload.access_token,
      mode: "backend",
    });

    response.cookies.set(BACKEND_ACCESS_COOKIE, payload.access_token, cookieOptions());
    if (payload.refresh_token) {
      response.cookies.set(BACKEND_REFRESH_COOKIE, payload.refresh_token, cookieOptions());
    }
    return response;
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Staging login failed" },
      { status: 502 },
    );
  }
}
