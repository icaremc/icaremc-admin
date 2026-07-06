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
import type { WalletTransaction } from "@/lib/types/finance";

export type DoctorWalletHistory = {
  wallet: {
    available_balance: number;
    pending_balance: number;
    currency: string;
  } | null;
  commissionPercent: number;
  earnings: DoctorRecentEarning[];
  transactions: WalletTransaction[];
};

export async function buildDoctorWalletHistory(
  doctorId: string,
): Promise<DoctorWalletHistory> {
  const client = createServiceSupabaseClient();

  const [walletResult, financeResult, earningsResult, transactionsResult] =
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
        .limit(100),
      client
        .from("wallet_transactions")
        .select(
          "id, doctor_id, amount, is_credit, type, appointment_id, payout_request_id, note, created_at",
        )
        .eq("doctor_id", doctorId)
        .order("created_at", { ascending: false })
        .limit(100),
    ]);

  const financeSettings = parseFinanceSettings(
    financeResult.data?.data ?? defaultFinanceSettings(),
  );

  return {
    wallet: walletResult.data
      ? {
          available_balance: Number(walletResult.data.available_balance ?? 0),
          pending_balance: Number(walletResult.data.pending_balance ?? 0),
          currency: walletResult.data.currency ?? "ETB",
        }
      : null,
    commissionPercent: financeSettings.platformCommissionPercent,
    earnings: ((earningsResult.data ?? []) as WalletEarningRow[]).map(
      mapWalletEarningRow,
    ),
    transactions: (transactionsResult.data ?? []) as WalletTransaction[],
  };
}
