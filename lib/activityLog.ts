import { createServiceSupabaseClient } from "@/lib/supabase/service";
import type { ActivityActorType } from "@/lib/types/activity";
import type { AdminRole } from "@/lib/types/database";

export type LogAdminActivityInput = {
  actorId?: string | null;
  actorEmail?: string | null;
  actorName?: string | null;
  actorRole?: AdminRole | string | null;
  eventType: string;
  eventLabel: string;
  resourceType?: string | null;
  resourceId?: string | null;
  metadata?: Record<string, unknown>;
  ipAddress?: string | null;
  userAgent?: string | null;
};

export type LogPlatformActivityInput = {
  actorId?: string | null;
  actorEmail?: string | null;
  actorName?: string | null;
  actorType: ActivityActorType;
  eventType: string;
  eventLabel: string;
  resourceType?: string | null;
  resourceId?: string | null;
  metadata?: Record<string, unknown>;
  ipAddress?: string | null;
  userAgent?: string | null;
};

function requestMeta(request?: Request) {
  if (!request) return { ipAddress: null, userAgent: null };
  return {
    ipAddress:
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      request.headers.get("x-real-ip") ||
      null,
    userAgent: request.headers.get("user-agent"),
  };
}

export async function logAdminActivity(
  input: LogAdminActivityInput,
  request?: Request,
): Promise<void> {
  try {
    const meta = requestMeta(request);
    const client = createServiceSupabaseClient();
    await client.from("admin_activity_logs").insert({
      actor_id: input.actorId ?? null,
      actor_email: input.actorEmail ?? null,
      actor_name: input.actorName ?? null,
      actor_role: input.actorRole ?? null,
      event_type: input.eventType,
      event_label: input.eventLabel,
      resource_type: input.resourceType ?? null,
      resource_id: input.resourceId ?? null,
      metadata: input.metadata ?? {},
      ip_address: input.ipAddress ?? meta.ipAddress,
      user_agent: input.userAgent ?? meta.userAgent,
    });
  } catch {
    // Activity logging must not block primary actions.
  }
}

export async function logPlatformActivity(
  input: LogPlatformActivityInput,
  request?: Request,
): Promise<void> {
  try {
    const meta = requestMeta(request);
    const client = createServiceSupabaseClient();
    await client.from("platform_activity_logs").insert({
      actor_id: input.actorId ?? null,
      actor_email: input.actorEmail ?? null,
      actor_name: input.actorName ?? null,
      actor_type: input.actorType,
      event_type: input.eventType,
      event_label: input.eventLabel,
      resource_type: input.resourceType ?? null,
      resource_id: input.resourceId ?? null,
      metadata: input.metadata ?? {},
      ip_address: input.ipAddress ?? meta.ipAddress,
      user_agent: input.userAgent ?? meta.userAgent,
    });
  } catch {
    // Activity logging must not block primary actions.
  }
}
