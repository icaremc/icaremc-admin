import type { Locale } from "@/lib/types/database";

export const USER_ROLES = [
  {
    value: "admin",
    label: "Admin",
    description: "Full access to the admin portal",
  },
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

export type UserRole = (typeof USER_ROLES)[number]["value"];

export function isUserRole(value: string): value is UserRole {
  return USER_ROLES.some((role) => role.value === value);
}

export function roleLabel(role: string | null | undefined): string {
  return USER_ROLES.find((item) => item.value === role)?.label ?? role ?? "—";
}

export function accountTypeForRole(role: UserRole): string {
  switch (role) {
    case "admin":
      return "Admin";
    case "partner":
      return "Partner";
    default:
      return "Mother";
  }
}

export type CreateUserInput = {
  email: string;
  password: string;
  full_name?: string;
  phone?: string;
  role: UserRole;
  locale?: Locale;
};
