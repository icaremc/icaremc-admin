import type { SupabaseClient } from "@supabase/supabase-js";
import { isAdminRole } from "@/lib/adminRoles";
import { ADMIN_EMAILS } from "@/lib/authConfig";
import type { AdminRole } from "@/lib/types/database";

export type AdminAccessResult = {
  allowed: boolean;
  adminRole: AdminRole | null;
  fullName: string | null;
};

/** Optional bootstrap allowlist when NEXT_PUBLIC_ADMIN_EMAILS is set. */
export function isAllowlistedAdminEmail(
  email: string | null | undefined,
): boolean {
  if (!email || ADMIN_EMAILS.length === 0) return false;
  return ADMIN_EMAILS.includes(email.trim().toLowerCase());
}

export function hasAdminAccessFromRecord(
  adminUser: {
    admin_role?: string | null;
    is_active?: boolean | null;
  } | null,
  email: string | null | undefined,
): AdminAccessResult {
  if (
    adminUser?.is_active &&
    adminUser.admin_role &&
    isAdminRole(adminUser.admin_role)
  ) {
    return {
      allowed: true,
      adminRole: adminUser.admin_role,
      fullName: null,
    };
  }

  if (isAllowlistedAdminEmail(email)) {
    return {
      allowed: true,
      adminRole: "super_admin",
      fullName: null,
    };
  }

  return {
    allowed: false,
    adminRole: null,
    fullName: null,
  };
}

export async function fetchAdminAccess(
  supabase: SupabaseClient,
  userId: string,
  email: string | null | undefined,
): Promise<AdminAccessResult> {
  const { data: adminUser } = await supabase
    .from("admin_users")
    .select("admin_role, full_name, is_active")
    .eq("id", userId)
    .maybeSingle();

  const result = hasAdminAccessFromRecord(adminUser, email);

  if (result.allowed && adminUser?.full_name) {
    return { ...result, fullName: adminUser.full_name };
  }

  return result;
}

/** @deprecated Use fetchAdminAccess().allowed */
export async function fetchAdminAccessAllowed(
  supabase: SupabaseClient,
  userId: string,
  email: string | null | undefined,
): Promise<boolean> {
  const result = await fetchAdminAccess(supabase, userId, email);
  return result.allowed;
}
