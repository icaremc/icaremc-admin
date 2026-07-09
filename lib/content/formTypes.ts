import type { ContentNamespace, Locale } from "@/lib/types/database";

export type LocaleFormMap = Record<Locale, Record<string, unknown>>;

export type VaccineFields = {
  name: string;
  route: string;
  benefitsText: string;
};

export const EMPTY_VACCINE: VaccineFields = {
  name: "",
  route: "",
  benefitsText: "",
};

export type PregnancySectionFields = {
  title: string;
  body: string;
  bulletsText: string;
  is_urgent: boolean;
};

export type GrowthFields = {
  weight_range: string;
  length_range: string;
  head_circumference_range: string;
  weight_average: string;
  length_average: string;
  head_average: string;
};

export type LearningPathItemFields = {
  label: string;
  explanation: string;
  /** @deprecated Prefer image_urls; kept for older rows / first-image fallback. */
  image_url: string;
  image_urls: string[];
  video_url: string;
};

export const EMPTY_LEARNING_PATH_ITEM: LearningPathItemFields = {
  label: "",
  explanation: "",
  image_url: "",
  image_urls: [],
  video_url: "",
};

export type MilestoneCategoryFields = {
  title: string;
  items: LearningPathItemFields[];
};

export const EMPTY_MILESTONE_CATEGORY: MilestoneCategoryFields = {
  title: "",
  items: [{ ...EMPTY_LEARNING_PATH_ITEM }],
};
export type GrowthMetricSexFields = {
  weight_kg: string;
  weight_min: string;
  weight_max: string;
  height_cm: string;
  height_min: string;
  height_max: string;
  hc_cm: string;
  hc_min: string;
  hc_max: string;
};

export const EMPTY_GROWTH_METRIC: GrowthMetricSexFields = {
  weight_kg: "",
  weight_min: "",
  weight_max: "",
  height_cm: "",
  height_min: "",
  height_max: "",
  hc_cm: "",
  hc_min: "",
  hc_max: "",
};

export const EMPTY_GROWTH: GrowthFields = {
  weight_range: "",
  length_range: "",
  head_circumference_range: "",
  weight_average: "",
  length_average: "",
  head_average: "",
};

export const EMPTY_PREGNANCY_SECTION: PregnancySectionFields = {
  title: "",
  body: "",
  bulletsText: "",
  is_urgent: false,
};

export type ContentFieldKind = "text" | "textarea" | "categories" | "growth";

export type ContentFieldDef = {
  key: string;
  label: string;
  kind: ContentFieldKind;
  placeholder?: string;
  required?: boolean;
};

export function fieldsForNamespace(namespace: ContentNamespace): ContentFieldDef[] {
  if (namespace !== "milestone") return [];

  return [
    { key: "months", label: "Age (months)", kind: "text" },
    { key: "label", label: "Label", kind: "text", required: true },
    { key: "categories", label: "Categories", kind: "categories" },
  ];
}
