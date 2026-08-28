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

export function matchesMembershipStatusFilter(
  member: Pick<AppSubscriptionMember, "status" | "has_access">,
  filter: string,
): boolean {
  if (!filter || filter === "all") return true;
  if (filter === "active") return member.has_access;
  if (filter === "cancelled") return member.status === "cancelled";
  if (filter === "expired") {
    return (
      member.status === "expired" ||
      (member.status === "active" && !member.has_access)
    );
  }
  return true;
}

export function chunkValues<T>(values: T[], size: number): T[][] {
  if (size <= 0) return [values];
  const chunks: T[][] = [];
  for (let index = 0; index < values.length; index += size) {
    chunks.push(values.slice(index, index + size));
  }
  return chunks;
}
