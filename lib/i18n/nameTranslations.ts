import { LOCALES } from "@/lib/constants";
import type { Locale } from "@/lib/types/database";

export type NameTranslationSlice = { name: string };

export type NameTranslationsForm = Record<Locale, NameTranslationSlice>;

export type NameTranslationRow = {
  language_code: Locale | string;
  name: string;
};

export function emptyNameTranslations(enName = ""): NameTranslationsForm {
  return {
    en: { name: enName },
    am: { name: "" },
    om: { name: "" },
  };
}

export function nameTranslationsFromRows(
  rows: NameTranslationRow[] | null | undefined,
  fallbackEn = "",
): NameTranslationsForm {
  const form = emptyNameTranslations(fallbackEn);
  for (const row of rows ?? []) {
    if (!LOCALES.includes(row.language_code as Locale)) continue;
    form[row.language_code as Locale] = { name: row.name ?? "" };
  }
  if (!form.en.name.trim() && fallbackEn.trim()) {
    form.en.name = fallbackEn;
  }
  return form;
}

export function translationHasName(slice: NameTranslationSlice): boolean {
  return slice.name.trim().length > 0;
}

export function nameTranslationRowsFromForm(
  form: NameTranslationsForm,
): Array<{ language_code: Locale; name: string }> {
  return LOCALES.flatMap((locale) => {
    const name = form[locale].name.trim();
    if (!name) return [];
    return [{ language_code: locale, name }];
  });
}

export function readNameTranslationsFromFormData(
  formData: FormData,
): NameTranslationsForm | string {
  const form = emptyNameTranslations();
  for (const locale of LOCALES) {
    const raw = formData.get(`name_${locale}`);
    if (typeof raw === "string") form[locale].name = raw;
  }

  // Backward compat: plain `name` fills English when name_en omitted.
  if (!form.en.name.trim()) {
    const legacy = formData.get("name");
    if (typeof legacy === "string") form.en.name = legacy;
  }

  if (!form.en.name.trim()) return "English name is required";
  return form;
}

export function appendNameTranslationsToFormData(
  formData: FormData,
  translations: NameTranslationsForm,
): void {
  for (const locale of LOCALES) {
    formData.set(`name_${locale}`, translations[locale].name.trim());
  }
  formData.set("name", translations.en.name.trim());
}
