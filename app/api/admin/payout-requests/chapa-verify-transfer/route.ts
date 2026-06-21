import { NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/adminAuth";
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
import { createServiceSupabaseClient } from "@/lib/supabase/service";

export async function POST(request: Request) {
  const auth = await requireAdminSession();
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
      .select("*")
      .eq("id", body.payoutRequestId)
      .maybeSingle();

    if (payoutError || !payoutRequest) {
      return NextResponse.json({ error: "Payout request not found" }, { status: 404 });
    }

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

    if (isSuccess) {
      await completePayoutRequest(payoutRequest.id, updatedAdminNote);
    } else if (
      ["failed", "failure", "cancelled", "canceled", "error", "reversed"].includes(
        transferStatus,
      )
    ) {
      await rejectPayoutRequest(
        payoutRequest.id,
        appendAdminNote(updatedAdminNote, "Chapa transfer failed during verification."),
      );
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
