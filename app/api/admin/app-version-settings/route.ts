import { NextResponse } from "next/server";
import { ADMIN_ACTIVITY_EVENTS } from "@/lib/activity/events";
import { settingsUpdatedEventLabel } from "@/lib/activity/buildLog";
import { logAdminActivityFromAuth } from "@/lib/activity/logFromAuth";
import { requireAdminManagePermission, requireAdminViewPermission } from "@/lib/adminAuth";
import {
  mergeAppVersionSettings,
  parseAppVersionSettingsData,
  type AppVersionSettingsData,
} from "@/lib/appVersion/appVersionSettings";
import {
  resolveAppVersionTarget,
  rowIdForAppVersionTarget,
  type AppVersionTarget,
} from "@/lib/appVersion/appVersionTargets";
import { createServiceSupabaseClient } from "@/lib/supabase/service";

function resolveTarget(request: Request): AppVersionTarget {
  const url = new URL(request.url);
  return resolveAppVersionTarget(url.searchParams.get("app"));
}

export async function GET(request: Request) {
  const app = resolveTarget(request);
  const rowId = rowIdForAppVersionTarget(app);
  const auth = await requireAdminViewPermission("manage_content");
  if ("error" in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  try {
    const client = createServiceSupabaseClient();
    const { data, error } = await client
      .from("app_settings")
      .select("id, data, updated_at")
      .eq("id", rowId)
      .maybeSingle();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      app,
      appVersionSettings: parseAppVersionSettingsData(data?.data, app),
      updatedAt: data?.updated_at ?? null,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Server error" },
      { status: 500 },
    );
  }
}

export async function PATCH(request: Request) {
  const app = resolveTarget(request);
  const rowId = rowIdForAppVersionTarget(app);
  const auth = await requireAdminManagePermission("manage_content");
  if ("error" in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  let body: { appVersionSettings?: Partial<AppVersionSettingsData> };
  try {
    body = (await request.json()) as {
      appVersionSettings?: Partial<AppVersionSettingsData>;
    };
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (!body.appVersionSettings) {
    return NextResponse.json(
      { error: "appVersionSettings is required" },
      { status: 400 },
    );
  }

  try {
    const client = createServiceSupabaseClient();
    const { data: existing, error: readError } = await client
      .from("app_settings")
      .select("data")
      .eq("id", rowId)
      .maybeSingle();

    if (readError) {
      return NextResponse.json({ error: readError.message }, { status: 500 });
    }

    const merged = mergeAppVersionSettings(
      parseAppVersionSettingsData(existing?.data, app),
      body.appVersionSettings,
    );

    const { data, error } = await client
      .from("app_settings")
      .upsert(
        {
          id: rowId,
          data: merged,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "id" },
      )
      .select("id, data, updated_at")
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    await logAdminActivityFromAuth(
      auth,
      {
        eventType: ADMIN_ACTIVITY_EVENTS.SETTINGS_UPDATED,
        eventLabel: settingsUpdatedEventLabel(
          `${app} version settings`,
          "minimum client versions",
        ),
        resourceType: "app_settings",
        resourceId: rowId,
      },
      request,
    );

    return NextResponse.json({
      app,
      appVersionSettings: parseAppVersionSettingsData(data.data, app),
      updatedAt: data.updated_at,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Server error" },
      { status: 500 },
    );
  }
}
