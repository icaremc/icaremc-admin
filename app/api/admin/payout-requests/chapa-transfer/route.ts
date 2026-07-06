import { NextResponse } from "next/server";
import { ADMIN_ACTIVITY_EVENTS } from "@/lib/activity/events";
import { chapaTransferEventLabel } from "@/lib/activity/buildLog";
import { logAdminActivityFromAuth } from "@/lib/activity/logFromAuth";
import { requireAdminPermission } from "@/lib/adminAuth";
import {
  appendAdminNote,
  buildPayoutTxRef,
  getDoctorDefaultPayoutMethod,
  getDoctorPayoutMethod,
  hasChapaReference,
  isDigitsOnly,
  loadChapaSettings,
  maskAccountNumber,
  normalizeAccountNumber,
  resolveNumericBankCode,
  resolveWebhookUrl,
  toErrorMessage,
} from "@/lib/finance/chapaPayout";
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
      .select("*")
      .eq("id", body.payoutRequestId)
      .maybeSingle();

    if (payoutError || !payoutRequest) {
      return NextResponse.json({ error: "Payout request not found" }, { status: 404 });
    }

    if (payoutRequest.status !== "approved") {
      return NextResponse.json(
        { error: `Payout status "${payoutRequest.status}" cannot be sent. Approve the request first.` },
        { status: 400 },
      );
    }

    if (hasChapaReference(payoutRequest.admin_note)) {
      return NextResponse.json(
        { error: "A Chapa transfer was already initiated for this payout request" },
        { status: 400 },
      );
    }

    const method =
      (await getDoctorPayoutMethod(payoutRequest.payout_method_id)) ??
      (await getDoctorDefaultPayoutMethod(payoutRequest.doctor_id));
    if (!method) {
      return NextResponse.json(
        { error: "Doctor payout method not found. Ask the doctor to save bank details." },
        { status: 400 },
      );
    }

    const bankName = method.bank_name.trim();
    const accountNumber = normalizeAccountNumber(method.account_number);
    const holderName = method.holder_name.trim();
    const missingFields = [
      !holderName ? "holder_name" : "",
      !accountNumber ? "account_number" : "",
      !bankName ? "bank_name" : "",
    ].filter(Boolean);

    if (missingFields.length > 0) {
      return NextResponse.json(
        { error: `Payout method is incomplete: missing ${missingFields.join(", ")}` },
        { status: 400 },
      );
    }

    const storedBankCode = (method.bank_code ?? "").trim();
    const swiftCode = (method.swift_code ?? "").trim();
    if (!storedBankCode && !swiftCode) {
      return NextResponse.json(
        {
          error:
            "Bank code is missing. Store numeric Chapa bank id in bank_code (or swift_code as fallback).",
        },
        { status: 400 },
      );
    }

    const txRef = buildPayoutTxRef(payoutRequest.id);
    const resolvedBank = await resolveNumericBankCode({
      secretKey,
      storedBankCode,
      swiftCode,
      bankName,
    });

    if (!isDigitsOnly(accountNumber)) {
      return NextResponse.json(
        { error: "Account number must contain only digits for bank transfer." },
        { status: 400 },
      );
    }

    const chapaBank = resolvedBank.bank;
    if (
      typeof chapaBank?.acct_length === "number" &&
      chapaBank.acct_length > 0 &&
      accountNumber.length !== chapaBank.acct_length
    ) {
      return NextResponse.json(
        {
          error: `Invalid account number length for ${chapaBank.name ?? bankName}. Expected ${chapaBank.acct_length} digits.`,
        },
        { status: 400 },
      );
    }

    const payload = {
      account_name: holderName,
      account_number: accountNumber,
      bank_code: resolvedBank.bankCode,
      amount: String(payoutRequest.amount),
      currency: method.currency || "ETB",
      reference: txRef,
      webhook_url: resolveWebhookUrl(request),
    };

    const chapaResponse = await fetch("https://api.chapa.co/v1/transfers", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${secretKey}`,
      },
      body: JSON.stringify(payload),
    });

    const chapaData = (await chapaResponse.json()) as {
      status?: string;
      message?: unknown;
      data?: { transfer_id?: string; reference?: string; status?: string };
    };

    if (!chapaResponse.ok || chapaData.status !== "success") {
      return NextResponse.json(
        {
          error: toErrorMessage(chapaData.message, "Failed to create Chapa transfer"),
          details: chapaData,
        },
        { status: 400 },
      );
    }

    const transferReference = chapaData.data?.reference || txRef;
    const transferId = chapaData.data?.transfer_id || "";
    const notePart = `Chapa transfer sent. reference=${transferReference}${
      transferId ? ` transfer_id=${transferId}` : ""
    }`;

    const { error: updateError } = await client
      .from("doctor_payout_requests")
      .update({
        admin_note: appendAdminNote(payoutRequest.admin_note, notePart),
        updated_at: new Date().toISOString(),
      })
      .eq("id", payoutRequest.id);

    if (updateError) {
      return NextResponse.json({ error: "Failed to update payout request" }, { status: 500 });
    }

    const { data: doctorProfile } = await client
      .from("doctor_profiles")
      .select("first_name, last_name")
      .eq("id", payoutRequest.doctor_id)
      .maybeSingle();
    const resolvedDoctorName = doctorProfile
      ? `Dr. ${doctorProfile.first_name} ${doctorProfile.last_name}`.trim()
      : holderName;

    await logAdminActivityFromAuth(
      auth,
      {
        eventType: ADMIN_ACTIVITY_EVENTS.PAYOUT_ACTION,
        eventLabel: chapaTransferEventLabel({
          amount: Number(payoutRequest.amount),
          doctorName: resolvedDoctorName,
          currency: method.currency || "ETB",
          txRef: transferReference,
        }),
        resourceType: "payout_request",
        resourceId: payoutRequest.id,
        metadata: {
          action: "chapa_transfer",
          amount: Number(payoutRequest.amount),
          currency: method.currency || "ETB",
          doctor_id: payoutRequest.doctor_id,
          doctor_name: resolvedDoctorName,
          bank_name: bankName,
          account_number_masked: accountNumber.slice(-4).padStart(accountNumber.length, "*"),
          tx_ref: transferReference,
          transfer_id: transferId,
        },
      },
      request,
    );

    await notifyDoctorPayoutStatus(client, {
      doctorId: payoutRequest.doctor_id,
      event: "transfer_initiated",
      amount: Number(payoutRequest.amount),
      currency: method.currency || "ETB",
    });

    return NextResponse.json({
      status: "success",
      tx_ref: transferReference,
      transfer_id: transferId,
      message: "Chapa payout transfer initiated. Waiting for confirmation.",
      destination: {
        holder_name: holderName,
        bank_name: bankName,
        account_number: maskAccountNumber(accountNumber),
      },
      amount: payoutRequest.amount,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unexpected payout error" },
      { status: 500 },
    );
  }
}
