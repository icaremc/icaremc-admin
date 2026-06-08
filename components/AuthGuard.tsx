"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { isAdminEmail } from "@/lib/authConfig";
import { useAppDispatch } from "@/app/store/hooks";
import { authActions, restoreSession } from "@/app/store/slices/authSlice";

export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const dispatch = useAppDispatch();
  const [checking, setChecking] = useState(true);
  const didNavigate = useRef(false);

  useEffect(() => {
    let mounted = true;

    const check = async () => {
      try {
        const result = await dispatch(restoreSession()).unwrap();
        if (!result) {
          const { data } = await supabase.auth.getSession();
          const email = data.session?.user?.email;
          if (!email) {
            if (mounted && !didNavigate.current) {
              didNavigate.current = true;
              router.replace(
                `/?error=auth&next=${encodeURIComponent(pathname || "/admin/dashboard")}`,
              );
            }
            return;
          }
          if (!isAdminEmail(email)) {
            await supabase.auth.signOut();
            dispatch(authActions.logout());
            if (mounted && !didNavigate.current) {
              didNavigate.current = true;
              router.replace(
                `/?error=unauthorized&next=${encodeURIComponent(pathname || "/admin/dashboard")}`,
              );
            }
          }
        } else if (mounted) {
          setChecking(false);
        }
      } catch {
        if (mounted && !didNavigate.current) {
          didNavigate.current = true;
          router.replace(
            `/?error=auth&next=${encodeURIComponent(pathname || "/admin/dashboard")}`,
          );
        }
      } finally {
        if (mounted) setChecking(false);
      }
    };

    check();

    const { data: sub } = supabase.auth.onAuthStateChange(() => {
      check();
    });

    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, [dispatch, router, pathname]);

  if (checking) {
    return (
      <div className="ml-64 grid min-h-screen w-full place-items-center bg-gray-50">
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-emerald-500" />
          Checking access…
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
