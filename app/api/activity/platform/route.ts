import { NextResponse } from "next/server";
import { PLATFORM_ACTIVITY_EVENTS } from "@/lib/activity/events";
import { logPlatformActivity } from "@/lib/activityLog";
import { authenticatePushRequest } from "@/lib/push/pushRouteAuth";
import type { ActivityActorType } from "@/lib/types/activity";

const ALLOWED_EVENTS = new Set<string>(Object.values(PLATFORM_ACTIVITY_EVENTS));

function actorTypeFromProfile(role: string | null | undefined): ActivityActorType {
  if (role === "doctor") return "doctor";
  return "mother";
}

export async function POST(request: Request) {
  const auth = await authenticatePushRequest(request);
  if ("error" in auth) return auth.error;

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

  const { data: profile } = await auth.serviceClient
    .from("profiles")
    .select("full_name, role, email")
    .eq("id", auth.user.id)
    .maybeSingle();

  const actorType =
    typeof data.actor_type === "string" &&
    (data.actor_type === "mother" || data.actor_type === "doctor")
      ? data.actor_type
      : actorTypeFromProfile(profile?.role);

  await logPlatformActivity(
    {
      actorId: auth.user.id,
      actorEmail: auth.user.email ?? profile?.email ?? null,
      actorName: profile?.full_name ?? null,
      actorType,
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
