import { NextResponse } from "next/server";
import {
  BACKEND_ACCESS_COOKIE,
  BACKEND_REFRESH_COOKIE,
  getBackendApiBaseUrl,
  isBackendApiEnabled,
} from "@/lib/backend/config";

export async function GET(request: Request) {
  if (!isBackendApiEnabled()) {
    return NextResponse.json({ user: null, mode: "supabase" });
  }

  const cookie = request.headers.get("cookie") ?? "";
  const match = cookie.match(new RegExp(`(?:^|;\\s*)${BACKEND_ACCESS_COOKIE}=([^;]+)`));
  const token = match?.[1] ? decodeURIComponent(match[1]) : null;
  if (!token) {
    return NextResponse.json({ user: null, mode: "backend" });
  }

  try {
    const upstream = await fetch(`${getBackendApiBaseUrl()}/api/v1/auth/me`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    });

    if (!upstream.ok) {
      const response = NextResponse.json({ user: null, mode: "backend" });
      response.cookies.delete(BACKEND_ACCESS_COOKIE);
      response.cookies.delete(BACKEND_REFRESH_COOKIE);
      return response;
    }

    const me = (await upstream.json()) as {
      id?: string;
      user_id?: string;
      email?: string | null;
      full_name?: string | null;
      admin_role?: string | null;
      role?: string | null;
    };

    const id = me.id ?? me.user_id;
    if (!id) {
      return NextResponse.json({ user: null, mode: "backend" });
    }

    return NextResponse.json({
      mode: "backend",
      token,
      user: {
        id,
        email: me.email ?? "",
        name: me.full_name ?? me.email?.split("@")[0] ?? "Admin",
        adminRole: me.admin_role ?? me.role ?? "support",
      },
    });
  } catch {
    return NextResponse.json({ user: null, mode: "backend" });
  }
}

export async function DELETE() {
  const response = NextResponse.json({ ok: true });
  response.cookies.delete(BACKEND_ACCESS_COOKIE);
  response.cookies.delete(BACKEND_REFRESH_COOKIE);
  return response;
}
