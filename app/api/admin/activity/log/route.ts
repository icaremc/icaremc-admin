import { NextResponse } from "next/server";
import { ADMIN_ACTIVITY_EVENTS } from "@/lib/activity/events";
import { logAdminActivity } from "@/lib/activityLog";
import { requireAdminSession } from "@/lib/adminAuth";

const ALLOWED_EVENTS = new Set<string>(Object.values(ADMIN_ACTIVITY_EVENTS));

export async function POST(request: Request) {
  const auth = await requireAdminSession();
  if ("error" in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const data = body as Record<string, unknown>;
  const eventType =
    typeof data.event_type === "string" ? data.event_type.trim() : "";
  const eventLabel =
    typeof data.event_label === "string" ? data.event_label.trim() : "";

  if (!eventType || !ALLOWED_EVENTS.has(eventType)) {
    return NextResponse.json({ error: "Invalid event_type" }, { status: 400 });
  }
  if (!eventLabel) {
    return NextResponse.json({ error: "event_label is required" }, { status: 400 });
  }

  await logAdminActivity(
    {
      actorId: auth.user.id,
      actorEmail: auth.user.email ?? null,
      actorName:
        (auth.user.user_metadata?.full_name as string | undefined) ?? null,
      actorRole: auth.adminRole,
      eventType,
      eventLabel,
      resourceType:
        typeof data.resource_type === "string" ? data.resource_type : null,
      resourceId: typeof data.resource_id === "string" ? data.resource_id : null,
      metadata:
        data.metadata && typeof data.metadata === "object"
          ? (data.metadata as Record<string, unknown>)
          : {},
    },
    request,
  );

  return NextResponse.json({ ok: true });
}
