import type { DailyTip } from "@/lib/types/database";
import { dailyTipTranslationTitles } from "@/lib/content/contentLabels";

export type DailyTipTrimester = 1 | 2 | 3;

export const DAILY_TIP_TRIMESTERS: {
  id: DailyTipTrimester;
  label: string;
  range: string;
  weeks: number[];
}[] = [
  {
    id: 1,
    label: "First trimester",
    range: "Weeks 1–13",
    weeks: Array.from({ length: 13 }, (_, i) => i + 1),
  },
  {
    id: 2,
    label: "Second trimester",
    range: "Weeks 14–27",
    weeks: Array.from({ length: 14 }, (_, i) => i + 14),
  },
  {
    id: 3,
    label: "Third trimester",
    range: "Weeks 28–42",
    weeks: Array.from({ length: 15 }, (_, i) => i + 28),
  },
];

export function dailyTipTrimesterForWeek(week: number): DailyTipTrimester {
  if (week <= 13) return 1;
  if (week <= 27) return 2;
  return 3;
}

export function dailyTipAdjacentWeek(
  week: number,
  delta: -1 | 1,
): number | null {
  const next = week + delta;
  if (next < 1 || next > 42) return null;
  return next;
}

export function dailyTipMatchesSearch(tip: DailyTip, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;

  if (`week ${tip.week_number}`.includes(q)) return true;
  if (tip.day_number != null && `day ${tip.day_number}`.includes(q)) {
    return true;
  }

  const titles = dailyTipTranslationTitles(tip);
  return titles.some((row) => row.title.toLowerCase().includes(q));
}

export function dailyTipLocaleCount(tip: DailyTip): number {
  return dailyTipTranslationTitles(tip).length;
}
