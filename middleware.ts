import { createServerClient } from "@supabase/ssr";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * When NEXT_PUBLIC_USE_BACKEND_API is true, rewrite /api/admin/* to the
 * staging bridge. Production leaves the flag unset → refresh Supabase
 * cookies so Route Handlers can call auth.getUser().
 */
export async function middleware(request: NextRequest) {
  if (process.env.NEXT_PUBLIC_USE_BACKEND_API === "true") {
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

  let response = NextResponse.next({ request });

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) return response;

  const supabase = createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => {
          request.cookies.set(name, value);
        });
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) => {
          response.cookies.set(name, value, options);
        });
      },
    },
  });

  await supabase.auth.getUser();
  return response;
}

export const config = {
  matcher: ["/api/admin/:path*"],
};
