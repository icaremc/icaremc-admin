import { NextResponse } from "next/server";
import { ADMIN_ACTIVITY_EVENTS } from "@/lib/activity/events";
import { logAdminActivity } from "@/lib/activityLog";
import { requireAdminSession } from "@/lib/adminAuth";
import {
  appointmentStatusPushMessage,
  doctorCancelledPushMessage,
} from "@/lib/appointments/status";
import { sendDoctorPush } from "@/lib/push/sendDoctorPush";
import {
  fetchMotherPushProfile,
  pushReadiness,
  sendMotherPush,
} from "@/lib/push/sendMotherPush";
import { createServiceSupabaseClient } from "@/lib/supabase/service";
import type { Appointment, AppointmentStatus } from "@/lib/types/doctors";

type RouteContext = { params: Promise<{ id: string }> };

const APPOINTMENT_SELECT =
  "*, doctor_profiles(first_name, last_name, specialty, hospital), profiles(full_name, phone)";

function isAppointmentStatus(value: unknown): value is AppointmentStatus {
  return (
    value === "pending" ||
    value === "confirmed" ||
    value === "completed" ||
    value === "cancelled"
  );
}

export async function GET(_request: Request, context: RouteContext) {
  const auth = await requireAdminSession();
  if ("error" in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const { id } = await context.params;

  try {
    const client = createServiceSupabaseClient();
    const { data, error } = await client
      .from("appointments")
      .select(APPOINTMENT_SELECT)
      .eq("id", id)
      .maybeSingle();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    if (!data) {
      return NextResponse.json({ error: "Appointment not found" }, { status: 404 });
    }

    const appointment = data as Appointment;

    const { data: conversation, error: conversationError } = await client
      .from("chat_conversations")
      .select("*")
      .eq("appointment_id", id)
      .maybeSingle();

    if (conversationError) {
      return NextResponse.json({ error: conversationError.message }, { status: 500 });
    }

    let messages: { id: string; conversation_id: string; sender_id: string; body: string; created_at: string }[] = [];
    if (conversation) {
      const { data: messageRows, error: messagesError } = await client
        .from("chat_messages")
        .select("id, conversation_id, sender_id, body, created_at")
        .eq("conversation_id", conversation.id)
        .order("created_at", { ascending: true });

      if (messagesError) {
        return NextResponse.json({ error: messagesError.message }, { status: 500 });
      }
      messages = messageRows ?? [];
    }

    return NextResponse.json({
      appointment,
      conversation: conversation ?? null,
      messages,
    });
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

  const status =
    body &&
    typeof body === "object" &&
    "status" in body
      ? (body as { status: unknown }).status
      : null;

  if (!isAppointmentStatus(status)) {
    return NextResponse.json(
      { error: "status must be pending, confirmed, completed, or cancelled" },
      { status: 400 },
    );
  }

  try {
    const client = createServiceSupabaseClient();

    const { data: existing, error: existingError } = await client
      .from("appointments")
      .select(APPOINTMENT_SELECT)
      .eq("id", id)
      .maybeSingle();

    if (existingError) {
      return NextResponse.json({ error: existingError.message }, { status: 500 });
    }
    if (!existing) {
      return NextResponse.json({ error: "Appointment not found" }, { status: 404 });
    }

    const previous = existing as Appointment;
    if (previous.status === status) {
      return NextResponse.json({ appointment: previous });
    }

    const { data, error } = await client
      .from("appointments")
      .update({ status, updated_at: new Date().toISOString() })
      .eq("id", id)
      .select(APPOINTMENT_SELECT)
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const appointment = data as Appointment;
    const doctor = appointment.doctor_profiles;
    const doctorName = doctor
      ? `Dr. ${doctor.first_name} ${doctor.last_name}`.trim()
      : "Your doctor";
    const patientName =
      appointment.patient_name?.trim() ||
      appointment.profiles?.full_name?.trim() ||
      "Patient";

    const pushResults: Record<string, unknown> = {};

    const patientMessage = appointmentStatusPushMessage({
      status,
      doctorName,
      appointmentDate: appointment.appointment_date,
      timeSlot: appointment.time_slot,
    });

    if (patientMessage) {
      const { profile } = await fetchMotherPushProfile(
        client,
        appointment.patient_id,
      );
      const readiness = pushReadiness(
        profile ?? {
          fcm_token: null,
          notifications_enabled: null,
          full_name: null,
          role: null,
        },
      );

      if (readiness.canSend && profile?.fcm_token) {
        const patientPush = await sendMotherPush({
          serviceClient: client,
          userId: appointment.patient_id,
          token: profile.fcm_token,
          input: patientMessage,
        });
        pushResults.patient = patientPush;
      } else {
        pushResults.patient = { skipped: readiness.reason };
      }
    }

    if (status === "cancelled") {
      const doctorPush = await sendDoctorPush({
        serviceClient: client,
        userId: appointment.doctor_id,
        input: doctorCancelledPushMessage({
          patientName,
          appointmentDate: appointment.appointment_date,
          timeSlot: appointment.time_slot,
        }),
      });
      pushResults.doctor = doctorPush;
    }

    await logAdminActivity(
      {
        actorId: auth.user.id,
        actorEmail: auth.user.email ?? null,
        actorName:
          (auth.user.user_metadata?.full_name as string | undefined) ?? null,
        actorRole: auth.adminRole,
        eventType: ADMIN_ACTIVITY_EVENTS.APPOINTMENT_STATUS,
        eventLabel: `Appointment ${previous.status} → ${status}`,
        resourceType: "appointment",
        resourceId: id,
        metadata: {
          previous_status: previous.status,
          new_status: status,
          patient_id: appointment.patient_id,
          doctor_id: appointment.doctor_id,
        },
      },
      request,
    );

    return NextResponse.json({ appointment, push: pushResults });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Server error" },
      { status: 500 },
    );
  }
}
