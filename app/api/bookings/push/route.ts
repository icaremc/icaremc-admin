import { NextResponse } from "next/server";
import { createServiceSupabaseClient } from "@/lib/supabase/service";
import { sendDoctorPush } from "@/lib/push/sendDoctorPush";
import { authenticatePushRequest } from "@/lib/push/pushRouteAuth";

type BookingPushBody = {
  appointment_id?: string;
};

function formatAppointmentDate(value: string) {
  const date = new Date(`${value}T12:00:00`);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

export async function POST(request: Request) {
  const auth = await authenticatePushRequest(request);
  if ("error" in auth) return auth.error;

  let body: BookingPushBody;
  try {
    body = (await request.json()) as BookingPushBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const appointmentId = body.appointment_id?.trim();
  if (!appointmentId) {
    return NextResponse.json({ error: "appointment_id is required" }, { status: 400 });
  }

  try {
    const serviceClient = createServiceSupabaseClient();
    const { data: appointment, error: appointmentError } = await serviceClient
      .from("appointments")
      .select(
        "id, doctor_id, patient_id, appointment_date, time_slot, patient_name, profiles(full_name)",
      )
      .eq("id", appointmentId)
      .maybeSingle();

    if (appointmentError) {
      return NextResponse.json({ error: appointmentError.message }, { status: 500 });
    }
    if (!appointment) {
      return NextResponse.json({ error: "Appointment not found" }, { status: 404 });
    }

    if (appointment.patient_id !== auth.user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const profileRaw = appointment.profiles;
    const profile = Array.isArray(profileRaw) ? profileRaw[0] : profileRaw;
    const patientName =
      appointment.patient_name?.trim() ||
      profile?.full_name?.trim() ||
      "A patient";

    const dateLabel = formatAppointmentDate(appointment.appointment_date);
    const bodyText = `${patientName} booked ${dateLabel} at ${appointment.time_slot}`;

    const result = await sendDoctorPush({
      serviceClient,
      userId: appointment.doctor_id,
      input: {
        title: "New appointment",
        body: bodyText,
        route: "/main",
        type: "booking",
        tab: "1",
      },
    });

    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: 502 });
    }
    if ("skipped" in result) {
      return NextResponse.json({ ok: true, skipped: result.skipped });
    }

    return NextResponse.json({ ok: true, messageId: result.messageId });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Server error" },
      { status: 500 },
    );
  }
}
