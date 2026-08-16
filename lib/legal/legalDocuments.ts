import { LOCALES } from "@/lib/constants";
import type { Locale } from "@/lib/types/database";

export type LegalSection = {
  title: string;
  body: string;
};

export type LegalDocument = {
  slug: string;
  locale: Locale;
  title: string;
  sections: LegalSection[];
  updated_at?: string | null;
};

export const DEFAULT_LEGAL_SLUGS = [
  "cancellation-policy",
  "terms-of-service",
  "privacy-policy",
  "doctors-privacy-policy",
  "medical-disclaimer",
] as const;

export const ABOUT_APP_SLUG = "about-app";

export const LEGAL_SLUG_LABELS: Record<string, string> = {
  "about-app": "About app",
  "cancellation-policy": "Cancellation policy",
  "terms-of-service": "Terms of Service",
  "privacy-policy": "Privacy Policy",
  "doctors-privacy-policy": "Doctors Privacy Policy",
  "medical-disclaimer": "Medical disclaimer",
};

export const LEGAL_LOCALE_LABELS: Record<Locale, string> = {
  en: "English",
  am: "Amharic",
  om: "Oromo",
};

export function labelForLegalSlug(slug: string): string {
  return LEGAL_SLUG_LABELS[slug] ?? slug;
}

export function isLegalLocale(value: string): value is Locale {
  return (LOCALES as readonly string[]).includes(value);
}

export function findLegalDocument(
  documents: LegalDocument[],
  slug: string,
  locale: Locale,
): LegalDocument | undefined {
  return documents.find((doc) => doc.slug === slug && doc.locale === locale);
}

export function emptyLegalDocument(
  slug: string,
  locale: Locale,
  title?: string,
  sections?: LegalSection[],
): LegalDocument {
  return {
    slug,
    locale,
    title:
      title ??
      slug
        .split("-")
        .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
        .join(" "),
    sections: sections ?? [{ title: "", body: "" }],
    updated_at: null,
  };
}

export function normalizeLegalDocument(row: {
  slug?: string;
  locale?: string | null;
  title?: string;
  sections?: unknown;
  updated_at?: string | null;
}): LegalDocument {
  const sectionsRaw = Array.isArray(row.sections) ? row.sections : [];
  const sections: LegalSection[] = sectionsRaw
    .map((item) => {
      if (!item || typeof item !== "object") return null;
      const record = item as Record<string, unknown>;
      return {
        title: String(record.title ?? "").trim(),
        body: String(record.body ?? "").trim(),
      };
    })
    .filter((item): item is LegalSection =>
      Boolean(item && (item.title || item.body)),
    );

  const locale = isLegalLocale(String(row.locale ?? "").trim())
    ? (row.locale as Locale)
    : "en";

  return {
    slug: String(row.slug ?? "").trim(),
    locale,
    title: String(row.title ?? "").trim() || "Untitled",
    sections,
    updated_at: row.updated_at ?? null,
  };
}
