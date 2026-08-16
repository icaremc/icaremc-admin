"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { FileText, Plus, RefreshCw, Save, Trash2 } from "lucide-react";
import PageHero from "@/components/PageHero";
import { LegalLocaleTabs } from "@/components/legal/LegalLocaleTabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  ABOUT_APP_SLUG,
  DEFAULT_LEGAL_SLUGS,
  emptyLegalDocument,
  findLegalDocument,
  labelForLegalSlug,
  type LegalDocument,
  type LegalSection,
} from "@/lib/legal/legalDocuments";
import type { Locale } from "@/lib/types/database";

type LoadResponse = {
  documents?: LegalDocument[];
  knownSlugs?: string[];
  error?: string;
};

function draftFor(
  documents: LegalDocument[],
  slug: string,
  locale: Locale,
): LegalDocument {
  const existing = findLegalDocument(documents, slug, locale);
  if (!existing) return emptyLegalDocument(slug, locale);
  return {
    ...existing,
    sections:
      existing.sections.length > 0
        ? existing.sections
        : [{ title: "", body: "" }],
  };
}

export default function LegalDocumentsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [documents, setDocuments] = useState<LegalDocument[]>([]);
  const [selectedSlug, setSelectedSlug] = useState("cancellation-policy");
  const [locale, setLocale] = useState<Locale>("en");
  const [draft, setDraft] = useState<LegalDocument>(
    emptyLegalDocument("cancellation-policy", "en"),
  );
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/admin/legal-documents");
      const data = (await response.json()) as LoadResponse;
      if (!response.ok) {
        throw new Error(data.error ?? "Could not load legal documents");
      }
      const docs = data.documents ?? [];
      setDocuments(docs);
      setDraft((current) => draftFor(docs, current.slug, current.locale));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Load failed");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const slugOptions = useMemo(() => {
    const fromDb = documents.map((doc) => doc.slug);
    return Array.from(new Set([...DEFAULT_LEGAL_SLUGS, ...fromDb])).filter(
      (slug) => slug !== ABOUT_APP_SLUG,
    );
  }, [documents]);

  function selectSlug(slug: string) {
    setSelectedSlug(slug);
    setDraft(draftFor(documents, slug, locale));
    setMessage(null);
    setError(null);
  }

  function selectLocale(next: Locale) {
    setLocale(next);
    setDraft(draftFor(documents, selectedSlug, next));
    setMessage(null);
    setError(null);
  }

  function updateSection(index: number, patch: Partial<LegalSection>) {
    setDraft((current) => ({
      ...current,
      sections: current.sections.map((section, i) =>
        i === index ? { ...section, ...patch } : section,
      ),
    }));
  }

  function addSection() {
    setDraft((current) => ({
      ...current,
      sections: [...current.sections, { title: "", body: "" }],
    }));
  }

  function removeSection(index: number) {
    setDraft((current) => ({
      ...current,
      sections:
        current.sections.length <= 1
          ? [{ title: "", body: "" }]
          : current.sections.filter((_, i) => i !== index),
    }));
  }

  async function handleSave() {
    setSaving(true);
    setMessage(null);
    setError(null);
    try {
      const response = await fetch("/api/admin/legal-documents", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          slug: draft.slug,
          locale,
          title: draft.title,
          sections: draft.sections,
        }),
      });
      const data = (await response.json()) as {
        document?: LegalDocument;
        error?: string;
      };
      if (!response.ok) {
        throw new Error(data.error ?? "Could not save document");
      }
      if (data.document) {
        const saved = data.document;
        setDraft({
          ...saved,
          sections:
            saved.sections.length > 0
              ? saved.sections
              : [{ title: "", body: "" }],
        });
        setDocuments((current) => {
          const without = current.filter(
            (doc) =>
              !(doc.slug === saved.slug && doc.locale === saved.locale),
          );
          return [...without, saved].sort((a, b) =>
            a.slug === b.slug
              ? a.locale.localeCompare(b.locale)
              : a.slug.localeCompare(b.slug),
          );
        });
      }
      setMessage("Policy saved. MC, DR, and marketing will load this text.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <PageHero
        title="Policies"
        description="Terms, privacy (patient and doctors), cancellation, and medical disclaimer. Edit English, Amharic, and Oromo separately."
        icon={FileText}
      />

      <div className="admin-page admin-page-settings">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap gap-2">
            {slugOptions.map((slug) => (
              <Button
                key={slug}
                type="button"
                size="sm"
                variant={slug === selectedSlug ? "default" : "outline"}
                onClick={() => selectSlug(slug)}
                disabled={loading}
              >
                {labelForLegalSlug(slug)}
              </Button>
            ))}
          </div>
          <div className="flex gap-2">
            <Button type="button" variant="outline" onClick={() => void load()} disabled={loading}>
              <RefreshCw className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} />
              Refresh
            </Button>
            <Button type="button" onClick={() => void handleSave()} disabled={saving || loading}>
              <Save className="mr-2 h-4 w-4" />
              {saving ? "Saving…" : "Save document"}
            </Button>
          </div>
        </div>

        <LegalLocaleTabs
          active={locale}
          disabled={loading}
          hasLocale={(code) =>
            Boolean(findLegalDocument(documents, selectedSlug, code))
          }
          onChange={selectLocale}
        />

        {error ? (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        ) : null}
        {message ? (
          <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
            {message}
          </div>
        ) : null}

        <section className="admin-panel space-y-4">
          {selectedSlug === "cancellation-policy" ? (
            <p className="text-sm text-gray-600">
              When a doctor cancels a paid booking, patients are refunded to their wallet
              automatically. Enable the doctor fine under{" "}
              <a className="font-medium text-emerald-700 underline" href="/admin/finance/settings">
                Finance settings
              </a>
              .
            </p>
          ) : null}
          <label className="block text-sm">
            <span className="mb-1 block font-medium text-gray-700">Title</span>
            <Input
              value={draft.title}
              onChange={(event) =>
                setDraft((current) => ({ ...current, title: event.target.value }))
              }
              disabled={loading}
            />
          </label>
          <label className="block text-sm">
            <span className="mb-1 block font-medium text-gray-700">Slug</span>
            <Input value={draft.slug} disabled />
          </label>

          <div className="space-y-4">
            {draft.sections.map((section, index) => (
              <div
                key={`section-${index}`}
                className="rounded-xl border border-gray-200 bg-white p-4 space-y-3"
              >
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-semibold text-gray-800">
                    Section {index + 1}
                  </p>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => removeSection(index)}
                  >
                    <Trash2 className="h-4 w-4 text-red-500" />
                  </Button>
                </div>
                <Input
                  placeholder="Section title"
                  value={section.title}
                  onChange={(event) =>
                    updateSection(index, { title: event.target.value })
                  }
                  disabled={loading}
                />
                <textarea
                  className="min-h-[140px] w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                  placeholder="Section body"
                  value={section.body}
                  onChange={(event) =>
                    updateSection(index, { body: event.target.value })
                  }
                  disabled={loading}
                />
              </div>
            ))}
          </div>

          <Button type="button" variant="outline" onClick={addSection}>
            <Plus className="mr-2 h-4 w-4" />
            Add section
          </Button>
        </section>
      </div>
    </>
  );
}
