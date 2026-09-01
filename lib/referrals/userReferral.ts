import type { SupabaseClient } from "@supabase/supabase-js";
import type { UserReferralInfo } from "@/lib/referrals/types";
import { doctorDisplayName } from "@/lib/doctors/display";

export async function fetchUserReferralInfo(
  client: SupabaseClient,
  patientId: string,
): Promise<UserReferralInfo> {
  const { data: profile, error: profileError } = await client
    .from("profiles")
    .select("referral_code_used, referred_by_doctor_id")
    .eq("id", patientId)
    .maybeSingle();

  if (profileError) throw new Error(profileError.message);
  if (!profile) throw new Error("Patient not found");

  let referredByDoctorName: string | null = null;
  let referredAt: string | null = null;

  if (profile.referred_by_doctor_id) {
    const [doctorRes, referralRes] = await Promise.all([
      client
        .from("doctor_profiles")
        .select("first_name, last_name")
        .eq("id", profile.referred_by_doctor_id)
        .maybeSingle(),
      client
        .from("doctor_referrals")
        .select("created_at")
        .eq("patient_id", patientId)
        .maybeSingle(),
    ]);

    if (doctorRes.error) throw new Error(doctorRes.error.message);
    if (referralRes.error) throw new Error(referralRes.error.message);

    if (doctorRes.data) {
      referredByDoctorName = doctorDisplayName(
        doctorRes.data.first_name,
        doctorRes.data.last_name,
      );
    }
    referredAt =
      typeof referralRes.data?.created_at === "string"
        ? referralRes.data.created_at
        : null;
  }

  return {
    referralCodeUsed:
      typeof profile.referral_code_used === "string"
        ? profile.referral_code_used
        : null,
    referredByDoctorId:
      typeof profile.referred_by_doctor_id === "string"
        ? profile.referred_by_doctor_id
        : null,
    referredByDoctorName,
    referredAt,
    canApplyCode: !profile.referred_by_doctor_id,
  };
}
