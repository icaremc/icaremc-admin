import { NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/adminAuth";
import { createServiceSupabaseClient } from "@/lib/supabase/service";
import type { DoctorProfile } from "@/lib/types/doctors";

const DOCTOR_SELECT =
  "*, doctor_availability_slots(*), doctor_categories(id, name, slug)";

export async function GET() {
  const auth = await requireAdminSession();
  if ("error" in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  try {
    const client = createServiceSupabaseClient();
    const { data, error } = await client
      .from("doctor_profiles")
      .select(DOCTOR_SELECT)
      .order("created_at", { ascending: false })
      .order("day_of_week", {
        foreignTable: "doctor_availability_slots",
        ascending: true,
      })
      .order("start_time", {
        foreignTable: "doctor_availability_slots",
        ascending: true,
      });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ doctors: (data ?? []) as DoctorProfile[] });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Server error" },
      { status: 500 },
    );
  }
}
