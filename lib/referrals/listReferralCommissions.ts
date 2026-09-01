import type { SupabaseClient } from "@supabase/supabase-js";
import { doctorDisplayName } from "@/lib/doctors/display";
import type { ReferralCommissionRow } from "@/lib/referrals/types";

export type ReferralCommissionFilters = {
  doctorId?: string;
  from?: string;
  to?: string;
};

type CommissionDbRow = {
  id: string;
  referral_id: string;
  doctor_id: string;
  patient_id: string;
  payment_id: string | null;
  subscription_amount: number | string;
  commission_percent: number | string;
  commission_amount: number | string;
  currency: string | null;
  created_at: string;
  profiles:
    | { full_name: string | null }
    | { full_name: string | null }[]
    | null;
  doctor_profiles:
    | { first_name: string | null; last_name: string | null }
    | { first_name: string | null; last_name: string | null }[]
    | null;
};

function readNumber(value: number | string | null | undefined): number {
  const amount = Number(value);
  return Number.isFinite(amount) ? amount : 0;
}

export async function listReferralCommissions(
  client: SupabaseClient,
  filters: ReferralCommissionFilters,
): Promise<ReferralCommissionRow[]> {
  let query = client
    .from("doctor_referral_commissions")
    .select(
      "id, referral_id, doctor_id, patient_id, payment_id, subscription_amount, commission_percent, commission_amount, currency, created_at, profiles:patient_id(full_name), doctor_profiles:doctor_id(first_name, last_name)",
    )
    .order("created_at", { ascending: false });

  if (filters.doctorId) query = query.eq("doctor_id", filters.doctorId);
  if (filters.from) query = query.gte("created_at", filters.from);
  if (filters.to) query = query.lte("created_at", filters.to);

  const { data, error } = await query;
  if (error) throw new Error(error.message);

  return ((data as CommissionDbRow[] | null) ?? []).map((row) => {
    const profile = Array.isArray(row.profiles) ? row.profiles[0] : row.profiles;
    const doctor = Array.isArray(row.doctor_profiles)
      ? row.doctor_profiles[0]
      : row.doctor_profiles;

    return {
      id: row.id,
      referralId: row.referral_id,
      doctorId: row.doctor_id,
      patientId: row.patient_id,
      paymentId: row.payment_id,
      subscriptionAmount: readNumber(row.subscription_amount),
      commissionPercent: readNumber(row.commission_percent),
      commissionAmount: readNumber(row.commission_amount),
      currency: row.currency?.trim().toUpperCase() || "ETB",
      createdAt: row.created_at,
      patientName: profile?.full_name ?? null,
      doctorName: doctor
        ? doctorDisplayName(doctor.first_name ?? "", doctor.last_name ?? "")
        : null,
    };
  });
}
