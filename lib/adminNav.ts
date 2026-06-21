import { adminHasPermission, type AdminPermission } from "@/lib/adminRoles";
import type { AdminRole } from "@/lib/types/database";

export function routePermission(pathname: string): AdminPermission {
  if (pathname.startsWith("/admin/finance")) return "manage_finance";
  if (pathname.startsWith("/admin/admins")) return "manage_admins";
  if (pathname.startsWith("/admin/activity")) return "view_activity_log";
  if (pathname.startsWith("/admin/push")) return "send_push";
  if (
    pathname.startsWith("/admin/content") ||
    pathname.startsWith("/admin/pregnancy-weeks") ||
    pathname.startsWith("/admin/pregnancy/")
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

export function canAccessRoute(
  role: AdminRole | null | undefined,
  pathname: string,
): boolean {
  return adminHasPermission(role, routePermission(pathname));
}
