import { NextResponse } from "next/server";
import { requireSuperAdminSession } from "@/lib/adminAuth";
import {
  mergePaymentSettings,
  parsePaymentSettingsData,
  type PaymentSettingsData,
} from "@/lib/payment/paymentSettings";
import { createServiceSupabaseClient } from "@/lib/supabase/service";

const PAYMENT_ROW_ID = "payment";

export async function GET() {
  const auth = await requireSuperAdminSession();
  if ("error" in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  try {
    const client = createServiceSupabaseClient();
    const { data, error } = await client
      .from("app_settings")
      .select("id, data, updated_at")
      .eq("id", PAYMENT_ROW_ID)
      .maybeSingle();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      paymentSettings: parsePaymentSettingsData(data?.data),
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
  const auth = await requireSuperAdminSession();
  if ("error" in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  let body: { paymentSettings?: PaymentSettingsData };
  try {
    body = (await request.json()) as { paymentSettings?: PaymentSettingsData };
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (!body.paymentSettings?.chapa) {
    return NextResponse.json({ error: "paymentSettings.chapa is required" }, { status: 400 });
  }

  try {
    const client = createServiceSupabaseClient();
    const { data: existing, error: readError } = await client
      .from("app_settings")
      .select("data")
      .eq("id", PAYMENT_ROW_ID)
      .maybeSingle();

    if (readError) {
      return NextResponse.json({ error: readError.message }, { status: 500 });
    }

    const merged = mergePaymentSettings(
      parsePaymentSettingsData(existing?.data),
      body.paymentSettings,
    );

    const { data, error } = await client
      .from("app_settings")
      .upsert(
        {
          id: PAYMENT_ROW_ID,
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

    return NextResponse.json({
      paymentSettings: parsePaymentSettingsData(data.data),
      updatedAt: data.updated_at,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Server error" },
      { status: 500 },
    );
  }
}
