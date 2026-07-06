import { NextResponse } from "next/server";
import {
  appendAdminNote,
  loadChapaSettings,
  mapChapaTransferStatus,
  toErrorMessage,
  verifyChapaWebhookSignature,
} from "@/lib/finance/chapaPayout";
import {
  completePayoutRequest,
  rejectPayoutRequest,
} from "@/lib/finance/payoutActions";
import { notifyDoctorPayoutStatus } from "@/lib/finance/payoutNotify";
import { createServiceSupabaseClient } from "@/lib/supabase/service";

export const runtime = "nodejs";

type ChapaWebhookPayload = {
  event?: string;
  status?: string;
  tx_ref?: string;
  reference?: string;
  transfer_id?: string;
  data?: {
    tx_ref?: string;
    reference?: string;
    transfer_id?: string;
    status?: string;
  };
};

function resolveReference(payload: ChapaWebhookPayload): string {
  return (
    payload.reference?.trim() ||
    payload.tx_ref?.trim() ||
    payload.data?.reference?.trim() ||
    payload.data?.tx_ref?.trim() ||
    ""
  );
}

function resolveTransferStatus(payload: ChapaWebhookPayload): string {
  return (
    payload.data?.status ||
    payload.status ||
    payload.event ||
    ""
  ).toLowerCase();
}

export async function POST(request: Request) {
  try {
    const rawBody = await request.text();
    const { secretKey } = await loadChapaSettings();
    if (!verifyChapaWebhookSignature(request, rawBody, secretKey)) {
      return NextResponse.json({ error: "Invalid webhook signature" }, { status: 401 });
    }

    const payload = JSON.parse(rawBody) as ChapaWebhookPayload;
    const reference = resolveReference(payload);
    if (!reference) {
      return NextResponse.json(
        { error: "Missing reference/tx_ref in webhook payload" },
        { status: 400 },
      );
    }

    const transferStatus = resolveTransferStatus(payload);
    const nextStatus = mapChapaTransferStatus(transferStatus);

    const client = createServiceSupabaseClient();
    const { data: payoutRequest, error: lookupError } = await client
      .from("doctor_payout_requests")
      .select("*")
      .ilike("admin_note", `%reference=${reference}%`)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (lookupError) {
      return NextResponse.json({ error: lookupError.message }, { status: 500 });
    }
    if (!payoutRequest) {
      return NextResponse.json(
        { error: `No payout request found for reference "${reference}"` },
        { status: 404 },
      );
    }

    const transferId = payload.transfer_id || payload.data?.transfer_id;
    const webhookNote = `Chapa webhook update. reference=${reference} status=${transferStatus || "unknown"}${
      transferId ? ` transfer_id=${transferId}` : ""
    }`;
    const updatedAdminNote = appendAdminNote(payoutRequest.admin_note, webhookNote);

    if (nextStatus === "completed") {
      await completePayoutRequest(payoutRequest.id, updatedAdminNote);
      await notifyDoctorPayoutStatus(client, {
        doctorId: payoutRequest.doctor_id,
        event: "completed",
        amount: Number(payoutRequest.amount),
      });
    } else if (nextStatus === "rejected") {
      await rejectPayoutRequest(
        payoutRequest.id,
        appendAdminNote(updatedAdminNote, "Chapa transfer rejected by webhook."),
      );
      await notifyDoctorPayoutStatus(client, {
        doctorId: payoutRequest.doctor_id,
        event: "rejected",
        amount: Number(payoutRequest.amount),
      });
    } else {
      await client
        .from("doctor_payout_requests")
        .update({
          admin_note: updatedAdminNote,
          updated_at: new Date().toISOString(),
        })
        .eq("id", payoutRequest.id);
    }

    const { data: refreshed } = await client
      .from("doctor_payout_requests")
      .select("id, status")
      .eq("id", payoutRequest.id)
      .maybeSingle();

    return NextResponse.json({
      status: "ok",
      payoutRequestId: payoutRequest.id,
      paymentStatus: refreshed?.status ?? nextStatus,
      reference,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : toErrorMessage(error, "Webhook error") },
      { status: 500 },
    );
  }
}
