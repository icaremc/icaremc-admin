import {
  defaultFinanceSettings,
  parseFinanceSettings,
} from "@/lib/payment/financeSettings";
import {
  type DoctorRecentEarning,
  mapWalletEarningRow,
  type WalletEarningRow,
} from "@/lib/finance/doctorWalletEarnings";
import { createServiceSupabaseClient } from "@/lib/supabase/service";
import type { DoctorPayoutRequest } from "@/lib/types/finance";

export type { DoctorRecentEarning };

export type DoctorPayoutSummary = {
  earned: number;
  paidOut: number;
  requested: number;
  payoutCount: number;
};

export type DoctorPayoutContext = {
  wallet: {
    available_balance: number;
    pending_balance: number;
    currency: string;
  } | null;
  commissionPercent: number;
  thisMonth: DoctorPayoutSummary;
  thisWeek: Pick<DoctorPayoutSummary, "earned" | "payoutCount">;
  payoutHistory: DoctorPayoutRequest[];
  recentEarnings: DoctorRecentEarning[];
};

function startOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function daysAgo(days: number): Date {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date;
}

function isOnOrAfter(value: string | null | undefined, from: Date): boolean {
  if (!value) return false;
  const date = new Date(value);
  return !Number.isNaN(date.getTime()) && date >= from;
}

function sumAmount(rows: Array<{ amount?: number | string | null }>): number {
  return rows.reduce((sum, row) => sum + Number(row.amount ?? 0), 0);
}

export async function buildDoctorPayoutContext(
  doctorId: string,
): Promise<DoctorPayoutContext> {
  const client = createServiceSupabaseClient();
  const now = new Date();
  const monthStart = startOfMonth(now);
  const weekStart = daysAgo(7);

  const [walletResult, financeResult, earningsResult, payoutResult] =
    await Promise.all([
      client
        .from("doctor_wallets")
        .select("available_balance, pending_balance, currency")
        .eq("doctor_id", doctorId)
        .maybeSingle(),
      client.from("app_settings").select("data").eq("id", "finance").maybeSingle(),
      client
        .from("wallet_transactions")
        .select(
          `
          id,
          amount,
          created_at,
          note,
          appointment_id,
          appointments (
            id,
            patient_id,
            patient_name,
            appointment_date,
            time_slot,
            service_name,
            profiles ( full_name )
          )
        `,
        )
        .eq("doctor_id", doctorId)
        .eq("type", "appointment_earning")
        .order("created_at", { ascending: false })
        .limit(50),
      client
        .from("doctor_payout_requests")
        .select("*")
        .eq("doctor_id", doctorId)
        .order("created_at", { ascending: false }),
    ]);

  const financeSettings = parseFinanceSettings(
    financeResult.data?.data ?? defaultFinanceSettings(),
  );
  const earnings = ((earningsResult.data ?? []) as WalletEarningRow[]).map(
    mapWalletEarningRow,
  );
  const payoutHistory = (payoutResult.data ?? []) as DoctorPayoutRequest[];

  const monthEarnings = earnings.filter((row) =>
    isOnOrAfter(row.created_at, monthStart),
  );
  const weekEarnings = earnings.filter((row) =>
    isOnOrAfter(row.created_at, weekStart),
  );

  const monthPayouts = payoutHistory.filter((row) =>
    isOnOrAfter(row.created_at, monthStart),
  );
  const monthPaidOut = monthPayouts
    .filter((row) => row.status === "completed")
    .reduce((sum, row) => sum + Number(row.amount), 0);
  const monthRequested = monthPayouts
    .filter((row) => row.status === "pending" || row.status === "approved")
    .reduce((sum, row) => sum + Number(row.amount), 0);

  return {
    wallet: walletResult.data
      ? {
          available_balance: Number(walletResult.data.available_balance ?? 0),
          pending_balance: Number(walletResult.data.pending_balance ?? 0),
          currency: walletResult.data.currency ?? "ETB",
        }
      : null,
    commissionPercent: financeSettings.platformCommissionPercent,
    thisMonth: {
      earned: sumAmount(monthEarnings),
      paidOut: monthPaidOut,
      requested: monthRequested,
      payoutCount: monthPayouts.length,
    },
    thisWeek: {
      earned: sumAmount(weekEarnings),
      payoutCount: payoutHistory.filter((row) => isOnOrAfter(row.created_at, weekStart))
        .length,
    },
    payoutHistory,
    recentEarnings: earnings.slice(0, 10),
  };
}
