import type { ChildFollowupVisitTemplate } from "@/lib/types/database";

/** Short, admin-friendly milestone label (avoids "6 weeks / 1.5 months"). */
export function milestoneDisplayLabel(
  ageLabel: string | null | undefined,
  ageMonths?: number | null,
): string {
  if (!ageLabel?.trim()) return "No milestone";
  if (ageMonths === 0 || ageLabel.startsWith("Newborn")) return "Newborn";
  if (ageMonths === 1 || ageLabel.includes("6 weeks")) return "6 weeks";
  return ageLabel.trim();
}

export type FollowupMilestoneGroup = {
  periodId: string | null;
  ageMonths: number | null;
  label: string;
  templates: ChildFollowupVisitTemplate[];
};

export function groupFollowupTemplatesByMilestone(
  templates: ChildFollowupVisitTemplate[],
): FollowupMilestoneGroup[] {
  const map = new Map<string, FollowupMilestoneGroup>();

  for (const template of templates) {
    const periodId = template.growth_period_id;
    const key = periodId ?? "__none__";
    const existing = map.get(key);

    if (existing) {
      existing.templates.push(template);
      continue;
    }

    map.set(key, {
      periodId,
      ageMonths: template.child_growth_periods?.age_months ?? null,
      label: milestoneDisplayLabel(
        template.child_growth_periods?.age_label,
        template.child_growth_periods?.age_months,
      ),
      templates: [template],
    });
  }

  return Array.from(map.values())
    .map((group) => ({
      ...group,
      templates: [...group.templates].sort((a, b) => a.sort_order - b.sort_order),
    }))
    .sort((a, b) => {
      if (a.periodId == null) return 1;
      if (b.periodId == null) return -1;
      return (a.ageMonths ?? 0) - (b.ageMonths ?? 0);
    });
}

export function offsetLabel(days: number | null, months: number | null): string {
  if (months != null) return `${months} month${months === 1 ? "" : "s"}`;
  if (days != null) return `${days} day${days === 1 ? "" : "s"}`;
  return "—";
}
