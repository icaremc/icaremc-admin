import { NextResponse } from "next/server";
import { requireAdminViewPermission } from "@/lib/adminAuth";
import { listReferralCommissions } from "@/lib/referrals/listReferralCommissions";
import { createServiceSupabaseClient } from "@/lib/supabase/service";

export async function GET(request: Request) {
  const auth = await requireAdminViewPermission("manage_doctors");
  if ("error" in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const { searchParams } = new URL(request.url);
  const doctorId = searchParams.get("doctorId")?.trim() || undefined;
  const from = searchParams.get("from")?.trim() || undefined;
  const to = searchParams.get("to")?.trim() || undefined;

  try {
    const client = createServiceSupabaseClient();
    const commissions = await listReferralCommissions(client, { doctorId, from, to });
    return NextResponse.json({ commissions });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Server error" },
      { status: 500 },
    );
  }
}
