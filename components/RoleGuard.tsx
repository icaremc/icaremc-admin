"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import { useAppSelector } from "@/app/store/hooks";
import { canAccessRoute, routePermission } from "@/lib/adminNav";
import { adminRoleLabel } from "@/lib/adminRoles";

export default function RoleGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const role = useAppSelector((state) => state.auth.user?.adminRole);

  const allowed = pathname ? canAccessRoute(role, pathname) : true;

  useEffect(() => {
    if (!pathname || allowed) return;
    router.replace("/admin/dashboard");
  }, [allowed, pathname, router]);

  if (!allowed) {
    const permission = pathname ? routePermission(pathname) : null;
    return (
      <div className="grid min-h-[50vh] place-items-center p-8">
        <div className="max-w-md rounded-[var(--radius)] border border-amber-200 bg-amber-50 p-6 text-center">
          <p className="font-heading text-lg font-semibold text-gray-900">
            Access restricted
          </p>
          <p className="mt-2 text-sm text-amber-900">
            Your role ({adminRoleLabel(role)}) does not include permission for
            this section{permission ? ` (${permission.replace(/_/g, " ")})` : ""}.
          </p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
