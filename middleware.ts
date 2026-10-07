import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * Rewrite /api/admin/* to the backend API bridge.
 * Chapa webhooks and local activity/log stay on Next.
 */
export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (!pathname.startsWith("/api/admin/")) {
    return NextResponse.next();
  }

  if (
    pathname.startsWith("/api/admin/payout-requests/chapa-") ||
    pathname === "/api/admin/activity/log" ||
    pathname.startsWith("/api/admin/activity/log/")
  ) {
    return NextResponse.next();
  }

  const suffix = pathname.slice("/api/admin/".length);
  const url = request.nextUrl.clone();
  url.pathname = `/api/backend/bridge/${suffix}`;
  return NextResponse.rewrite(url);
}

export const config = {
  matcher: ["/api/admin/:path*"],
};
