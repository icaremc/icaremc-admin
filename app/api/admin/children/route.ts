import { NextResponse } from "next/server";
import { requireAdminViewPermission } from "@/lib/adminAuth";
import { createServiceSupabaseClient } from "@/lib/supabase/service";
import type { Child } from "@/lib/types/database";

const CHILD_SELECT =
  "*, profiles(id, full_name, phone, account_type, locale, onboarding_complete, notifications_enabled, created_at)";

export async function GET() {
  const auth = await requireAdminViewPermission("view_users");
  if ("error" in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  try {
    const client = createServiceSupabaseClient();
    const { data, error } = await client
      .from("children")
      .select(CHILD_SELECT)
      .order("updated_at", { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ children: (data ?? []) as Child[] });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Server error" },
      { status: 500 },
    );
  }
}
