import { NextResponse } from "next/server";
import { requireAdminPermission } from "@/lib/adminAuth";
import { createServiceSupabaseClient } from "@/lib/supabase/service";
import type {
  AdminActivityLog,
  CombinedActivityLog,
  PlatformActivityLog,
} from "@/lib/types/activity";

function parseLimit(value: string | null): number {
  const parsed = Number(value ?? "50");
  if (!Number.isFinite(parsed) || parsed < 1) return 50;
  return Math.min(parsed, 200);
}

function toCombinedAdmin(row: AdminActivityLog): CombinedActivityLog {
  return {
    id: row.id,
    source: "admin",
    actor_id: row.actor_id,
    actor_email: row.actor_email,
    actor_name: row.actor_name,
    actor_role: row.actor_role,
    actor_type: "admin",
    event_type: row.event_type,
    event_label: row.event_label,
    resource_type: row.resource_type,
    resource_id: row.resource_id,
    metadata: row.metadata ?? {},
    created_at: row.created_at,
  };
}

function toCombinedPlatform(row: PlatformActivityLog): CombinedActivityLog {
  return {
    id: row.id,
    source: "platform",
    actor_id: row.actor_id,
    actor_email: row.actor_email,
    actor_name: row.actor_name,
    actor_role: null,
    actor_type: row.actor_type,
    event_type: row.event_type,
    event_label: row.event_label,
    resource_type: row.resource_type,
    resource_id: row.resource_id,
    metadata: row.metadata ?? {},
    created_at: row.created_at,
  };
}

export async function GET(request: Request) {
  const auth = await requireAdminPermission("view_activity_log");
  if ("error" in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const { searchParams } = new URL(request.url);
  const source = searchParams.get("source") ?? "all";
  const eventType = searchParams.get("event_type");
  const actorType = searchParams.get("actor_type");
  const limit = parseLimit(searchParams.get("limit"));

  try {
    const client = createServiceSupabaseClient();
    const logs: CombinedActivityLog[] = [];

    if (source === "all" || source === "admin") {
      let query = client
        .from("admin_activity_logs")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(limit);

      if (eventType) query = query.eq("event_type", eventType);

      const { data, error } = await query;
      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }
      logs.push(...((data ?? []) as AdminActivityLog[]).map(toCombinedAdmin));
    }

    if (source === "all" || source === "platform") {
      let query = client
        .from("platform_activity_logs")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(limit);

      if (eventType) query = query.eq("event_type", eventType);
      if (actorType) query = query.eq("actor_type", actorType);

      const { data, error } = await query;
      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }
      logs.push(
        ...((data ?? []) as PlatformActivityLog[]).map(toCombinedPlatform),
      );
    }

    logs.sort(
      (a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
    );

    return NextResponse.json({ logs: logs.slice(0, limit) });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Server error" },
      { status: 500 },
    );
  }
}
