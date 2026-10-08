import type { DoctorAvailabilitySlot } from "@/lib/types/doctors";

const DAY_NAMES = ["", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function formatDbTime(raw: string): string {
  const [hourPart, minutePart] = raw.split(":");
  const hour = Number.parseInt(hourPart, 10);
  const minute = Number.parseInt(minutePart, 10);
  if (Number.isNaN(hour) || Number.isNaN(minute)) return raw;

  const period = hour >= 12 ? "PM" : "AM";
  const hour12 = hour % 12 === 0 ? 12 : hour % 12;
  if (minute === 0) return `${hour12} ${period}`;
  return `${hour12}:${minute.toString().padStart(2, "0")} ${period}`;
}

function dartWeekdayFromJs(date: Date): number {
  const jsDay = date.getDay();
  return jsDay === 0 ? 7 : jsDay;
}

function activeSlots(
  slots: DoctorAvailabilitySlot[] | undefined,
): DoctorAvailabilitySlot[] {
  if (!slots?.length) return [];
  return slots
    .filter((slot) => slot.is_active)
    .sort((a, b) => {
      if (a.day_of_week !== b.day_of_week) {
        return a.day_of_week - b.day_of_week;
      }
      return a.start_time.localeCompare(b.start_time);
    });
}

/** Backend often sends a free-text `availability` when slot rows are absent. */
export function summarizeAvailabilitySlots(
  slots: DoctorAvailabilitySlot[] | undefined,
  fallbackText?: string | null,
): string {
  const active = activeSlots(slots);
  if (active.length) {
    return active
      .map(
        (slot) =>
          `${DAY_NAMES[slot.day_of_week]} ${formatDbTime(slot.start_time)}-${formatDbTime(slot.end_time)}`,
      )
      .join(" · ");
  }
  const text = fallbackText?.trim();
  return text || "No hours set";
}

export function activeSlotCount(
  slots: DoctorAvailabilitySlot[] | undefined,
  fallbackText?: string | null,
): number {
  const count = activeSlots(slots).length;
  if (count > 0) return count;
  return fallbackText?.trim() ? 1 : 0;
}

export function hasSlotsToday(
  slots: DoctorAvailabilitySlot[] | undefined,
  availableToday?: boolean | null,
): boolean {
  if (slots?.length) {
    const today = dartWeekdayFromJs(new Date());
    if (slots.some((slot) => slot.is_active && slot.day_of_week === today)) {
      return true;
    }
  }
  return availableToday === true;
}
