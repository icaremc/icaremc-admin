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

export function summarizeAvailabilitySlots(
  slots: DoctorAvailabilitySlot[] | undefined,
): string {
  if (!slots?.length) return "No hours set";

  const active = slots
    .filter((slot) => slot.is_active)
    .sort((a, b) => {
      if (a.day_of_week !== b.day_of_week) {
        return a.day_of_week - b.day_of_week;
      }
      return a.start_time.localeCompare(b.start_time);
    });

  if (!active.length) return "No hours set";

  return active
    .map(
      (slot) =>
        `${DAY_NAMES[slot.day_of_week]} ${formatDbTime(slot.start_time)}–${formatDbTime(slot.end_time)}`,
    )
    .join(" · ");
}

export function activeSlotCount(
  slots: DoctorAvailabilitySlot[] | undefined,
): number {
  return slots?.filter((slot) => slot.is_active).length ?? 0;
}

export function hasSlotsToday(
  slots: DoctorAvailabilitySlot[] | undefined,
): boolean {
  if (!slots?.length) return false;
  const today = dartWeekdayFromJs(new Date());
  return slots.some((slot) => slot.is_active && slot.day_of_week === today);
}
