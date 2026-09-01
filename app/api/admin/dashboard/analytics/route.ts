import { NextResponse } from "next/server";
import { requireAdminViewPermission } from "@/lib/adminAuth";
import { adminCanView } from "@/lib/adminRoles";
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
import type { SubscriptionPaymentRow } from "@/lib/dashboard/analytics";

const SUBSCRIPTION_PAGE_SIZE = 1000;

async function fetchSubscriptionPayments(
  client: ReturnType<typeof createServiceSupabaseClient>,
): Promise<SubscriptionPaymentRow[]> {
  const rows: SubscriptionPaymentRow[] = [];
  let from = 0;

  while (true) {
    const { data, error } = await client
      .from("app_subscriptions")
      .select("amount_paid, created_at")
      .order("created_at", { ascending: false })
      .range(from, from + SUBSCRIPTION_PAGE_SIZE - 1);

    if (error) throw new Error(error.message);

    const page = (data as SubscriptionPaymentRow[] | null) ?? [];
    rows.push(...page);
    if (page.length < SUBSCRIPTION_PAGE_SIZE) break;
    from += SUBSCRIPTION_PAGE_SIZE;
  }

  return rows;
}

export async function GET(request: Request) {
  const auth = await requireAdminViewPermission("view_dashboard");
  if ("error" in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const { searchParams } = new URL(request.url);
  const range = parseDashboardRange(searchParams.get("range"));

  try {
    const client = createServiceSupabaseClient();
    const canViewFinance = adminCanView(auth.adminRole, "manage_finance");

    const [appointmentsResult, walletResult, financeResult, subscriptionsResult] =
      await Promise.all([
      client
        .from("appointments")
        .select(
          "id, status, amount_paid, payment_status, total_amount, created_at, updated_at",
        )
        .order("created_at", { ascending: false }),
      canViewFinance
        ? client
            .from("wallet_transactions")
            .select("id, amount, is_credit, type, created_at")
            .order("created_at", { ascending: false })
        : Promise.resolve({ data: [], error: null }),
      canViewFinance
        ? client
            .from("app_settings")
            .select("data")
            .eq("id", "finance")
            .maybeSingle()
        : Promise.resolve({ data: null, error: null }),
      canViewFinance
        ? fetchSubscriptionPayments(client)
        : Promise.resolve([]),
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
      subscriptionPayments: subscriptionsResult,
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
