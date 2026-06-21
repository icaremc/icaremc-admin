import { createServiceSupabaseClient } from "@/lib/supabase/service";
import type { PayoutRequestStatus } from "@/lib/types/finance";

export async function approvePayoutRequest(requestId: string, adminNote?: string) {
  const client = createServiceSupabaseClient();

  const { data: request, error } = await client
    .from("doctor_payout_requests")
    .select("*")
    .eq("id", requestId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!request) throw new Error("Payout request not found");
  if (request.status !== "pending") {
    throw new Error("Only pending requests can be approved");
  }

  const { data: updated, error: updateError } = await client
    .from("doctor_payout_requests")
    .update({
      status: "approved" satisfies PayoutRequestStatus,
      admin_note: adminNote?.trim() || request.admin_note,
      updated_at: new Date().toISOString(),
    })
    .eq("id", requestId)
    .select("*")
    .single();

  if (updateError) throw new Error(updateError.message);
  return updated;
}

export async function rejectPayoutRequest(requestId: string, adminNote?: string) {
  const client = createServiceSupabaseClient();

  const { data: request, error } = await client
    .from("doctor_payout_requests")
    .select("*")
    .eq("id", requestId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!request) throw new Error("Payout request not found");
  if (request.status !== "pending" && request.status !== "approved") {
    throw new Error("Only pending or approved requests can be rejected");
  }
  if (request.status === "rejected") return request;

  const amount = Number(request.amount);

  const { data: wallet } = await client
    .from("doctor_wallets")
    .select("available_balance, pending_balance")
    .eq("doctor_id", request.doctor_id)
    .single();

  await client
    .from("doctor_wallets")
    .update({
      available_balance: Number(wallet?.available_balance ?? 0) + amount,
      pending_balance: Math.max(0, Number(wallet?.pending_balance ?? 0) - amount),
      updated_at: new Date().toISOString(),
    })
    .eq("doctor_id", request.doctor_id);

  await client.from("wallet_transactions").insert({
    doctor_id: request.doctor_id,
    amount,
    is_credit: true,
    type: "payout_release",
    payout_request_id: requestId,
    note: "Payout request rejected — funds returned",
  });

  const { data: updated, error: updateError } = await client
    .from("doctor_payout_requests")
    .update({
      status: "rejected" satisfies PayoutRequestStatus,
      admin_note: adminNote?.trim() || request.admin_note,
      updated_at: new Date().toISOString(),
    })
    .eq("id", requestId)
    .select("*")
    .single();

  if (updateError) throw new Error(updateError.message);
  return updated;
}

export async function completePayoutRequest(requestId: string, adminNote?: string) {
  const client = createServiceSupabaseClient();

  const { data: request, error } = await client
    .from("doctor_payout_requests")
    .select("*")
    .eq("id", requestId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!request) throw new Error("Payout request not found");
  if (request.status === "completed") return request;
  if (request.status !== "approved" && request.status !== "pending") {
    throw new Error("Request cannot be marked paid in current status");
  }

  const amount = Number(request.amount);

  const { data: wallet } = await client
    .from("doctor_wallets")
    .select("pending_balance")
    .eq("doctor_id", request.doctor_id)
    .single();

  await client
    .from("doctor_wallets")
    .update({
      pending_balance: Math.max(0, Number(wallet?.pending_balance ?? 0) - amount),
      updated_at: new Date().toISOString(),
    })
    .eq("doctor_id", request.doctor_id);

  await client.from("wallet_transactions").insert({
    doctor_id: request.doctor_id,
    amount,
    is_credit: false,
    type: "payout_paid",
    payout_request_id: requestId,
    note: "Payout sent to doctor bank account",
  });

  const { data: updated, error: updateError } = await client
    .from("doctor_payout_requests")
    .update({
      status: "completed" satisfies PayoutRequestStatus,
      admin_note: adminNote?.trim() || request.admin_note,
      payment_date: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", requestId)
    .select("*")
    .single();

  if (updateError) throw new Error(updateError.message);
  return updated;
}
