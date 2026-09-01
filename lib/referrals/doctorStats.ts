import type { SupabaseClient } from "@supabase/supabase-js";
import type { DoctorReferralStats } from "@/lib/referrals/types";

export async function fetchDoctorReferralStats(
  client: SupabaseClient,
  doctorId: string,
): Promise<DoctorReferralStats> {
  const { data: doctor, error: doctorError } = await client
    .from("doctor_profiles")
    .select("referral_code")
    .eq("id", doctorId)
    .maybeSingle();

  if (doctorError) throw new Error(doctorError.message);

  const { count, error: countError } = await client
    .from("doctor_referrals")
    .select("id", { count: "exact", head: true })
    .eq("doctor_id", doctorId);

  if (countError) throw new Error(countError.message);

  const { data: commissions, error: commissionError } = await client
    .from("doctor_referral_commissions")
    .select("commission_amount, currency")
    .eq("doctor_id", doctorId);

  if (commissionError) throw new Error(commissionError.message);

  let totalCommission = 0;
  let currency = "ETB";
  for (const row of commissions ?? []) {
    totalCommission += Number(row.commission_amount) || 0;
    if (typeof row.currency === "string" && row.currency.trim()) {
      currency = row.currency.trim().toUpperCase();
    }
  }

  return {
    referralCode:
      typeof doctor?.referral_code === "string" ? doctor.referral_code : null,
    referredCount: count ?? 0,
    totalCommission,
    currency,
  };
}
