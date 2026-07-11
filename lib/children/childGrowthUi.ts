import type {
  Child,
  ChildGrowthMeasurement,
  ChildGrowthPeriod,
  ChildMilestoneCheck,
} from "@/lib/types/database";
import {
  parseMilestoneItemKey,
  type MilestoneAnswerStatus,
} from "@/lib/children/childUi";

export function ageMonthsAtDate(
  birthDate: string,
  measuredOn: string,
): number {
  const birth = new Date(`${birthDate}T00:00:00`);
  const measured = new Date(`${measuredOn}T00:00:00`);
  if (Number.isNaN(birth.getTime()) || Number.isNaN(measured.getTime())) {
    return 0;
  }
  const days =
    (measured.getTime() - birth.getTime()) / (1000 * 60 * 60 * 24);
  return Math.max(0, Math.round((days / 30.4375) * 100) / 100);
}

export function measurementAgeMonths(
  child: Child,
  measurement: ChildGrowthMeasurement,
): number {
  if (measurement.age_months != null && Number.isFinite(measurement.age_months)) {
    return Number(measurement.age_months);
  }
  return ageMonthsAtDate(child.birth_date, measurement.measured_on);
}

export type ResolvedMilestoneCheck = {
  id: string;
  itemKey: string;
  status: MilestoneAnswerStatus;
  ageMonths: number | null;
  categoryTitle: string | null;
  itemLabel: string | null;
  displayLabel: string;
  createdAt: string;
};

export function resolveMilestoneCheck(
  check: ChildMilestoneCheck,
  periods: ChildGrowthPeriod[],
): ResolvedMilestoneCheck {
  const parsed = parseMilestoneItemKey(check.item_key);
  const parts = parsed.key.split("-");
  let ageMonths: number | null = null;
  let categoryTitle: string | null = null;
  let itemLabel: string | null = null;

  if (parts.length === 3 && parts.every((p) => /^\d+$/.test(p))) {
    const [month, categoryIndex, itemIndex] = parts.map(Number);
    ageMonths = month!;
    const period = periods.find((p) => p.age_months === month);
    const translation =
      period?.child_growth_period_translations?.find(
        (row) => row.language_code === "en",
      ) ?? period?.child_growth_period_translations?.[0];
    const category = translation?.milestones?.[categoryIndex!];
    categoryTitle = category?.title?.trim() || null;
    const item = category?.items?.[itemIndex!];
    if (typeof item === "string") {
      itemLabel = item;
    } else if (item && typeof item === "object") {
      itemLabel = item.label?.trim() || null;
    }
  }

  const displayLabel =
    itemLabel ??
    (ageMonths != null
      ? `Month ${ageMonths}${categoryTitle ? ` · ${categoryTitle}` : ""}`
      : parsed.key);

  return {
    id: check.id,
    itemKey: parsed.key,
    status: parsed.status,
    ageMonths,
    categoryTitle,
    itemLabel,
    displayLabel,
    createdAt: check.created_at,
  };
}

export function groupResolvedMilestonesByAge(
  checks: ResolvedMilestoneCheck[],
): { ageMonths: number | null; label: string; items: ResolvedMilestoneCheck[] }[] {
  const map = new Map<number | null, ResolvedMilestoneCheck[]>();
  for (const check of checks) {
    const key = check.ageMonths;
    const list = map.get(key) ?? [];
    list.push(check);
    map.set(key, list);
  }

  return [...map.entries()]
    .sort((a, b) => {
      if (a[0] == null) return 1;
      if (b[0] == null) return -1;
      return a[0] - b[0];
    })
    .map(([ageMonths, items]) => ({
      ageMonths,
      label: ageMonths == null ? "Other" : `${ageMonths} months`,
      items: items.sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      ),
    }));
}
