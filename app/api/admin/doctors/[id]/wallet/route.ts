import { NextResponse } from "next/server";
import { requireAdminViewPermission } from "@/lib/adminAuth";
import { buildDoctorWalletHistory } from "@/lib/finance/doctorWalletHistory";
import { createServiceSupabaseClient } from "@/lib/supabase/service";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: Request, context: RouteContext) {
  const auth = await requireAdminViewPermission("manage_doctors");
  if ("error" in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const { id } = await context.params;

  try {
    const client = createServiceSupabaseClient();
    const { data: doctor, error: doctorError } = await client
      .from("doctor_profiles")
      .select("id")
      .eq("id", id)
      .maybeSingle();

    if (doctorError) {
      return NextResponse.json({ error: doctorError.message }, { status: 500 });
    }
    if (!doctor) {
      return NextResponse.json({ error: "Doctor not found" }, { status: 404 });
    }

    const history = await buildDoctorWalletHistory(id);
    return NextResponse.json({ history });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Server error" },
      { status: 500 },
    );
  }
}
