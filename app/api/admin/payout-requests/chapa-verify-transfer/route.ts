import { NextResponse } from "next/server";
import { ADMIN_ACTIVITY_EVENTS } from "@/lib/activity/events";
import { chapaVerifyEventLabel } from "@/lib/activity/buildLog";
import { logAdminActivityFromAuth } from "@/lib/activity/logFromAuth";
import { requireAdminPermission } from "@/lib/adminAuth";
import {
  appendAdminNote,
  extractChapaReference,
  loadChapaSettings,
  toErrorMessage,
} from "@/lib/finance/chapaPayout";
import {
  completePayoutRequest,
  rejectPayoutRequest,
} from "@/lib/finance/payoutActions";
import { notifyDoctorPayoutStatus } from "@/lib/finance/payoutNotify";
import { createServiceSupabaseClient } from "@/lib/supabase/service";

export async function POST(request: Request) {
  const auth = await requireAdminPermission("manage_finance");
  if ("error" in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  try {
    const { enabled, secretKey } = await loadChapaSettings();
    if (!enabled) {
      return NextResponse.json(
        { error: "Chapa is disabled in payment settings" },
        { status: 400 },
      );
    }
    if (!secretKey) {
      return NextResponse.json({ error: "Missing Chapa secret key" }, { status: 500 });
    }

    const body = (await request.json()) as { payoutRequestId?: string };
    if (!body.payoutRequestId) {
      return NextResponse.json({ error: "payoutRequestId is required" }, { status: 400 });
    }

    const client = createServiceSupabaseClient();
    const { data: payoutRequest, error: payoutError } = await client
      .from("doctor_payout_requests")
      .select("*, doctor_profiles(first_name, last_name)")
      .eq("id", body.payoutRequestId)
      .maybeSingle();

    if (payoutError || !payoutRequest) {
      return NextResponse.json({ error: "Payout request not found" }, { status: 404 });
    }

    const doctorProfile = payoutRequest.doctor_profiles as
      | { first_name: string; last_name: string }
      | { first_name: string; last_name: string }[]
      | null
      | undefined;
    const profile = Array.isArray(doctorProfile) ? doctorProfile[0] : doctorProfile;
    const doctorName = profile
      ? `Dr. ${profile.first_name} ${profile.last_name}`.trim()
      : null;
    const amount = Number(payoutRequest.amount);

    const reference = extractChapaReference(payoutRequest.admin_note);
    if (!reference) {
      return NextResponse.json(
        { error: "Transfer reference not found on this payout request" },
        { status: 400 },
      );
    }

    const verifyResponse = await fetch(
      `https://api.chapa.co/v1/transfers/verify/${reference}`,
      {
        method: "GET",
        headers: { Authorization: `Bearer ${secretKey}` },
      },
    );

    const verifyPayload = (await verifyResponse.json()) as {
      status?: string;
      message?: unknown;
      data?: { status?: string };
    };

    if (!verifyResponse.ok) {
      return NextResponse.json(
        {
          error: toErrorMessage(verifyPayload.message, "Failed to verify Chapa transfer"),
          details: verifyPayload,
        },
        { status: 400 },
      );
    }

    const verifyStatus = (verifyPayload.status ?? "").toLowerCase();
    const transferStatus = (verifyPayload.data?.status ?? verifyStatus).toLowerCase();
    const isSuccess =
      verifyStatus === "success" ||
      ["success", "successful", "completed", "paid"].includes(transferStatus);

    const noteLine = `Chapa verify checked. reference=${reference} status=${transferStatus || verifyStatus || "unknown"}`;
    const updatedAdminNote = appendAdminNote(payoutRequest.admin_note, noteLine);
    let verifyResult = transferStatus || verifyStatus || "unknown";

    if (isSuccess) {
      await completePayoutRequest(payoutRequest.id, updatedAdminNote);
      await notifyDoctorPayoutStatus(client, {
        doctorId: payoutRequest.doctor_id,
        event: "completed",
        amount,
      });
      verifyResult = "completed";
    } else if (
      ["failed", "failure", "cancelled", "canceled", "error", "reversed"].includes(
        transferStatus,
      )
    ) {
      await rejectPayoutRequest(
        payoutRequest.id,
        appendAdminNote(updatedAdminNote, "Chapa transfer failed during verification."),
      );
      await notifyDoctorPayoutStatus(client, {
        doctorId: payoutRequest.doctor_id,
        event: "rejected",
        amount,
      });
      verifyResult = "rejected";
    } else {
      await client
        .from("doctor_payout_requests")
        .update({
          admin_note: updatedAdminNote,
          updated_at: new Date().toISOString(),
        })
        .eq("id", payoutRequest.id);
      verifyResult = "pending";
    }

    await logAdminActivityFromAuth(
      auth,
      {
        eventType: ADMIN_ACTIVITY_EVENTS.PAYOUT_ACTION,
        eventLabel: chapaVerifyEventLabel({
          amount,
          doctorName,
          reference,
          result: verifyResult,
        }),
        resourceType: "payout_request",
        resourceId: payoutRequest.id,
        metadata: {
          action: "chapa_verify",
          amount,
          currency: "ETB",
          doctor_id: payoutRequest.doctor_id,
          doctor_name: doctorName,
          reference,
          transfer_status: transferStatus || verifyStatus || "unknown",
          verify_result: verifyResult,
        },
      },
      request,
    );

    const { data: refreshed } = await client
      .from("doctor_payout_requests")
      .select("*")
      .eq("id", payoutRequest.id)
      .maybeSingle();

    return NextResponse.json({
      status: "ok",
      reference,
      verify: verifyPayload,
      updatedStatus: refreshed?.status ?? payoutRequest.status,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unexpected verify error" },
      { status: 500 },
    );
  }
}
