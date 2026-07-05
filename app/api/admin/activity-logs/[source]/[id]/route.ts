import { NextResponse } from "next/server";
import { requireAdminPermission } from "@/lib/adminAuth";
import { createServiceSupabaseClient } from "@/lib/supabase/service";
import type {
  AdminActivityLog,
  CombinedActivityLog,
  PlatformActivityLog,
} from "@/lib/types/activity";

type RouteContext = { params: Promise<{ source: string; id: string }> };

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
    ip_address: row.ip_address,
    user_agent: row.user_agent,
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
    ip_address: row.ip_address,
    user_agent: row.user_agent,
    created_at: row.created_at,
  };
}

export async function GET(_request: Request, context: RouteContext) {
  const auth = await requireAdminPermission("view_activity_log");
  if ("error" in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const { source, id } = await context.params;
  if (source !== "admin" && source !== "platform") {
    return NextResponse.json({ error: "Invalid source" }, { status: 400 });
  }

  try {
    const client = createServiceSupabaseClient();

    if (source === "admin") {
      const { data, error } = await client
        .from("admin_activity_logs")
        .select("*")
        .eq("id", id)
        .maybeSingle();

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }
      if (!data) {
        return NextResponse.json({ error: "Activity log not found" }, { status: 404 });
      }

      return NextResponse.json({ log: toCombinedAdmin(data as AdminActivityLog) });
    }

    const { data, error } = await client
      .from("platform_activity_logs")
      .select("*")
      .eq("id", id)
      .maybeSingle();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    if (!data) {
      return NextResponse.json({ error: "Activity log not found" }, { status: 404 });
    }

    return NextResponse.json({ log: toCombinedPlatform(data as PlatformActivityLog) });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Server error" },
      { status: 500 },
    );
  }
}
