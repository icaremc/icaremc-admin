import { createServerSupabaseClient } from "@/lib/supabase/server";
import { fetchAdminAccess } from "@/lib/adminAccess";
import { adminHasPermission, type AdminPermission } from "@/lib/adminRoles";
import type { AdminRole } from "@/lib/types/database";

export async function requireAdminSession() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user?.email) {
    return { error: "Unauthorized", status: 401 as const };
  }

  const access = await fetchAdminAccess(supabase, user.id, user.email);

  if (!access.allowed) {
    return { error: "Forbidden", status: 403 as const };
  }

  return {
    user,
    supabase,
    adminRole: access.adminRole as AdminRole,
  };
}

export async function requireSuperAdminSession() {
  return requireAdminPermission("manage_admins");
}

export async function requireAdminPermission(permission: AdminPermission) {
  const auth = await requireAdminSession();
  if ("error" in auth) return auth;

  if (!adminHasPermission(auth.adminRole, permission)) {
    return { error: "Forbidden", status: 403 as const };
  }

  return auth;
}
