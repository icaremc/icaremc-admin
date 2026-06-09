import type { AppUserRole, Locale } from "@/lib/types/database";

export type { AppUserRole };

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
] as const satisfies ReadonlyArray<{
  value: AppUserRole;
  label: string;
  description: string;
}>;

export function isAppUserRole(value: string): value is AppUserRole {
  return APP_USER_ROLES.some((role) => role.value === value);
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
