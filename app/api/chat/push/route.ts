import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createServiceSupabaseClient } from "@/lib/supabase/service";
import { sendDoctorPush } from "@/lib/push/sendDoctorPush";
import { sendMotherPush, pushReadiness } from "@/lib/push/sendMotherPush";

type ChatPushBody = {
  message_id?: string;
};

function supabaseUrl() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  if (!url) throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL");
  return url;
}

function supabaseAnonKey() {
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();
  if (!key) throw new Error("Missing NEXT_PUBLIC_SUPABASE_ANON_KEY");
  return key;
}

export async function POST(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: ChatPushBody;
  try {
    body = (await request.json()) as ChatPushBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const messageId = body.message_id?.trim();
  if (!messageId) {
    return NextResponse.json({ error: "message_id is required" }, { status: 400 });
  }

  const userClient = createClient(supabaseUrl(), supabaseAnonKey(), {
    global: { headers: { Authorization: authHeader } },
  });

  const {
    data: { user },
    error: userError,
  } = await userClient.auth.getUser();

  if (userError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const serviceClient = createServiceSupabaseClient();
    const { data: message, error: messageError } = await serviceClient
      .from("chat_messages")
      .select(
        "id, body, sender_id, conversation_id, chat_conversations(patient_id, doctor_id, doctor_profiles(first_name, last_name), profiles(full_name))",
      )
      .eq("id", messageId)
      .maybeSingle();

    if (messageError) {
      return NextResponse.json({ error: messageError.message }, { status: 500 });
    }
    if (!message) {
      return NextResponse.json({ error: "Message not found" }, { status: 404 });
    }

    if (message.sender_id !== user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const conversationRaw = message.chat_conversations;
    const conversation = Array.isArray(conversationRaw)
      ? conversationRaw[0]
      : conversationRaw;

    if (!conversation || typeof conversation !== "object") {
      return NextResponse.json({ error: "Conversation not found" }, { status: 404 });
    }

    const doctorProfileRaw = conversation.doctor_profiles;
    const doctorProfile = Array.isArray(doctorProfileRaw)
      ? doctorProfileRaw[0]
      : doctorProfileRaw;

    const patientProfileRaw = conversation.profiles;
    const patientProfile = Array.isArray(patientProfileRaw)
      ? patientProfileRaw[0]
      : patientProfileRaw;

    const isPatientSender = user.id === conversation.patient_id;
    const isDoctorSender = user.id === conversation.doctor_id;
    if (!isPatientSender && !isDoctorSender) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const preview =
      message.body.length > 120 ? `${message.body.slice(0, 117)}…` : message.body;

    if (isPatientSender) {
      const patientName = patientProfile?.full_name?.trim() || "Patient";

      const result = await sendDoctorPush({
        serviceClient,
        userId: conversation.doctor_id,
        input: {
          title: patientName,
          body: preview,
          route: "/main",
          type: "chat",
          tab: "2",
          conversation_id: message.conversation_id,
        },
      });

      if (!result.ok) {
        return NextResponse.json({ error: result.error }, { status: 502 });
      }
      if ("skipped" in result) {
        return NextResponse.json({ ok: true, skipped: result.skipped });
      }

      return NextResponse.json({ ok: true, messageId: result.messageId });
    }

    const doctorName = doctorProfile
      ? `Dr. ${doctorProfile.first_name} ${doctorProfile.last_name}`.trim()
      : "Your doctor";

    const { data: patientPushProfile, error: profileError } = await serviceClient
      .from("profiles")
      .select("fcm_token, notifications_enabled, full_name, role")
      .eq("id", conversation.patient_id)
      .maybeSingle();

    if (profileError) {
      return NextResponse.json({ error: profileError.message }, { status: 500 });
    }
    if (!patientPushProfile?.fcm_token) {
      return NextResponse.json({ ok: true, skipped: "No patient FCM token" });
    }

    const readiness = pushReadiness(patientPushProfile);
    if (!readiness.canSend) {
      return NextResponse.json({ ok: true, skipped: readiness.reason });
    }

    const result = await sendMotherPush({
      serviceClient,
      userId: conversation.patient_id,
      token: patientPushProfile.fcm_token,
      input: {
        title: doctorName,
        body: preview,
        route: "/main",
        type: "chat",
        tab: "3",
        conversation_id: message.conversation_id,
      },
    });

    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: 502 });
    }

    return NextResponse.json({ ok: true, messageId: result.messageId });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Server error" },
      { status: 500 },
    );
  }
}
