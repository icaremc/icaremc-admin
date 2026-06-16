import { NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/adminAuth";
import {
  doctorPushReadiness,
  fetchDoctorPushProfile,
  sendDoctorPush,
  type PushDeliveryInput,
} from "@/lib/push/sendDoctorPush";
import { createServiceSupabaseClient } from "@/lib/supabase/service";

function serviceClientOrError() {
  try {
    return { client: createServiceSupabaseClient(), error: null as string | null };
  } catch (error) {
    return {
      client: null,
      error:
        error instanceof Error
          ? error.message
          : "Server is missing SUPABASE_SERVICE_ROLE_KEY",
    };
  }
}

function parseBody(body: unknown): PushDeliveryInput | string {
  if (!body || typeof body !== "object") return "Invalid request body";

  const data = body as Record<string, unknown>;
  const title = typeof data.title === "string" ? data.title.trim() : "";
  const messageBody = typeof data.body === "string" ? data.body.trim() : "";
  const route = typeof data.route === "string" ? data.route.trim() : undefined;

  if (!title) return "Title is required";
  if (!messageBody) return "Message body is required";

  return { title, body: messageBody, route };
}

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const auth = await requireAdminSession();
  if ("error" in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const { id: doctorId } = await context.params;
  if (!doctorId) {
    return NextResponse.json({ error: "Doctor id is required" }, { status: 400 });
  }

  const { client, error: configError } = serviceClientOrError();
  if (!client) {
    return NextResponse.json({ error: configError }, { status: 500 });
  }

  const { profile, error } = await fetchDoctorPushProfile(client, doctorId);
  if (error) {
    return NextResponse.json(
      { error },
      { status: error === "Doctor not found" ? 404 : 400 },
    );
  }

  const readiness = doctorPushReadiness(profile!);

  return NextResponse.json({
    fcmRegistered: Boolean(profile!.fcm_token),
    notificationsEnabled: profile!.notifications_enabled !== false,
    canSend: readiness.canSend,
    reason: readiness.reason,
  });
}

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const auth = await requireAdminSession();
  if ("error" in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const { id: doctorId } = await context.params;
  if (!doctorId) {
    return NextResponse.json({ error: "Doctor id is required" }, { status: 400 });
  }

  const parsed = parseBody(await request.json());
  if (typeof parsed === "string") {
    return NextResponse.json({ error: parsed }, { status: 400 });
  }

  const { client, error: configError } = serviceClientOrError();
  if (!client) {
    return NextResponse.json({ error: configError }, { status: 500 });
  }

  const result = await sendDoctorPush({
    serviceClient: client,
    userId: doctorId,
    input: parsed,
  });

  if (!result.ok) {
    return NextResponse.json(
      { error: result.error, clearedToken: result.clearedToken },
      { status: 502 },
    );
  }

  if ("skipped" in result) {
    return NextResponse.json({ error: result.skipped }, { status: 400 });
  }

  return NextResponse.json({
    ok: true,
    messageId: result.messageId,
    recipient: doctorId,
  });
}

