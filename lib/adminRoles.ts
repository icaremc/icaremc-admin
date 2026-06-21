import type { AdminRole } from "@/lib/types/database";

export type AdminPermission =
  | "manage_admins"
  | "manage_content"
  | "manage_users"
  | "manage_doctors"
  | "manage_appointments"
  | "manage_finance"
  | "send_push"
  | "view_health_data"
  | "view_dashboard"
  | "view_activity_log";

export const ADMIN_PERMISSIONS = [
  { value: "view_dashboard", label: "View dashboard" },
  { value: "view_activity_log", label: "View activity log" },
  { value: "manage_users", label: "Manage parents & children" },
  { value: "manage_doctors", label: "Manage doctors & appointments" },
  { value: "manage_appointments", label: "Manage appointments" },
  { value: "manage_content", label: "Manage CMS content" },
  { value: "manage_finance", label: "Manage finance & payouts" },
  { value: "send_push", label: "Send push notifications" },
  { value: "view_health_data", label: "View health logs" },
  { value: "manage_admins", label: "Manage portal admins" },
] as const satisfies ReadonlyArray<{
  value: AdminPermission;
  label: string;
}>;

export const ADMIN_ROLES = [
  {
    value: "super_admin",
    label: "Super admin",
    description: "Full portal access, including admin accounts and finance",
    permissions: [
      "view_dashboard",
      "view_activity_log",
      "manage_users",
      "manage_doctors",
      "manage_appointments",
      "manage_content",
      "manage_finance",
      "send_push",
      "view_health_data",
      "manage_admins",
    ] as AdminPermission[],
  },
  {
    value: "content_admin",
    label: "Content admin",
    description: "CMS content, pregnancy weeks, and daily tips",
    permissions: [
      "view_dashboard",
      "view_activity_log",
      "manage_content",
    ] as AdminPermission[],
  },
  {
    value: "support",
    label: "Support",
    description: "Parents, doctors, appointments, health data, and push",
    permissions: [
      "view_dashboard",
      "view_activity_log",
      "manage_users",
      "manage_doctors",
      "manage_appointments",
      "view_health_data",
      "send_push",
    ] as AdminPermission[],
  },
  {
    value: "viewer",
    label: "Viewer",
    description: "Read-only dashboard and activity log",
    permissions: ["view_dashboard", "view_activity_log"] as AdminPermission[],
  },
] as const satisfies ReadonlyArray<{
  value: AdminRole;
  label: string;
  description: string;
  permissions: AdminPermission[];
}>;

export function isAdminRole(value: string): value is AdminRole {
  return ADMIN_ROLES.some((role) => role.value === value);
}

export function adminRoleLabel(role: string | null | undefined): string {
  return ADMIN_ROLES.find((item) => item.value === role)?.label ?? role ?? "-";
}

const ROLE_PERMISSIONS: Record<AdminRole, AdminPermission[]> = {
  super_admin: ADMIN_ROLES.find((r) => r.value === "super_admin")!.permissions,
  content_admin: ADMIN_ROLES.find((r) => r.value === "content_admin")!.permissions,
  support: ADMIN_ROLES.find((r) => r.value === "support")!.permissions,
  viewer: ADMIN_ROLES.find((r) => r.value === "viewer")!.permissions,
};

export function adminPermissions(
  role: AdminRole | null | undefined,
): AdminPermission[] {
  if (!role) return [];
  return ROLE_PERMISSIONS[role];
}

export function adminHasPermission(
  role: AdminRole | null | undefined,
  permission: AdminPermission,
): boolean {
  if (!role) return false;
  return ROLE_PERMISSIONS[role].includes(permission);
}

export type CreateAdminInput = {
  email: string;
  password: string;
  full_name?: string;
  admin_role: AdminRole;
};

export type UpdateAdminInput = {
  id: string;
  admin_role?: AdminRole;
  full_name?: string | null;
  is_active?: boolean;
};
