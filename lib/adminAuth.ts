import { isAdminEmail } from "@/lib/authConfig";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function requireAdminSession() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user?.email) {
    return { error: "Unauthorized", status: 401 as const };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, is_admin")
    .eq("id", user.id)
    .maybeSingle();

  const isAdmin =
    profile?.role === "admin" ||
    profile?.is_admin === true ||
    isAdminEmail(user.email);

  if (!isAdmin) {
    return { error: "Forbidden", status: 403 as const };
  }

  return { user, supabase };
}
