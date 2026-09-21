import { NextResponse } from "next/server";
import { requireAdminViewPermission } from "@/lib/adminAuth";
import { adminCanView } from "@/lib/adminRoles";
import {
  computeDashboardAnalytics,
  parseDashboardRange,
  type SubscriptionPaymentRow,
} from "@/lib/dashboard/analytics";
import {
  defaultFinanceSettings,
  parseFinanceSettings,
} from "@/lib/payment/financeSettings";
import { createServiceSupabaseClient } from "@/lib/supabase/service";
import type { Appointment } from "@/lib/types/doctors";
import type { WalletTransaction } from "@/lib/types/finance";

const PAGE_SIZE = 1000;

type ServiceClient = ReturnType<typeof createServiceSupabaseClient>;

async function fetchAllPages<T>(
  fetchPage: (
    from: number,
    to: number,
  ) => PromiseLike<{ data: T[] | null; error: { message: string } | null }>,
): Promise<T[]> {
  const rows: T[] = [];
  let from = 0;

  while (true) {
    const { data, error } = await fetchPage(from, from + PAGE_SIZE - 1);
    if (error) throw new Error(error.message);
    const page = data ?? [];
    rows.push(...page);
    if (page.length < PAGE_SIZE) break;
    from += PAGE_SIZE;
  }

  return rows;
}

async function fetchAppointments(client: ServiceClient): Promise<Appointment[]> {
  return fetchAllPages((from, to) =>
    client
      .from("appointments")
      .select(
        "id, status, amount_paid, payment_status, total_amount, created_at, updated_at",
      )
      .order("created_at", { ascending: false })
      .range(from, to),
  ) as Promise<Appointment[]>;
}

async function fetchWalletTransactions(
  client: ServiceClient,
): Promise<WalletTransaction[]> {
  return fetchAllPages((from, to) =>
    client
      .from("wallet_transactions")
      .select("id, amount, is_credit, type, created_at")
      .order("created_at", { ascending: false })
      .range(from, to),
  ) as Promise<WalletTransaction[]>;
}

async function fetchSubscriptionPayments(
  client: ServiceClient,
): Promise<SubscriptionPaymentRow[]> {
  return fetchAllPages((from, to) =>
    client
      .from("app_subscriptions")
      .select("amount_paid, created_at")
      .order("created_at", { ascending: false })
      .range(from, to),
  );
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

    const [appointments, walletTransactions, financeResult, subscriptionPayments] =
      await Promise.all([
        fetchAppointments(client),
        canViewFinance ? fetchWalletTransactions(client) : Promise.resolve([]),
        canViewFinance
          ? client.from("app_settings").select("data").eq("id", "finance").maybeSingle()
          : Promise.resolve({ data: null, error: null }),
        canViewFinance ? fetchSubscriptionPayments(client) : Promise.resolve([]),
      ]);

    if (financeResult.error) {
      return NextResponse.json({ error: financeResult.error.message }, { status: 500 });
    }

    const financeSettings = parseFinanceSettings(
      financeResult.data?.data ?? defaultFinanceSettings(),
    );

    const analytics = computeDashboardAnalytics({
      appointments,
      walletTransactions,
      subscriptionPayments,
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
