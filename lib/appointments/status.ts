import type { AppointmentStatus } from "@/lib/types/doctors";
import type { PushDeliveryInput } from "@/lib/push/pushDelivery";

export const APPOINTMENT_STATUSES: AppointmentStatus[] = [
  "pending",
  "confirmed",
  "completed",
  "cancelled",
];

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
}: {
  status: AppointmentStatus;
  doctorName: string;
  appointmentDate: string;
  timeSlot: string;
}): PushDeliveryInput | null {
  const when = `${formatAppointmentDate(appointmentDate)} at ${timeSlot}`;
  const doctor = doctorName.trim() || "Your doctor";

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
    case "cancelled":
      return {
        title: "Appointment cancelled",
        body: `Your appointment with ${doctor} on ${when} was cancelled`,
        route: "/my-appointments",
        type: "booking",
        tab: "3",
      };
    default:
      return null;
  }
}

export function doctorCancelledPushMessage({
  patientName,
  appointmentDate,
  timeSlot,
}: {
  patientName: string;
  appointmentDate: string;
  timeSlot: string;
}): PushDeliveryInput {
  const when = `${formatAppointmentDate(appointmentDate)} at ${timeSlot}`;
  const patient = patientName.trim() || "A patient";
  return {
    title: "Appointment cancelled",
    body: `${patient} cancelled the booking on ${when}`,
    route: "/main",
    type: "booking",
    tab: "1",
  };
}
