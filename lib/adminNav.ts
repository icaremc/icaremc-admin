import {
  adminCanManage,
  adminCanView,
  type AdminPermission,
} from "@/lib/adminRoles";
import type { AdminRole } from "@/lib/types/database";

export function routePermission(pathname: string): AdminPermission {
  if (pathname.startsWith("/admin/app-version")) return "manage_content";
  if (pathname.startsWith("/admin/finance")) return "manage_finance";
  if (pathname.startsWith("/admin/admins")) return "manage_admins";
  if (pathname.startsWith("/admin/activity")) return "view_activity_log";
  if (pathname.startsWith("/admin/push")) return "send_push";
  if (
    pathname.startsWith("/admin/content") ||
    pathname.startsWith("/admin/pregnancy-weeks") ||
    pathname.startsWith("/admin/child-growth") ||
    pathname.startsWith("/admin/followup-visits") ||
    pathname.startsWith("/admin/pregnancy/") ||
    pathname.startsWith("/admin/legal")
  ) {
    return "manage_content";
  }
  if (
    pathname.startsWith("/admin/doctors") ||
    pathname.startsWith("/admin/doctor-categories") ||
    pathname.startsWith("/admin/hospitals")
  ) {
    return "manage_doctors";
  }
  if (pathname.startsWith("/admin/appointments")) return "manage_appointments";
  if (pathname.startsWith("/admin/health-logs")) return "view_health_data";
  if (
    pathname.startsWith("/admin/users") ||
    pathname.startsWith("/admin/children")
  ) {
    return "manage_users";
  }
  return "view_dashboard";
}

export function routeRequiresManage(pathname: string): boolean {
  if (pathname.includes("/edit") || pathname.includes("/new")) return true;
  if (pathname.startsWith("/admin/app-version")) return true;
  return false;
}

export function canAccessRoute(
  role: AdminRole | null | undefined,
  pathname: string,
): boolean {
  const permission = routePermission(pathname);
  if (!adminCanView(role, permission)) return false;
  if (routeRequiresManage(pathname) && !adminCanManage(role, permission)) {
    return false;
  }
  return true;
}

export function canManageRoute(
  role: AdminRole | null | undefined,
  pathname: string,
): boolean {
  return adminCanManage(role, routePermission(pathname));
}
