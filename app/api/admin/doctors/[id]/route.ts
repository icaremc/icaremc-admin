import { NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/adminAuth";
import {
  doctorApprovalPushMessage,
  sendDoctorPush,
} from "@/lib/push/sendDoctorPush";
import { createServiceSupabaseClient } from "@/lib/supabase/service";
import type { DoctorProfile } from "@/lib/types/doctors";

type RouteContext = { params: Promise<{ id: string }> };

const DOCTOR_SELECT =
  "*, doctor_availability_slots(*), doctor_categories(id, name, slug)";

export async function GET(_request: Request, context: RouteContext) {
  const auth = await requireAdminSession();
  if ("error" in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const { id } = await context.params;

  try {
    const client = createServiceSupabaseClient();
    const { data, error } = await client
      .from("doctor_profiles")
      .select(DOCTOR_SELECT)
      .eq("id", id)
      .order("day_of_week", {
        foreignTable: "doctor_availability_slots",
        ascending: true,
      })
      .order("start_time", {
        foreignTable: "doctor_availability_slots",
        ascending: true,
      })
      .maybeSingle();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (!data) {
      return NextResponse.json({ error: "Doctor not found" }, { status: 404 });
    }

    return NextResponse.json({ doctor: data as DoctorProfile });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Server error" },
      { status: 500 },
    );
  }
}

export async function PATCH(request: Request, context: RouteContext) {
  const auth = await requireAdminSession();
  if ("error" in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const { id } = await context.params;
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const isVerified =
    body &&
    typeof body === "object" &&
    "is_verified" in body &&
    typeof (body as { is_verified: unknown }).is_verified === "boolean"
      ? (body as { is_verified: boolean }).is_verified
      : null;

  if (isVerified === null) {
    return NextResponse.json(
      { error: "is_verified boolean is required" },
      { status: 400 },
    );
  }

  try {
    const client = createServiceSupabaseClient();

    const { data: existing, error: existingError } = await client
      .from("doctor_profiles")
      .select("is_verified, first_name")
      .eq("id", id)
      .maybeSingle();

    if (existingError) {
      return NextResponse.json({ error: existingError.message }, { status: 500 });
    }

    if (!existing) {
      return NextResponse.json({ error: "Doctor not found" }, { status: 404 });
    }

    const { data, error } = await client
      .from("doctor_profiles")
      .update({ is_verified: isVerified })
      .eq("id", id)
      .select(DOCTOR_SELECT)
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const doctor = data as DoctorProfile;
    const wasApproved = isVerified && !existing.is_verified;
    let push:
      | { sent: true; messageId: string }
      | { sent: false; skipped: string }
      | { sent: false; error: string }
      | undefined;

    if (wasApproved) {
      const pushResult = await sendDoctorPush({
        serviceClient: client,
        userId: id,
        input: doctorApprovalPushMessage(doctor.first_name),
      });

      if (pushResult.ok && "messageId" in pushResult && pushResult.messageId) {
        push = { sent: true, messageId: pushResult.messageId };
      } else if (pushResult.ok && "skipped" in pushResult) {
        push = { sent: false, skipped: pushResult.skipped ?? "Push skipped" };
      } else if (!pushResult.ok) {
        push = { sent: false, error: pushResult.error };
      }
    }

    return NextResponse.json({ doctor, push });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Server error" },
      { status: 500 },
    );
  }
}
