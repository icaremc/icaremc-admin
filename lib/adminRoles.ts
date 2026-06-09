import type { AdminRole } from "@/lib/types/database";

export const ADMIN_ROLES = [
  {
    value: "super_admin",
    label: "Super admin",
    description: "Full portal access, including admin account management",
  },
  {
    value: "content_admin",
    label: "Content admin",
    description: "Manage CMS content, pregnancy weeks, and daily tips",
  },
  {
    value: "support",
    label: "Support",
    description: "View users and health records; no content editing",
  },
  {
    value: "viewer",
    label: "Viewer",
    description: "Read-only dashboard access",
  },
] as const satisfies ReadonlyArray<{
  value: AdminRole;
  label: string;
  description: string;
}>;

export function isAdminRole(value: string): value is AdminRole {
  return ADMIN_ROLES.some((role) => role.value === value);
}

export function adminRoleLabel(role: string | null | undefined): string {
  return ADMIN_ROLES.find((item) => item.value === role)?.label ?? role ?? "-";
}

export type AdminPermission =
  | "manage_admins"
  | "manage_content"
  | "manage_users"
  | "view_health_data"
  | "view_dashboard";

const ROLE_PERMISSIONS: Record<AdminRole, AdminPermission[]> = {
  super_admin: [
    "manage_admins",
    "manage_content",
    "manage_users",
    "view_health_data",
    "view_dashboard",
  ],
  content_admin: ["manage_content", "view_dashboard"],
  support: ["manage_users", "view_health_data", "view_dashboard"],
  viewer: ["view_dashboard"],
};

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
