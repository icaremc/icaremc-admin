import type { SupabaseClient } from "@supabase/supabase-js";

interface SubscriptionRow {
  id: string;
  patient_id: string;
  plan: string;
  status: string;
  starts_at: string;
  ends_at: string;
  amount_paid: number;
  currency: string;
  payment_method: string | null;
  chapa_tx_ref: string | null;
  admin_receipt_url: string | null;
  created_at: string;
  updated_at: string;
}

interface GrantAppSubscriptionOptions {
  durationDays?: number | null;
  amountPaid?: number | null;
  receiptUrl: string;
}

export async function grantAppSubscription(
  client: SupabaseClient,
  patientId: string,
  options: GrantAppSubscriptionOptions,
): Promise<SubscriptionRow> {
  const { data, error } = await client.rpc("admin_grant_app_subscription", {
    p_patient_id: patientId,
    p_duration_days: options.durationDays ?? null,
    p_amount_paid: options.amountPaid ?? null,
    p_receipt_url: options.receiptUrl,
  });

  if (error) throw new Error(error.message);
  if (!data) throw new Error("Failed to grant subscription");

  return data as SubscriptionRow;
}

export async function revokeAppSubscription(
  client: SupabaseClient,
  patientId: string,
): Promise<SubscriptionRow> {
  const { data, error } = await client.rpc("admin_revoke_app_subscription", {
    p_patient_id: patientId,
  });

  if (error) throw new Error(error.message);
  if (!data) throw new Error("No active subscription");

  return data as SubscriptionRow;
}
