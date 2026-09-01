"use client";

import { useAppSelector } from "@/app/store/hooks";
import {
  adminCanManage,
  adminCanView,
  adminHasPermission,
  isSuperAdmin,
  type AdminPermission,
} from "@/lib/adminRoles";

export function useAdminCanView(permission: AdminPermission) {
  const role = useAppSelector((state) => state.auth.user?.adminRole);
  return adminCanView(role, permission);
}

export function useAdminCanManage(permission: AdminPermission) {
  const role = useAppSelector((state) => state.auth.user?.adminRole);
  return adminCanManage(role, permission);
}

export function useAdminHasPermission(permission: AdminPermission) {
  const role = useAppSelector((state) => state.auth.user?.adminRole);
  return adminHasPermission(role, permission);
}

export function useIsSuperAdmin() {
  const role = useAppSelector((state) => state.auth.user?.adminRole);
  return isSuperAdmin(role);
}
