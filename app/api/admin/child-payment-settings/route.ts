import { NextResponse } from "next/server";
import { ADMIN_ACTIVITY_EVENTS } from "@/lib/activity/events";
import { settingsUpdatedEventLabel } from "@/lib/activity/buildLog";
import { logAdminActivityFromAuth } from "@/lib/activity/logFromAuth";
import { requireAdminPermission } from "@/lib/adminAuth";
import {
  defaultProfilePaymentSettings,
  mergeProfilePaymentSettings,
  parseProfilePaymentSettings,
  type ProfilePaymentSettings,
} from "@/lib/payment/profilePaymentSettings";
import { createServiceSupabaseClient } from "@/lib/supabase/service";

const ROW_ID = "child_payment" as const;

export async function GET() {
  const auth = await requireAdminPermission("manage_finance");
  if ("error" in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  try {
    const client = createServiceSupabaseClient();
    const { data, error } = await client
      .from("app_settings")
      .select("id, data, updated_at")
      .eq("id", ROW_ID)
      .maybeSingle();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      childPaymentSettings: parseProfilePaymentSettings(
        data?.data ?? defaultProfilePaymentSettings(ROW_ID),
        ROW_ID,
      ),
      updatedAt: data?.updated_at ?? null,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Server error" },
      { status: 500 },
    );
  }
}

async function save(request: Request) {
  const auth = await requireAdminPermission("manage_finance");
  if ("error" in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  let body: { childPaymentSettings?: Partial<ProfilePaymentSettings> };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (!body.childPaymentSettings) {
    return NextResponse.json(
      { error: "childPaymentSettings is required" },
      { status: 400 },
    );
  }

  try {
    const client = createServiceSupabaseClient();
    const { data: existing, error: readError } = await client
      .from("app_settings")
      .select("data")
      .eq("id", ROW_ID)
      .maybeSingle();

    if (readError) {
      return NextResponse.json({ error: readError.message }, { status: 500 });
    }

    const merged = mergeProfilePaymentSettings(
      parseProfilePaymentSettings(
        existing?.data ?? defaultProfilePaymentSettings(ROW_ID),
        ROW_ID,
      ),
      body.childPaymentSettings,
    );

    const { data, error } = await client
      .from("app_settings")
      .upsert(
        {
          id: ROW_ID,
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
          "child payment settings",
          "profile registration fee",
        ),
        resourceType: "app_settings",
        resourceId: ROW_ID,
      },
      request,
    );

    return NextResponse.json({
      childPaymentSettings: parseProfilePaymentSettings(data.data, ROW_ID),
      updatedAt: data.updated_at,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Server error" },
      { status: 500 },
    );
  }
}

export async function PATCH(request: Request) {
  return save(request);
}

export async function PUT(request: Request) {
  return save(request);
}
