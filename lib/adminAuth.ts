import { headers } from "next/headers";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { fetchAdminAccess } from "@/lib/adminAccess";
import { adminCanManage, adminCanView, adminHasPermission, type AdminPermission } from "@/lib/adminRoles";
import type { AdminRole } from "@/lib/types/database";

export async function requireAdminSession() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  let resolved = !error && user?.email ? user : null;

  if (!resolved) {
    const authHeader = (await headers()).get("authorization");
    const token = authHeader?.startsWith("Bearer ")
      ? authHeader.slice("Bearer ".length).trim()
      : null;
    if (token) {
      const { data, error: tokenError } = await supabase.auth.getUser(token);
      if (!tokenError && data.user?.email) resolved = data.user;
    }
  }

  if (!resolved?.email) {
    return { error: "Unauthorized", status: 401 as const };
  }

  const access = await fetchAdminAccess(supabase, resolved.id, resolved.email);

  if (!access.allowed) {
    return { error: "Forbidden", status: 403 as const };
  }

  return {
    user: resolved,
    supabase,
    adminRole: access.adminRole as AdminRole,
  };
}

export async function requireSuperAdminSession() {
  const auth = await requireAdminSession();
  if ("error" in auth) return auth;

  if (auth.adminRole !== "super_admin") {
    return { error: "Forbidden", status: 403 as const };
  }

  return auth;
}

export async function requireAdminPermission(permission: AdminPermission) {
  const auth = await requireAdminSession();
  if ("error" in auth) return auth;

  if (!adminHasPermission(auth.adminRole, permission)) {
    return { error: "Forbidden", status: 403 as const };
  }

  return auth;
}

export async function requireAdminViewPermission(permission: AdminPermission) {
  const auth = await requireAdminSession();
  if ("error" in auth) return auth;

  if (!adminCanView(auth.adminRole, permission)) {
    return { error: "Forbidden", status: 403 as const };
  }

  return auth;
}

export async function requireAdminManagePermission(permission: AdminPermission) {
  const auth = await requireAdminSession();
  if ("error" in auth) return auth;

  if (!adminCanManage(auth.adminRole, permission)) {
    return { error: "Forbidden", status: 403 as const };
  }

  return auth;
}
