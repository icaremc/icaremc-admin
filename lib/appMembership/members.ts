export type AppSubscriptionStatus = "active" | "expired" | "cancelled";

export type AppSubscriptionMember = {
  id: string;
  patient_id: string;
  plan: string;
  status: AppSubscriptionStatus;
  starts_at: string;
  ends_at: string;
  amount_paid: number;
  currency: string;
  payment_method: string | null;
  chapa_tx_ref: string | null;
  admin_receipt_url: string | null;
  created_at: string;
  updated_at: string;
  patient_name: string | null;
  patient_phone: string | null;
  has_access: boolean;
};

export function subscriptionHasAccess(
  status: string,
  endsAt: string,
  now = Date.now(),
): boolean {
  return status === "active" && new Date(endsAt).getTime() > now;
}

export function latestSubscriptionPerPatient<T extends { patient_id: string }>(
  members: T[],
): T[] {
  const seen = new Set<string>();
  const latest: T[] = [];

  for (const member of members) {
    if (seen.has(member.patient_id)) continue;
    seen.add(member.patient_id);
    latest.push(member);
  }

  return latest;
}
