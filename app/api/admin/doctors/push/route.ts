import { NextResponse } from "next/server";
import { requireSuperAdminSession } from "@/lib/adminAuth";
import { sendDoctorPush, type PushDeliveryInput } from "@/lib/push/sendDoctorPush";
import { createServiceSupabaseClient } from "@/lib/supabase/service";

type BroadcastBody = {
  title?: unknown;
  body?: unknown;
  route?: unknown;
  verifiedOnly?: unknown;
};

function parseBody(body: unknown): { input: PushDeliveryInput; verifiedOnly: boolean } | string {
  if (!body || typeof body !== "object") return "Invalid request body";
  const data = body as BroadcastBody;

  const title = typeof data.title === "string" ? data.title.trim() : "";
  const messageBody = typeof data.body === "string" ? data.body.trim() : "";
  const route = typeof data.route === "string" ? data.route.trim() : undefined;

  if (!title) return "Title is required";
  if (!messageBody) return "Message body is required";

  const verifiedOnly = typeof data.verifiedOnly === "boolean" ? data.verifiedOnly : true;

  return { input: { title, body: messageBody, route }, verifiedOnly };
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

  const query = serviceClient
    .from("doctor_profiles")
    .select("id")
    .not("id", "is", null);

  const { data: doctors, error } = parsed.verifiedOnly
    ? await query.eq("is_verified", true)
    : await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const ids = (doctors ?? []).map((row) => row.id as string).filter(Boolean);

  const results = {
    attempted: ids.length,
    sent: 0,
    skipped: 0,
    failed: 0,
  };

  for (const id of ids) {
    const res = await sendDoctorPush({ serviceClient, userId: id, input: parsed.input });
    if (!res.ok) {
      results.failed += 1;
      continue;
    }
    if ("skipped" in res) {
      results.skipped += 1;
      continue;
    }
    results.sent += 1;
  }

  return NextResponse.json({ ok: true, ...results });
}

