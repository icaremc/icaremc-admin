import type { SupabaseClient } from "@supabase/supabase-js";

function normalizeReferralCode(code: string): string {
  return code.trim().toUpperCase();
}

export async function applyPatientReferralCode(
  client: SupabaseClient,
  patientId: string,
  rawCode: string,
): Promise<{ referralCode: string; doctorId: string }> {
  const referralCode = normalizeReferralCode(rawCode);
  if (!referralCode) {
    throw new Error("Referral code is required");
  }

  const { data: profile, error: profileError } = await client
    .from("profiles")
    .select("id, referred_by_doctor_id")
    .eq("id", patientId)
    .maybeSingle();

  if (profileError) throw new Error(profileError.message);
  if (!profile) throw new Error("Patient not found");
  if (profile.referred_by_doctor_id) {
    throw new Error("Patient already has a referring doctor");
  }

  const { data: doctor, error: doctorError } = await client
    .from("doctor_profiles")
    .select("id, referral_code")
    .eq("referral_code", referralCode)
    .maybeSingle();

  if (doctorError) throw new Error(doctorError.message);
  if (!doctor) throw new Error("Invalid referral code");

  const { error: updateError } = await client
    .from("profiles")
    .update({
      referral_code_used: referralCode,
      referred_by_doctor_id: doctor.id,
      updated_at: new Date().toISOString(),
    })
    .eq("id", patientId)
    .is("referred_by_doctor_id", null);

  if (updateError) throw new Error(updateError.message);

  const { error: referralError } = await client.from("doctor_referrals").upsert(
    {
      patient_id: patientId,
      doctor_id: doctor.id,
      referral_code: referralCode,
    },
    { onConflict: "patient_id", ignoreDuplicates: true },
  );

  if (referralError) throw new Error(referralError.message);

  return { referralCode, doctorId: doctor.id as string };
}
