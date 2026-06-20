import type { Appointment, AppointmentStatus } from "@/lib/types/doctors";

export function appointmentStatusClass(status: AppointmentStatus): string {
  const styles: Record<AppointmentStatus, string> = {
    pending: "bg-amber-100 text-amber-800",
    confirmed: "bg-emerald-100 text-emerald-800",
    completed: "bg-gray-100 text-gray-700",
    cancelled: "bg-red-100 text-red-700",
  };
  return styles[status];
}

export function doctorLabel(appt: Appointment): string {
  const doctor = appt.doctor_profiles;
  return doctor ? `Dr. ${doctor.first_name} ${doctor.last_name}` : "Unknown doctor";
}

export function patientLabel(appt: Appointment): string {
  return appt.patient_name ?? appt.profiles?.full_name ?? "Patient";
}

export function patientPhone(appt: Appointment): string | null {
  return appt.patient_phone ?? appt.profiles?.phone ?? null;
}

export function formatMoney(amount: number, currency: string): string {
  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency: currency || "ETB",
      maximumFractionDigits: 0,
    }).format(amount);
  } catch {
    return `${amount} ${currency}`;
  }
}

export function nextStatusActions(status: AppointmentStatus): AppointmentStatus[] {
  switch (status) {
    case "pending":
      return ["confirmed", "cancelled"];
    case "confirmed":
      return ["completed", "cancelled"];
    default:
      return [];
  }
}

export function statusActionLabel(status: AppointmentStatus): string {
  switch (status) {
    case "confirmed":
      return "Confirm";
    case "completed":
      return "Mark complete";
    case "cancelled":
      return "Cancel";
    default:
      return status;
  }
}
