import { NextResponse } from "next/server";
import { requireSuperAdminSession } from "@/lib/adminAuth";
import {
  pushReadiness,
  sendMotherPush,
  type PushDeliveryInput,
} from "@/lib/push/sendMotherPush";
import { createServiceSupabaseClient } from "@/lib/supabase/service";

type BroadcastBody = {
  title?: unknown;
  body?: unknown;
  route?: unknown;
  role?: unknown;
};

function parseBody(body: unknown): { input: PushDeliveryInput; role: string } | string {
  if (!body || typeof body !== "object") return "Invalid request body";
  const data = body as BroadcastBody;

  const title = typeof data.title === "string" ? data.title.trim() : "";
  const messageBody = typeof data.body === "string" ? data.body.trim() : "";
  const route = typeof data.route === "string" ? data.route.trim() : undefined;

  if (!title) return "Title is required";
  if (!messageBody) return "Message body is required";

  const role = typeof data.role === "string" && data.role.trim() ? data.role.trim() : "mother";

  return { input: { title, body: messageBody, route }, role };
}

export async function POST(request: Request) {
  const auth = await requireSuperAdminSession();
  if ("error" in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = parseBody(raw);
  if (typeof parsed === "string") {
    return NextResponse.json({ error: parsed }, { status: 400 });
  }

  const serviceClient = createServiceSupabaseClient();
  const { data: users, error } = await serviceClient
    .from("profiles")
    .select("id, fcm_token, notifications_enabled, full_name, role")
    .eq("role", parsed.role);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const results = {
    attempted: (users ?? []).length,
    sent: 0,
    skipped: 0,
    failed: 0,
  };

  for (const user of users ?? []) {
    const profile = {
      fcm_token: (user as any).fcm_token as string | null,
      notifications_enabled: (user as any).notifications_enabled as boolean | null,
      full_name: (user as any).full_name as string | null,
      role: (user as any).role as string | null,
    };

    const readiness = pushReadiness(profile);
    if (!readiness.canSend) {
      results.skipped += 1;
      continue;
    }

    const token = profile.fcm_token!;
    const res = await sendMotherPush({
      serviceClient,
      userId: (user as any).id as string,
      token,
      input: parsed.input,
    });

    if (!res.ok) {
      results.failed += 1;
      continue;
    }

    results.sent += 1;
  }

  return NextResponse.json({ ok: true, ...results });
}

