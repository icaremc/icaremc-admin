import { NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/adminAuth";
import {
  computeDashboardAnalytics,
  parseDashboardRange,
} from "@/lib/dashboard/analytics";
import {
  defaultFinanceSettings,
  parseFinanceSettings,
} from "@/lib/payment/financeSettings";
import { createServiceSupabaseClient } from "@/lib/supabase/service";
import type { Appointment } from "@/lib/types/doctors";
import type { WalletTransaction } from "@/lib/types/finance";

export async function GET(request: Request) {
  const auth = await requireAdminSession();
  if ("error" in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const { searchParams } = new URL(request.url);
  const range = parseDashboardRange(searchParams.get("range"));

  try {
    const client = createServiceSupabaseClient();

    const [appointmentsResult, walletResult, financeResult] = await Promise.all([
      client
        .from("appointments")
        .select(
          "id, status, amount_paid, payment_status, total_amount, created_at, updated_at",
        )
        .order("created_at", { ascending: false }),
      client
        .from("wallet_transactions")
        .select("id, amount, is_credit, type, created_at")
        .order("created_at", { ascending: false }),
      client
        .from("app_settings")
        .select("data")
        .eq("id", "finance")
        .maybeSingle(),
    ]);

    if (appointmentsResult.error) {
      return NextResponse.json({ error: appointmentsResult.error.message }, { status: 500 });
    }
    if (walletResult.error) {
      return NextResponse.json({ error: walletResult.error.message }, { status: 500 });
    }

    const financeSettings = parseFinanceSettings(
      financeResult.data?.data ?? defaultFinanceSettings(),
    );

    const analytics = computeDashboardAnalytics({
      appointments: (appointmentsResult.data ?? []) as Appointment[],
      walletTransactions: (walletResult.data ?? []) as WalletTransaction[],
      commissionPercent: financeSettings.platformCommissionPercent,
      range,
    });

    return NextResponse.json({ range, analytics });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Server error" },
      { status: 500 },
    );
  }
}
