import type { AppUserRole, Locale } from "@/lib/types/database";

export type { AppUserRole };

export const APP_USER_ROLES = [
  {
    value: "mother",
    label: "Parent",
    description: "Account for expecting parents",
  },
  {
    value: "partner",
    label: "Partner",
    description: "Account for partners or caregivers",
  },
] as const satisfies ReadonlyArray<{
  value: AppUserRole;
  label: string;
  description: string;
}>;

export function isAppUserRole(value: string): value is AppUserRole {
  return APP_USER_ROLES.some((role) => role.value === value);
}

export function accountTypeForRole(role: AppUserRole): string {
  return role === "partner" ? "Partner" : "Parent";
}

export type CreateUserInput = {
  email: string;
  password: string;
  full_name?: string;
  phone?: string;
  role: AppUserRole;
  locale?: Locale;
};
