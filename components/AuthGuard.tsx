"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAppDispatch } from "@/app/store/hooks";
import { restoreSession } from "@/app/store/slices/authSlice";

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
        if (result) {
          if (mounted) setChecking(false);
          return;
        }

        if (mounted && !didNavigate.current) {
          didNavigate.current = true;
          router.replace(
            `/?error=auth&next=${encodeURIComponent(pathname || "/admin/dashboard")}`,
          );
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

    void check();
    return () => {
      mounted = false;
    };
  }, [dispatch, router, pathname]);

  if (checking) {
    return (
      <div className="grid min-h-screen w-full place-items-center bg-gray-50 px-4">
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-emerald-500" />
          Checking access…
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
