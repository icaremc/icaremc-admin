export const GROWTH_CLINICAL_METRIC_LABELS: Record<string, string> = {
  weight: "Weight-for-age",
  height: "Height-for-age",
  head: "Head circumference",
  bmi: "BMI-for-age",
  weight_for_height: "Weight-for-height",
};

/** Code prefix → metric key (e.g. wfa_low → weight). */
export const GROWTH_CLINICAL_CODE_PREFIX_METRICS: Record<string, string> = {
  wfa: "weight",
  hfa: "height",
  hc: "head",
  head: "head",
  bmi: "bmi",
  bfa: "bmi",
  wfh: "weight_for_height",
  weight: "weight",
  height: "height",
};

export const GROWTH_CLINICAL_CONDITION_LABELS: Record<string, string> = {
  low: "Low",
  high: "High",
  rapid: "Rapid gain",
  falter: "Faltering",
  faltering: "Faltering",
  over: "Overweight",
  obese: "Obesity",
};

export function growthClinicalMetricLabel(metric: string): string {
  return GROWTH_CLINICAL_METRIC_LABELS[metric] ?? humanizeSlug(metric);
}

export function growthClinicalConditionLabel(condition: string): string {
  return GROWTH_CLINICAL_CONDITION_LABELS[condition] ?? humanizeSlug(condition);
}

/**
 * Human label for a clinical advice code such as `wfa_low`.
 * Prefer metric + condition when present; otherwise parse the code.
 */
export function growthClinicalCodeLabel(
  code: string,
  metric?: string | null,
  condition?: string | null,
): string {
  if (metric && condition) {
    return `${growthClinicalMetricLabel(metric)} · ${growthClinicalConditionLabel(condition)}`;
  }

  const parsed = parseGrowthClinicalCode(code);
  if (parsed) {
    return `${growthClinicalMetricLabel(parsed.metric)} · ${growthClinicalConditionLabel(parsed.condition)}`;
  }

  return humanizeSlug(code);
}

export function parseGrowthClinicalCode(
  code: string,
): { metric: string; condition: string } | null {
  const normalized = code.trim().toLowerCase();
  if (!normalized) return null;

  const parts = normalized.split("_").filter(Boolean);
  if (parts.length < 2) return null;

  const cond = parts[parts.length - 1];
  const prefix = parts.slice(0, -1).join("_");
  const metric =
    GROWTH_CLINICAL_CODE_PREFIX_METRICS[prefix] ??
    GROWTH_CLINICAL_CODE_PREFIX_METRICS[parts[0]] ??
    prefix;

  return { metric, condition: cond };
}

function humanizeSlug(value: string): string {
  return value
    .replace(/[_-]+/g, " ")
    .trim()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

/** Metric key → code prefix (inverse of GROWTH_CLINICAL_CODE_PREFIX_METRICS). */
const GROWTH_CLINICAL_METRIC_CODE_PREFIX: Record<string, string> = {
  weight: "wfa",
  height: "hfa",
  head: "hc",
  bmi: "bmi",
  weight_for_height: "wfh",
};

export function suggestGrowthClinicalCode(
  metric: string,
  condition: string,
): string {
  const prefix =
    GROWTH_CLINICAL_METRIC_CODE_PREFIX[metric] ??
    metric.trim().toLowerCase().replace(/\s+/g, "_");
  const cond = condition.trim().toLowerCase().replace(/\s+/g, "_");
  if (!prefix || !cond) return "";
  return `${prefix}_${cond}`;
}

export const GROWTH_CLINICAL_METRIC_OPTIONS = Object.entries(
  GROWTH_CLINICAL_METRIC_LABELS,
).map(([value, label]) => ({ value, label }));

export const GROWTH_CLINICAL_CONDITION_OPTIONS = Object.entries(
  GROWTH_CLINICAL_CONDITION_LABELS,
)
  .filter(([value]) => value !== "faltering")
  .map(([value, label]) => ({ value, label }));
