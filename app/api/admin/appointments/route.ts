import { NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/adminAuth";
import { createServiceSupabaseClient } from "@/lib/supabase/service";
import type { Appointment } from "@/lib/types/doctors";

export async function GET() {
  const auth = await requireAdminSession();
  if ("error" in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  try {
    const client = createServiceSupabaseClient();
    const { data, error } = await client
      .from("appointments")
      .select(
        "*, doctor_profiles(first_name, last_name, specialty, hospital), profiles(full_name, phone)",
      )
      .order("appointment_date", { ascending: false })
      .order("time_slot");

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      appointments: (data ?? []) as Appointment[],
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Server error" },
      { status: 500 },
    );
  }
}
