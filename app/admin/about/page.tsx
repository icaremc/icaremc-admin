"use client";

import { useCallback, useEffect, useState } from "react";
import { Info, Plus, RefreshCw, Save, Trash2 } from "lucide-react";
import PageHero from "@/components/PageHero";
import { LegalLocaleTabs } from "@/components/legal/LegalLocaleTabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  ABOUT_APP_SLUG,
  emptyLegalDocument,
  findLegalDocument,
  type LegalDocument,
  type LegalSection,
} from "@/lib/legal/legalDocuments";
import type { Locale } from "@/lib/types/database";

type LoadResponse = {
  documents?: LegalDocument[];
  error?: string;
};

const DEFAULT_SECTIONS: LegalSection[] = [
  { title: "About", body: "" },
  { title: "Mission", body: "" },
  { title: "Vision", body: "" },
  { title: "Disclaimer", body: "" },
];

function emptyAbout(locale: Locale): LegalDocument {
  return emptyLegalDocument(
    ABOUT_APP_SLUG,
    locale,
    locale === "en" ? "About iCare MC" : "",
    DEFAULT_SECTIONS.map((section) => ({ ...section })),
  );
}

function draftFromDocs(documents: LegalDocument[], locale: Locale): LegalDocument {
  const existing = findLegalDocument(documents, ABOUT_APP_SLUG, locale);
  if (!existing) return emptyAbout(locale);
  return {
    ...existing,
    sections:
      existing.sections.length > 0
        ? existing.sections
        : DEFAULT_SECTIONS.map((section) => ({ ...section })),
  };
}

export default function AboutAppPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [documents, setDocuments] = useState<LegalDocument[]>([]);
  const [locale, setLocale] = useState<Locale>("en");
  const [draft, setDraft] = useState<LegalDocument>(emptyAbout("en"));
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/admin/legal-documents");
      const data = (await response.json()) as LoadResponse;
      if (!response.ok) {
        throw new Error(data.error ?? "Could not load About content");
      }
      const docs = data.documents ?? [];
      setDocuments(docs);
      setDraft((current) => draftFromDocs(docs, current.locale));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Load failed");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  function selectLocale(next: Locale) {
    setLocale(next);
    setDraft(draftFromDocs(documents, next));
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
      sections: current.sections.filter((_, i) => i !== index),
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
          slug: ABOUT_APP_SLUG,
          locale,
          title: draft.title.trim() || (locale === "en" ? "About iCare MC" : ""),
          sections: draft.sections,
        }),
      });
      const data = (await response.json()) as {
        document?: LegalDocument;
        error?: string;
      };
      if (!response.ok) {
        throw new Error(data.error ?? "Save failed");
      }
      if (data.document) {
        const saved = data.document;
        setDraft({
          ...saved,
          sections:
            saved.sections.length > 0
              ? saved.sections
              : DEFAULT_SECTIONS.map((section) => ({ ...section })),
        });
        setDocuments((current) => {
          const without = current.filter(
            (doc) =>
              !(doc.slug === saved.slug && doc.locale === saved.locale),
          );
          return [...without, saved];
        });
      }
      setMessage("About saved. Parents see this under Settings → About in the MC app.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <PageHero
        title="About the app"
        description="Mission, vision, and disclaimer shown in iCare MC under Settings → About. Edit English, Amharic, and Oromo separately."
        icon={Info}
      />

      <div className="admin-page admin-page-settings">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <LegalLocaleTabs
            active={locale}
            disabled={loading}
            hasLocale={(code) =>
              Boolean(findLegalDocument(documents, ABOUT_APP_SLUG, code))
            }
            onChange={selectLocale}
          />
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => void load()}
              disabled={loading}
            >
              <RefreshCw
                className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`}
              />
              Refresh
            </Button>
            <Button
              type="button"
              onClick={() => void handleSave()}
              disabled={saving || loading}
            >
              <Save className="mr-2 h-4 w-4" />
              {saving ? "Saving…" : "Save About"}
            </Button>
          </div>
        </div>

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
          <label className="block text-sm">
            <span className="mb-1 block font-medium text-gray-700">
              Page title
            </span>
            <Input
              value={draft.title}
              onChange={(event) =>
                setDraft((current) => ({
                  ...current,
                  title: event.target.value,
                }))
              }
              disabled={loading}
              placeholder="About iCare MC"
            />
          </label>

          <div className="space-y-4">
            {draft.sections.map((section, index) => (
              <div
                key={`about-section-${index}`}
                className="space-y-3 rounded-xl border border-gray-200 bg-white p-4"
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
                    disabled={draft.sections.length <= 1}
                  >
                    <Trash2 className="h-4 w-4 text-red-500" />
                  </Button>
                </div>
                <Input
                  placeholder="Title (e.g. Mission)"
                  value={section.title}
                  onChange={(event) =>
                    updateSection(index, { title: event.target.value })
                  }
                  disabled={loading}
                />
                <textarea
                  className="min-h-[120px] w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                  placeholder="Body text shown in the app"
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
