import type { AppointmentStatus } from "@/lib/types/doctors";
import type { PushDeliveryInput } from "@/lib/push/pushDelivery";

export const APPOINTMENT_STATUSES: AppointmentStatus[] = [
  "pending",
  "confirmed",
  "completed",
  "cancelled",
];

export type CancelledBy = "patient" | "doctor" | "admin";

export function formatAppointmentDate(value: string): string {
  const date = new Date(`${value}T12:00:00`);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

export function appointmentStatusPushMessage({
  status,
  doctorName,
  appointmentDate,
  timeSlot,
  cancelledBy,
  amountPaid,
  paymentStatus,
}: {
  status: AppointmentStatus;
  doctorName: string;
  appointmentDate: string;
  timeSlot: string;
  cancelledBy?: CancelledBy | null;
  amountPaid?: number;
  paymentStatus?: string;
}): PushDeliveryInput | null {
  const when = `${formatAppointmentDate(appointmentDate)} at ${timeSlot}`;
  const doctor = doctorName.trim() || "Your doctor";
  const hasRefund =
    (amountPaid ?? 0) > 0 &&
    (paymentStatus === "paid" || paymentStatus === "partial");

  switch (status) {
    case "confirmed":
      return {
        title: "Appointment confirmed",
        body: `${doctor} confirmed your visit on ${when}`,
        route: "/my-appointments",
        type: "booking",
        tab: "3",
      };
    case "completed":
      return {
        title: "Visit completed",
        body: `Your appointment with ${doctor} on ${when} is marked complete`,
        route: "/my-appointments",
        type: "booking",
        tab: "3",
      };
    case "cancelled": {
      let body = "";
      if (cancelledBy === "patient") {
        body = `You cancelled your appointment with ${doctor} on ${when}.`;
      } else if (cancelledBy === "admin") {
        body = `Your appointment with ${doctor} on ${when} was cancelled by support.`;
      } else if (cancelledBy === "doctor") {
        body = `${doctor} cancelled your visit on ${when}.`;
      } else {
        body = `Your appointment with ${doctor} on ${when} was cancelled.`;
      }
      if (hasRefund) {
        body += ` ${Number(amountPaid).toFixed(2)} ETB was credited to your wallet.`;
      }
      return {
        title: "Appointment cancelled",
        body,
        route: "/my-appointments",
        type: "booking",
        tab: "3",
      };
    }
    default:
      return null;
  }
}

export function doctorCancelledPushMessage({
  patientName,
  appointmentDate,
  timeSlot,
  cancelledBy,
}: {
  patientName: string;
  appointmentDate: string;
  timeSlot: string;
  cancelledBy?: CancelledBy | null;
}): PushDeliveryInput {
  const when = `${formatAppointmentDate(appointmentDate)} at ${timeSlot}`;
  const patient = patientName.trim() || "A patient";

  if (cancelledBy === "admin") {
    return {
      title: "Appointment cancelled",
      body: `Support cancelled the booking with ${patient} on ${when}`,
      route: "/main",
      type: "booking",
      tab: "1",
    };
  }

  if (cancelledBy === "doctor") {
    return {
      title: "Appointment cancelled",
      body: `You cancelled the booking with ${patient} on ${when}`,
      route: "/main",
      type: "booking",
      tab: "1",
    };
  }

  return {
    title: "Appointment cancelled",
    body: `${patient} cancelled the booking on ${when}`,
    route: "/main",
    type: "booking",
    tab: "1",
  };
}
