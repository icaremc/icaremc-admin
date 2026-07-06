import { NextResponse } from "next/server";
import { ADMIN_ACTIVITY_EVENTS } from "@/lib/activity/events";
import { settingsUpdatedEventLabel } from "@/lib/activity/buildLog";
import { logAdminActivityFromAuth } from "@/lib/activity/logFromAuth";
import { requireAdminPermission } from "@/lib/adminAuth";
import {
  defaultFinanceSettings,
  mergeFinanceSettings,
  parseFinanceSettings,
} from "@/lib/payment/financeSettings";
import { createServiceSupabaseClient } from "@/lib/supabase/service";

const FINANCE_ROW_ID = "finance";

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
      .eq("id", FINANCE_ROW_ID)
      .maybeSingle();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      financeSettings: parseFinanceSettings(data?.data ?? defaultFinanceSettings()),
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
  const auth = await requireAdminPermission("manage_finance");
  if ("error" in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  let body: { financeSettings?: Partial<ReturnType<typeof defaultFinanceSettings>> };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (!body.financeSettings) {
    return NextResponse.json({ error: "financeSettings is required" }, { status: 400 });
  }

  try {
    const client = createServiceSupabaseClient();
    const { data: existing, error: readError } = await client
      .from("app_settings")
      .select("data")
      .eq("id", FINANCE_ROW_ID)
      .maybeSingle();

    if (readError) {
      return NextResponse.json({ error: readError.message }, { status: 500 });
    }

    const merged = mergeFinanceSettings(
      parseFinanceSettings(existing?.data ?? defaultFinanceSettings()),
      body.financeSettings,
    );

    const { data, error } = await client
      .from("app_settings")
      .upsert(
        {
          id: FINANCE_ROW_ID,
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
        eventLabel: settingsUpdatedEventLabel("finance settings", "commission and withdrawal rules"),
        resourceType: "app_settings",
        resourceId: FINANCE_ROW_ID,
      },
      request,
    );

    return NextResponse.json({
      financeSettings: parseFinanceSettings(data.data),
      updatedAt: data.updated_at,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Server error" },
      { status: 500 },
    );
  }
}
