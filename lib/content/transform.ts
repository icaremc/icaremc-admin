import type { ContentNamespace, Locale } from "@/lib/types/database";
import { LOCALES } from "@/lib/constants";
import {
  EMPTY_GROWTH,
  EMPTY_MILESTONE_CATEGORY,
  type GrowthFields,
  type LocaleFormMap,
  type MilestoneCategoryFields,
} from "./formTypes";

function asString(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function bulletsToText(bullets: unknown): string {
  if (!Array.isArray(bullets)) return "";
  return bullets.map((item) => String(item)).join("\n");
}

function textToBullets(text: string): string[] {
  return text
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
}

function parseGrowth(raw: unknown): GrowthFields {
  if (!raw || typeof raw !== "object") return { ...EMPTY_GROWTH };
  const map = raw as Record<string, unknown>;
  return {
    weight_range: asString(map.weight_range),
    length_range: asString(map.length_range),
    head_circumference_range: asString(map.head_circumference_range),
    weight_average: asString(map.weight_average),
    length_average: asString(map.length_average),
    head_average: asString(map.head_average),
  };
}

function serializeGrowth(fields: GrowthFields): Record<string, string> {
  const result: Record<string, string> = {};
  (Object.keys(fields) as (keyof GrowthFields)[]).forEach((key) => {
    const value = fields[key].trim();
    if (value) result[key] = value;
  });
  return result;
}

function parseCategories(raw: unknown): MilestoneCategoryFields[] {
  if (!Array.isArray(raw)) return [{ ...EMPTY_MILESTONE_CATEGORY }];
  const categories = raw
    .filter((item) => item && typeof item === "object")
    .map((item) => {
      const map = item as Record<string, unknown>;
      return {
        title: asString(map.title),
        itemsText: bulletsToText(map.items),
      };
    });
  return categories.length > 0 ? categories : [{ ...EMPTY_MILESTONE_CATEGORY }];
}

function serializeCategories(categories: MilestoneCategoryFields[]) {
  return categories
    .filter((category) => category.title.trim())
    .map((category) => ({
      title: category.title.trim(),
      items: textToBullets(category.itemsText),
    }));
}

function localeSliceToForm(
  namespace: ContentNamespace,
  slice: Record<string, unknown> | undefined,
): Record<string, unknown> {
  if (!slice) return createEmptyLocaleForm(namespace);

  if (namespace === "milestone") {
    const growth =
      slice.growth && typeof slice.growth === "object"
        ? (slice.growth as Record<string, unknown>)
        : {};
    return {
      months:
        slice.months !== undefined && slice.months !== null
          ? String(slice.months)
          : "",
      label: asString(slice.label),
      growth_boys: parseGrowth(growth.boys),
      growth_girls: parseGrowth(growth.girls),
      categories: parseCategories(slice.categories),
    };
  }

  return {};
}

function localeFormToSlice(
  namespace: ContentNamespace,
  form: Record<string, unknown>,
): Record<string, unknown> {
  if (namespace !== "milestone") return {};

  const payload: Record<string, unknown> = {
    label: asString(form.label).trim(),
    categories: serializeCategories(
      (form.categories as MilestoneCategoryFields[]) ?? [],
    ),
  };
  const months = asString(form.months).trim();
  if (months) payload.months = Number(months);

  const boys = serializeGrowth(
    (form.growth_boys as GrowthFields) ?? EMPTY_GROWTH,
  );
  const girls = serializeGrowth(
    (form.growth_girls as GrowthFields) ?? EMPTY_GROWTH,
  );
  if (Object.keys(boys).length || Object.keys(girls).length) {
    payload.growth = {};
    if (Object.keys(boys).length) {
      (payload.growth as Record<string, unknown>).boys = boys;
    }
    if (Object.keys(girls).length) {
      (payload.growth as Record<string, unknown>).girls = girls;
    }
  }
  return payload;
}

export function createEmptyLocaleForm(
  namespace: ContentNamespace,
): Record<string, unknown> {
  if (namespace === "milestone") {
    return {
      months: "",
      label: "",
      growth_boys: { ...EMPTY_GROWTH },
      growth_girls: { ...EMPTY_GROWTH },
      categories: [{ ...EMPTY_MILESTONE_CATEGORY }],
    };
  }
  return {};
}

export function createEmptyForm(namespace: ContentNamespace): LocaleFormMap {
  return LOCALES.reduce((acc, locale) => {
    acc[locale] = createEmptyLocaleForm(namespace);
    return acc;
  }, {} as LocaleFormMap);
}

export function translationsToForm(
  namespace: ContentNamespace,
  translations: Record<string, Record<string, unknown>>,
): LocaleFormMap {
  const form = createEmptyForm(namespace);
  for (const locale of LOCALES) {
    form[locale] = localeSliceToForm(namespace, translations[locale]);
  }
  return form;
}

export function formToTranslations(
  namespace: ContentNamespace,
  form: LocaleFormMap,
): Record<string, Record<string, unknown>> {
  const translations: Record<string, Record<string, unknown>> = {};
  for (const locale of LOCALES) {
    const slice = localeFormToSlice(namespace, form[locale] ?? {});
    const hasContent = Object.values(slice).some((value) => {
      if (Array.isArray(value)) return value.length > 0;
      if (value && typeof value === "object") return Object.keys(value).length > 0;
      return String(value ?? "").trim().length > 0;
    });
    if (hasContent) translations[locale] = slice;
  }
  return translations;
}

export function validateForm(
  namespace: ContentNamespace,
  form: LocaleFormMap,
): string | null {
  if (namespace !== "milestone") return null;

  const en = form.en ?? {};
  if (!asString(en.label).trim()) return "English label is required.";
  return null;
}
