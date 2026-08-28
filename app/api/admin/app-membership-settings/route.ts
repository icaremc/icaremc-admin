import { NextResponse } from "next/server";
import { ADMIN_ACTIVITY_EVENTS } from "@/lib/activity/events";
import { settingsUpdatedEventLabel } from "@/lib/activity/buildLog";
import { logAdminActivityFromAuth } from "@/lib/activity/logFromAuth";
import { requireAdminManagePermission, requireAdminViewPermission } from "@/lib/adminAuth";
import {
  mergeAppMembershipSettings,
  parseAppMembershipSettingsData,
  serializeAppMembershipSettings,
  type AppMembershipSettingsData,
} from "@/lib/appMembership/subscriptionSettings";
import { createServiceSupabaseClient } from "@/lib/supabase/service";

const SETTINGS_ROW_ID = "subscription";

export async function GET() {
  const auth = await requireAdminViewPermission("manage_finance");
  if ("error" in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  try {
    const client = createServiceSupabaseClient();
    const { data, error } = await client
      .from("app_settings")
      .select("id, data, updated_at")
      .eq("id", SETTINGS_ROW_ID)
      .maybeSingle();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      appMembershipSettings: parseAppMembershipSettingsData(data?.data),
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
  const auth = await requireAdminManagePermission("manage_finance");
  if ("error" in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  let body: { appMembershipSettings?: Partial<AppMembershipSettingsData> };
  try {
    body = (await request.json()) as {
      appMembershipSettings?: Partial<AppMembershipSettingsData>;
    };
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (!body.appMembershipSettings) {
    return NextResponse.json(
      { error: "appMembershipSettings is required" },
      { status: 400 },
    );
  }

  try {
    const client = createServiceSupabaseClient();
    const { data: existing, error: readError } = await client
      .from("app_settings")
      .select("data")
      .eq("id", SETTINGS_ROW_ID)
      .maybeSingle();

    if (readError) {
      return NextResponse.json({ error: readError.message }, { status: 500 });
    }

    const merged = mergeAppMembershipSettings(
      parseAppMembershipSettingsData(existing?.data),
      body.appMembershipSettings,
    );

    const { data, error } = await client
      .from("app_settings")
      .upsert(
        {
          id: SETTINGS_ROW_ID,
          data: serializeAppMembershipSettings(merged),
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
          "app membership settings",
          "yearly MC access pricing",
        ),
        resourceType: "app_settings",
        resourceId: SETTINGS_ROW_ID,
      },
      request,
    );

    return NextResponse.json({
      appMembershipSettings: parseAppMembershipSettingsData(data.data),
      updatedAt: data.updated_at,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Server error" },
      { status: 500 },
    );
  }
}
