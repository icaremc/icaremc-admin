import { NextResponse } from "next/server";
import { requireAdminViewPermission } from "@/lib/adminAuth";
import { fetchDoctorReferralStats } from "@/lib/referrals/doctorStats";
import { createServiceSupabaseClient } from "@/lib/supabase/service";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(_request: Request, context: RouteContext) {
  const auth = await requireAdminViewPermission("manage_doctors");
  if ("error" in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const { id } = await context.params;
  if (!id) {
    return NextResponse.json({ error: "Doctor id is required" }, { status: 400 });
  }

  try {
    const client = createServiceSupabaseClient();
    const stats = await fetchDoctorReferralStats(client, id);
    return NextResponse.json({ stats });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Server error" },
      { status: 500 },
    );
  }
}
