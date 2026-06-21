export type ChildAgeGroup =
  | "newborn"
  | "infant"
  | "toddler"
  | "child"
  | "adolescent";

export const CHILD_AGE_GROUP_LABELS: Record<ChildAgeGroup, string> = {
  newborn: "Newborn",
  infant: "Infant",
  toddler: "Toddler",
  child: "Child",
  adolescent: "Adolescent",
};

export function ageGroupForMonths(ageMonths: number): ChildAgeGroup {
  if (ageMonths <= 1) return "newborn";
  if (ageMonths <= 12) return "infant";
  if (ageMonths <= 36) return "toddler";
  if (ageMonths <= 144) return "child";
  return "adolescent";
}

export function formatAgeMonthsLabel(ageMonths: number): string {
  if (ageMonths === 0) return "Newborn (0–28 days)";
  if (ageMonths < 12) return `${ageMonths} month${ageMonths === 1 ? "" : "s"}`;
  if (ageMonths % 12 === 0) {
    const years = ageMonths / 12;
    return `${years} year${years === 1 ? "" : "s"}`;
  }
  const years = Math.floor(ageMonths / 12);
  const months = ageMonths % 12;
  if (years === 0) return `${months} months`;
  return `${years}y ${months}m`;
}

/** WHO-aligned checkpoints — admins can add more custom periods. */
export const SUGGESTED_CHILD_GROWTH_PERIODS = [
  { age_months: 0, age_label: "Newborn (0–28 days)" },
  { age_months: 1, age_label: "6 weeks / 1.5 months" },
  { age_months: 2, age_label: "2 months" },
  { age_months: 4, age_label: "4 months" },
  { age_months: 6, age_label: "6 months" },
  { age_months: 9, age_label: "9 months" },
  { age_months: 12, age_label: "12 months" },
  { age_months: 15, age_label: "15 months" },
  { age_months: 18, age_label: "18 months" },
  { age_months: 24, age_label: "2 years" },
  { age_months: 36, age_label: "3 years" },
  { age_months: 48, age_label: "4 years" },
  { age_months: 60, age_label: "5 years" },
  { age_months: 72, age_label: "6 years" },
  { age_months: 84, age_label: "7 years" },
  { age_months: 96, age_label: "8 years" },
  { age_months: 108, age_label: "9 years" },
  { age_months: 120, age_label: "10 years" },
  { age_months: 132, age_label: "11 years" },
  { age_months: 144, age_label: "12 years" },
  { age_months: 156, age_label: "13 years" },
  { age_months: 168, age_label: "14 years" },
  { age_months: 180, age_label: "15 years" },
  { age_months: 192, age_label: "16 years" },
  { age_months: 204, age_label: "17 years" },
  { age_months: 216, age_label: "18 years" },
] as const;
