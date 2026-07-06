import { formatMoney } from "@/lib/appointments/display";

export function payoutActionEventLabel(params: {
  action: "approve" | "reject" | "complete";
  amount: number;
  doctorName?: string | null;
  currency?: string;
}): string {
  const { action, amount, doctorName, currency = "ETB" } = params;
  const amountText = formatMoney(amount, currency);
  const doctorText = doctorName?.trim() ? ` for ${doctorName.trim()}` : "";

  switch (action) {
    case "approve":
      return `Approved payout of ${amountText}${doctorText}`;
    case "reject":
      return `Rejected payout of ${amountText}${doctorText}`;
    case "complete":
      return `Marked payout of ${amountText} as paid${doctorText}`;
  }
}

export function chapaTransferEventLabel(params: {
  amount: number;
  doctorName?: string | null;
  currency?: string;
  txRef?: string;
}): string {
  const amountText = formatMoney(params.amount, params.currency ?? "ETB");
  const doctorText = params.doctorName?.trim() ? ` to ${params.doctorName.trim()}` : "";
  return `Sent Chapa bank transfer of ${amountText}${doctorText}`;
}

export function chapaVerifyEventLabel(params: {
  amount: number;
  doctorName?: string | null;
  currency?: string;
  reference?: string;
  result: string;
}): string {
  const amountText = formatMoney(params.amount, params.currency ?? "ETB");
  const doctorText = params.doctorName?.trim() ? ` for ${params.doctorName.trim()}` : "";
  const referenceText = params.reference?.trim() ? ` (${params.reference.trim()})` : "";
  return `Verified Chapa transfer of ${amountText}${doctorText}${referenceText}: ${params.result}`;
}

export function appointmentStatusEventLabel(params: {
  previousStatus: string;
  newStatus: string;
  patientName?: string | null;
  appointmentDate?: string | null;
  timeSlot?: string | null;
}): string {
  const patient = params.patientName?.trim();
  const when =
    params.appointmentDate && params.timeSlot
      ? ` on ${params.appointmentDate} at ${params.timeSlot}`
      : params.appointmentDate
        ? ` on ${params.appointmentDate}`
        : "";

  if (patient) {
    return `Changed appointment for ${patient}${when}: ${params.previousStatus} to ${params.newStatus}`;
  }

  return `Changed appointment status: ${params.previousStatus} to ${params.newStatus}`;
}

export function doctorVerificationEventLabel(params: {
  isVerified: boolean;
  firstName?: string | null;
  lastName?: string | null;
}): string {
  const name = [params.firstName, params.lastName].filter(Boolean).join(" ").trim() || "doctor";
  return params.isVerified
    ? `Approved doctor account: Dr. ${name}`
    : `Revoked approval for Dr. ${name}`;
}

export function settingsUpdatedEventLabel(scope: string, detail?: string): string {
  return detail ? `Updated ${scope}: ${detail}` : `Updated ${scope}`;
}
