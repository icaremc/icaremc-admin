import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * When NEXT_PUBLIC_USE_BACKEND_API is true, rewrite /api/admin/* to the
 * staging bridge. Production leaves the flag unset → this is a no-op.
 */
export function middleware(request: NextRequest) {
  if (process.env.NEXT_PUBLIC_USE_BACKEND_API !== "true") {
    return NextResponse.next();
  }

  const { pathname } = request.nextUrl;
  if (!pathname.startsWith("/api/admin/")) {
    return NextResponse.next();
  }

  // Always keep local for webhook / chapa / activity client log
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
