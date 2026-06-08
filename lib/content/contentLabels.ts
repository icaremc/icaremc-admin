import { truncateEntityId } from "@/lib/content/entityId";
import type {
  ContentNamespace,
  ContentTranslation,
  DailyTip,
} from "@/lib/types/database";

function asString(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function truncate(text: string, max = 72): string {
  const trimmed = text.trim();
  if (trimmed.length <= max) return trimmed;
  return `${trimmed.slice(0, max)}…`;
}

function parseBoundedInt(
  value: unknown,
  min: number,
  max: number,
): number | null {
  if (typeof value === "number" && Number.isInteger(value) && value >= min && value <= max) {
    return value;
  }
  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value);
    if (Number.isInteger(parsed) && parsed >= min && parsed <= max) return parsed;
  }
  return null;
}

export function dailyTipWeekNumberFromTip(tip: DailyTip): number {
  return tip.week_number;
}

export function dailyTipDayNumberFromTip(tip: DailyTip): number | null {
  return tip.day_number;
}

export function dailyTipEnContent(tip: DailyTip): string {
  const en = tip.daily_tip_translations?.find((row) => row.language_code === "en");
  return en?.content ?? "";
}

export function dailyTipEnTitle(tip: DailyTip): string {
  const en = tip.daily_tip_translations?.find((row) => row.language_code === "en");
  return en?.title ?? "";
}

export function summarizeDailyTipsByWeek(
  items: DailyTip[],
): Map<number, DailyTipWeekSummary> {
  const summary = new Map<number, DailyTipWeekSummary>();

  for (const item of items) {
    const week = item.week_number;
    const current = summary.get(week) ?? { total: 0, published: 0, daysFilled: 0 };
    current.total += 1;
    if (item.is_active) current.published += 1;
    if (item.day_number !== null) current.daysFilled += 1;
    summary.set(week, current);
  }

  return summary;
}

export function dailyTipPath(id: string): string {
  return `/admin/content/daily_tip/${encodeURIComponent(id)}`;
}

export function dailyTipEditPath(id: string): string {
  return `${dailyTipPath(id)}/edit`;
}

export function dailyTipBackPath(tip: DailyTip | null): string {
  return tip ? dailyTipWeekPath(tip.week_number) : "/admin/content/daily_tip";
}

export function dailyTipListLabel(tip: DailyTip): string {
  const content = dailyTipEnContent(tip);
  return content ? truncate(content) : truncateEntityId(tip.id);
}

export function dailyTipHeroTitle(tip: DailyTip): string {
  const title = dailyTipEnTitle(tip);
  const content = dailyTipEnContent(tip);
  return title || (content ? truncate(content, 48) : "Daily tip");
}

export function dailyTipWeekNumber(item: ContentTranslation): number | null {
  return parseBoundedInt(item.translations?.en?.week_number, 1, 42);
}

export function dailyTipDayNumber(item: ContentTranslation): number | null {
  return parseBoundedInt(item.translations?.en?.day_number, 1, 7);
}

export type DailyTipWeekSummary = {
  total: number;
  published: number;
  daysFilled: number;
};

export function dailyTipWeekPath(weekNumber: number): string {
  return `/admin/content/daily_tip/week/${weekNumber}`;
}

export function dailyTipNewPath(weekNumber?: number, dayNumber?: number): string {
  if (
    weekNumber !== undefined &&
    Number.isInteger(weekNumber) &&
    weekNumber >= 1 &&
    weekNumber <= 42
  ) {
    const base = `/admin/content/daily_tip/week/${weekNumber}/new`;
    if (
      dayNumber !== undefined &&
      Number.isInteger(dayNumber) &&
      dayNumber >= 1 &&
      dayNumber <= 7
    ) {
      return `${base}?day=${dayNumber}`;
    }
    return base;
  }
  return "/admin/content/daily_tip/new";
}

export function contentEntityPath(
  namespace: ContentNamespace,
  entityId: string,
): string {
  return `/admin/content/${namespace}/${encodeURIComponent(entityId)}`;
}

export function contentEditPath(
  namespace: ContentNamespace,
  entityId: string,
): string {
  return `${contentEntityPath(namespace, entityId)}/edit`;
}

export function contentListLabel(
  namespace: ContentNamespace,
  item: ContentTranslation,
): string {
  const en = item.translations?.en ?? {};

  switch (namespace) {
    case "daily_tip": {
      const text = asString(en.text);
      return text ? truncate(text) : truncateEntityId(item.entity_id);
    }
    case "milestone": {
      const label = asString(en.label);
      if (label) return label;
      const months = en.months;
      if (months !== undefined && months !== null && String(months).trim()) {
        return `${String(months)} months`;
      }
      return item.entity_id;
    }
    default:
      return item.entity_id;
  }
}

export function contentHeroTitle(
  namespace: ContentNamespace,
  item: ContentTranslation,
): string {
  const en = item.translations?.en ?? {};

  switch (namespace) {
    case "daily_tip":
      return asString(en.text) || "Daily tip";
    case "milestone":
      return asString(en.label) || `Milestone ${item.entity_id}`;
    default:
      return item.entity_id;
  }
}
