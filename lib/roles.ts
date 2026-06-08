import type { Locale } from "@/lib/types/database";

export const APP_USER_ROLES = [
  {
    value: "mother",
    label: "Mother",
    description: "Mobile app account for expecting mothers",
  },
  {
    value: "partner",
    label: "Partner",
    description: "Mobile app account for partners or parents",
  },
] as const;

export type AppUserRole = (typeof APP_USER_ROLES)[number]["value"];

/** @deprecated Use AppUserRole — admin accounts live in admin_users table. */
export type UserRole = AppUserRole;

export function isAppUserRole(value: string): value is AppUserRole {
  return APP_USER_ROLES.some((role) => role.value === value);
}

/** @deprecated Use isAppUserRole */
export function isUserRole(value: string): value is AppUserRole {
  return isAppUserRole(value);
}

export function roleLabel(role: string | null | undefined): string {
  return APP_USER_ROLES.find((item) => item.value === role)?.label ?? role ?? "—";
}

export function accountTypeForRole(role: AppUserRole): string {
  return role === "partner" ? "Partner" : "Mother";
}

export type CreateUserInput = {
  email: string;
  password: string;
  full_name?: string;
  phone?: string;
  role: AppUserRole;
  locale?: Locale;
};

/** Backward-compatible alias for mobile app user roles in UI. */
export const USER_ROLES = APP_USER_ROLES;
