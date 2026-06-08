/** Gestational age from LNMP (pregnancy start) or EDD — mirrors Supabase SQL helpers. */

const FULL_TERM_DAYS = 40 * 7;
const MIN_WEEK = 1;
const MAX_WEEK = 42;

function parseDateOnly(value: string | null | undefined): Date | null {
  if (!value) return null;
  const d = new Date(`${value}T00:00:00`);
  return Number.isNaN(d.getTime()) ? null : d;
}

function dateOnly(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function daysBetween(from: Date, to: Date): number {
  const ms = dateOnly(to).getTime() - dateOnly(from).getTime();
  return Math.floor(ms / (24 * 60 * 60 * 1000));
}

export type GestationalAge = {
  week: number;
  dayInWeek: number;
  totalDays: number;
};

export function gestationalDays(
  pregnancyStartDate: string | null | undefined,
  dueDate: string | null | undefined,
  reference: Date = new Date(),
): number | null {
  const start = parseDateOnly(pregnancyStartDate);
  if (start) {
    return Math.max(0, daysBetween(start, reference));
  }

  const edd = parseDateOnly(dueDate);
  if (edd) {
    const impliedStart = new Date(edd);
    impliedStart.setDate(impliedStart.getDate() - FULL_TERM_DAYS);
    return Math.max(0, daysBetween(impliedStart, reference));
  }

  return null;
}

export function gestationalAge(
  pregnancyStartDate: string | null | undefined,
  dueDate: string | null | undefined,
  reference: Date = new Date(),
): GestationalAge | null {
  const totalDays = gestationalDays(pregnancyStartDate, dueDate, reference);
  if (totalDays === null) return null;

  const week = Math.min(
    MAX_WEEK,
    Math.max(MIN_WEEK, Math.floor(totalDays / 7) + 1),
  );
  const dayInWeek = (totalDays % 7) + 1;

  return { week, dayInWeek, totalDays };
}

export function formatGestationalAge(age: GestationalAge): string {
  return `Week ${age.week}, day ${age.dayInWeek}`;
}
