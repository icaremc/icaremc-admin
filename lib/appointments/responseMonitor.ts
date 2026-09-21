import type { Appointment } from "@/lib/types/doctors";

/** Expected doctor confirmation window after a patient books. */
export const DOCTOR_RESPONSE_SLA_HOURS = 24;

export type DoctorResponseState = "awaiting" | "overdue" | "on_time" | "late" | "unanswered";

export type DoctorResponseInfo = {
  state: DoctorResponseState;
  label: string;
  hours: number | null;
  respondedAt: string | null;
};

function hoursBetween(fromIso: string, toIso: string): number {
  const from = new Date(fromIso).getTime();
  const to = new Date(toIso).getTime();
  if (Number.isNaN(from) || Number.isNaN(to)) return 0;
  return Math.max(0, (to - from) / (1000 * 60 * 60));
}

function formatHours(hours: number): string {
  if (hours < 1) return `${Math.round(hours * 60)}m`;
  if (hours < 48) return `${hours.toFixed(hours < 10 ? 1 : 0)}h`;
  return `${(hours / 24).toFixed(1)}d`;
}

export function resolveRespondedAt(
  appt: Pick<Appointment, "status" | "confirmed_at" | "updated_at">,
): string | null {
  if (appt.confirmed_at) return appt.confirmed_at;
  if (appt.status === "confirmed" || appt.status === "completed") {
    return appt.updated_at ?? null;
  }
  return null;
}

export function getDoctorResponseInfo(
  appt: Pick<Appointment, "status" | "created_at" | "confirmed_at" | "updated_at">,
  now: Date = new Date(),
  slaHours: number = DOCTOR_RESPONSE_SLA_HOURS,
): DoctorResponseInfo {
  const respondedAt = resolveRespondedAt(appt);

  if (appt.status === "pending") {
    const waitingHours = hoursBetween(appt.created_at, now.toISOString());
    if (waitingHours > slaHours) {
      return {
        state: "overdue",
        label: `Overdue · ${formatHours(waitingHours)}`,
        hours: waitingHours,
        respondedAt: null,
      };
    }
    return {
      state: "awaiting",
      label: `Awaiting · ${formatHours(waitingHours)}`,
      hours: waitingHours,
      respondedAt: null,
    };
  }

  if (appt.status === "cancelled" && !respondedAt) {
    return {
      state: "unanswered",
      label: "Unanswered",
      hours: null,
      respondedAt: null,
    };
  }

  if (!respondedAt) {
    return {
      state: "unanswered",
      label: "No response time",
      hours: null,
      respondedAt: null,
    };
  }

  const responseHours = hoursBetween(appt.created_at, respondedAt);
  if (responseHours <= slaHours) {
    return {
      state: "on_time",
      label: `On time · ${formatHours(responseHours)}`,
      hours: responseHours,
      respondedAt,
    };
  }

  return {
    state: "late",
    label: `Late · ${formatHours(responseHours)}`,
    hours: responseHours,
    respondedAt,
  };
}

export function doctorResponseBadgeClass(state: DoctorResponseState): string {
  switch (state) {
    case "awaiting":
      return "bg-amber-50 text-amber-800";
    case "overdue":
      return "bg-red-50 text-red-700";
    case "on_time":
      return "bg-emerald-50 text-emerald-700";
    case "late":
      return "bg-orange-50 text-orange-800";
    case "unanswered":
      return "bg-gray-100 text-gray-600";
  }
}
