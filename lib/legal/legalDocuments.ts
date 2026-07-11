export type LegalSection = {
  title: string;
  body: string;
};

export type LegalDocument = {
  slug: string;
  title: string;
  sections: LegalSection[];
  updated_at?: string | null;
};

export const DEFAULT_LEGAL_SLUGS = [
  "cancellation-policy",
  "terms-of-service",
  "privacy-policy",
  "medical-disclaimer",
] as const;

export function normalizeLegalDocument(row: {
  slug?: string;
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
    .filter((item): item is LegalSection => Boolean(item && (item.title || item.body)));

  return {
    slug: String(row.slug ?? "").trim(),
    title: String(row.title ?? "").trim() || "Untitled",
    sections,
    updated_at: row.updated_at ?? null,
  };
}
