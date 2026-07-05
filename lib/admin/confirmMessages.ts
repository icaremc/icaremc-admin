import type { AppointmentStatus } from "@/lib/types/doctors";
import { formatAppointmentDate } from "@/lib/appointments/status";
import { formatMoney, statusActionLabel } from "@/lib/appointments/display";

export type PayoutAction = "approve" | "reject" | "complete" | "verify";

export function payoutConfirmCopy(params: {
  action: PayoutAction;
  amount: number;
  currency?: string;
  doctorName: string;
}): {
  title: string;
  description: string;
  confirmLabel: string;
  variant: "default" | "danger";
} {
  const amountText = formatMoney(params.amount, params.currency ?? "ETB");
  const doctor = params.doctorName.trim() || "this doctor";

  switch (params.action) {
    case "approve":
      return {
        title: "Allow payout?",
        description: `Allow ${doctor} to receive ${amountText}? Funds stay held until you send payment or mark as paid.`,
        confirmLabel: "Allow payout",
        variant: "default",
      };
    case "reject":
      return {
        title: "Reject payout?",
        description: `Reject the ${amountText} withdrawal request from ${doctor}? The amount will return to their available wallet balance.`,
        confirmLabel: "Reject payout",
        variant: "danger",
      };
    case "complete":
      return {
        title: "Mark as paid?",
        description: `Mark ${amountText} as paid to ${doctor}? Only use this if you sent the money outside Chapa or already confirmed the transfer.`,
        confirmLabel: "Mark as paid",
        variant: "default",
      };
    case "verify":
      return {
        title: "Verify Chapa transfer?",
        description: `Check the latest transfer status with Chapa for ${doctor}'s ${amountText} payout.`,
        confirmLabel: "Verify now",
        variant: "default",
      };
  }
}

export function doctorVerificationConfirmCopy(params: {
  approve: boolean;
  doctorName: string;
}): {
  title: string;
  description: string;
  confirmLabel: string;
  variant: "default" | "danger";
} {
  const name = params.doctorName.trim() || "this doctor";

  if (params.approve) {
    return {
      title: "Approve doctor?",
      description: `${name} will appear as verified in the ICare Doctors app and can receive patients on ICare MC. A push notification will be sent if enabled.`,
      confirmLabel: "Approve doctor",
      variant: "default",
    };
  }

  return {
    title: "Revoke doctor approval?",
    description: `${name} will no longer appear as verified. They will not receive new patient bookings until approved again.`,
    confirmLabel: "Revoke approval",
    variant: "danger",
  };
}

export function appointmentStatusConfirmCopy(params: {
  nextStatus: AppointmentStatus;
  currentStatus: AppointmentStatus;
  patientName: string;
  doctorName: string;
  appointmentDate: string;
  timeSlot: string;
}): {
  title: string;
  description: string;
  confirmLabel: string;
  variant: "default" | "danger";
} {
  const when = `${formatAppointmentDate(params.appointmentDate)} at ${params.timeSlot}`;
  const patient = params.patientName.trim() || "the patient";
  const doctor = params.doctorName.trim() || "the doctor";
  const action = statusActionLabel(params.nextStatus);

  if (params.nextStatus === "cancelled") {
    return {
      title: "Cancel appointment?",
      description: `Cancel the visit for ${patient} with ${doctor} on ${when}? Both parent and doctor may receive a push notification.`,
      confirmLabel: action,
      variant: "danger",
    };
  }

  if (params.nextStatus === "completed") {
    return {
      title: "Mark appointment completed?",
      description: `Mark the visit for ${patient} with ${doctor} on ${when} as completed? The doctor wallet may be credited if payment was received.`,
      confirmLabel: action,
      variant: "default",
    };
  }

  return {
    title: `${action}?`,
    description: `Change appointment for ${patient} with ${doctor} on ${when} from ${params.currentStatus} to ${params.nextStatus}.`,
    confirmLabel: action,
    variant: params.nextStatus === "confirmed" ? "default" : "default",
  };
}
