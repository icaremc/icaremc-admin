import type { ContentNamespace, Locale } from "@/lib/types/database";

export type LocaleFormMap = Record<Locale, Record<string, unknown>>;

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

export type MilestoneCategoryFields = {
  title: string;
  itemsText: string;
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

export const EMPTY_MILESTONE_CATEGORY: MilestoneCategoryFields = {
  title: "",
  itemsText: "",
};

export type ContentFieldKind =
  | "text"
  | "textarea"
  | "checkbox"
  | "bullets"
  | "sections"
  | "categories"
  | "growth";

export type ContentFieldDef = {
  key: string;
  label: string;
  kind: ContentFieldKind;
  placeholder?: string;
  required?: boolean;
};

export function fieldsForNamespace(namespace: ContentNamespace): ContentFieldDef[] {
  switch (namespace) {
    case "daily_tip":
      return [
        {
          key: "week_number",
          label: "Pregnancy week",
          kind: "text",
          placeholder: "1–40",
          required: true,
        },
        {
          key: "day_number",
          label: "Day in week",
          kind: "text",
          placeholder: "1–7",
          required: true,
        },
        {
          key: "text",
          label: "Tip text",
          kind: "textarea",
          placeholder: "Health tip shown in the app",
          required: true,
        },
      ];
    case "milestone":
      return [
        { key: "months", label: "Age (months)", kind: "text" },
        { key: "label", label: "Label", kind: "text", required: true },
        { key: "growth", label: "Growth standards", kind: "growth" },
        { key: "categories", label: "Categories", kind: "categories" },
      ];
    default:
      return [];
  }
}
