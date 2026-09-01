import type { SupabaseClient } from "@supabase/supabase-js";
import type { ReferralListRow } from "@/lib/referrals/types";
import { chunkValues } from "@/lib/appMembership/members";

export type ReferralListFilters = {
  doctorId?: string;
  from?: string;
  to?: string;
  subscribed?: "all" | "yes" | "no";
};

type ReferralRow = {
  id: string;
  patient_id: string;
  doctor_id: string;
  referral_code: string;
  created_at: string;
  profiles:
    | { full_name: string | null; phone: string | null }
    | { full_name: string | null; phone: string | null }[]
    | null;
  doctor_profiles:
    | { first_name: string | null; last_name: string | null }
    | { first_name: string | null; last_name: string | null }[]
    | null;
};

function doctorName(
  profile:
    | { first_name: string | null; last_name: string | null }
    | null
    | undefined,
): string | null {
  if (!profile) return null;
  const parts = [profile.first_name, profile.last_name]
    .filter((part) => typeof part === "string" && part.trim())
    .map((part) => part!.trim());
  return parts.length ? parts.join(" ") : null;
}

export async function listReferrals(
  client: SupabaseClient,
  filters: ReferralListFilters,
): Promise<ReferralListRow[]> {
  let query = client
    .from("doctor_referrals")
    .select(
      "id, patient_id, doctor_id, referral_code, created_at, profiles:patient_id(full_name, phone), doctor_profiles:doctor_id(first_name, last_name)",
    )
    .order("created_at", { ascending: false });

  if (filters.doctorId) query = query.eq("doctor_id", filters.doctorId);
  if (filters.from) query = query.gte("created_at", filters.from);
  if (filters.to) query = query.lte("created_at", filters.to);

  const { data, error } = await query;
  if (error) throw new Error(error.message);

  const rows = (data as ReferralRow[] | null) ?? [];
  const patientIds = [...new Set(rows.map((row) => row.patient_id))];

  const subscribedPatients = new Set<string>();

  if (patientIds.length > 0) {
    for (const chunk of chunkValues(patientIds, 200)) {
      const subsRes = await client
        .from("app_subscriptions")
        .select("patient_id, amount_paid")
        .in("patient_id", chunk)
        .gt("amount_paid", 0);

      if (subsRes.error) throw new Error(subsRes.error.message);

      for (const sub of subsRes.data ?? []) {
        subscribedPatients.add(sub.patient_id as string);
      }
    }
  }

  let mapped = rows.map((row) => {
    const profile = Array.isArray(row.profiles) ? row.profiles[0] : row.profiles;
    const doc = Array.isArray(row.doctor_profiles)
      ? row.doctor_profiles[0]
      : row.doctor_profiles;

    return {
      id: row.id,
      patientId: row.patient_id,
      doctorId: row.doctor_id,
      referralCode: row.referral_code,
      createdAt: row.created_at,
      patientName: profile?.full_name ?? null,
      patientPhone: profile?.phone ?? null,
      doctorName: doctorName(doc),
      isSubscribed: subscribedPatients.has(row.patient_id),
    } satisfies ReferralListRow;
  });

  if (filters.subscribed === "yes") {
    mapped = mapped.filter((row) => row.isSubscribed);
  } else if (filters.subscribed === "no") {
    mapped = mapped.filter((row) => !row.isSubscribed);
  }

  return mapped;
}
