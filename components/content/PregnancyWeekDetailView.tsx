"use client";

import { useState } from "react";
import { AlertTriangle } from "lucide-react";
import { LOCALES } from "@/lib/constants";
import type {
  Locale,
  PregnancyWeek,
  PregnancyWeekTranslation,
} from "@/lib/types/database";
import { cn } from "@/lib/utils";

const LOCALE_LABELS: Record<Locale, string> = {
  en: "English",
  am: "Amharic",
  om: "Afan Oromo",
};

function DetailField({
  label,
  value,
}: {
  label: string;
  value: string | null | undefined;
}) {
  if (!value?.trim()) return null;

  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">
        {label}
      </p>
      <p className="mt-1 whitespace-pre-wrap text-sm text-gray-800">{value}</p>
    </div>
  );
}

function TranslationPanel({
  translation,
}: {
  translation: PregnancyWeekTranslation | undefined;
}) {
  if (!translation) {
    return (
      <p className="rounded-xl border border-dashed border-gray-200 bg-gray-50 p-6 text-sm text-gray-500">
        No translation content for this language yet.
      </p>
    );
  }

  const sections = translation.sections ?? [];

  return (
    <div className="space-y-6">
      <DetailField label="Title" value={translation.title} />
      <DetailField label="Subtitle" value={translation.subtitle} />
      <DetailField label="Baby development" value={translation.baby_development} />
      <DetailField label="Mother changes" value={translation.mother_changes} />
      <DetailField label="Recommendations" value={translation.recommendations} />
      <DetailField label="Warning signs" value={translation.warning_signs} />

      {sections.length > 0 ? (
        <div className="space-y-3 border-t border-gray-200 pt-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">
            Sections
          </p>
          {sections.map((section, index) => (
            <div
              key={index}
              className="space-y-2 rounded-xl border border-gray-200 bg-white p-4"
            >
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-sm font-semibold text-gray-900">
                  {section.title || `Section ${index + 1}`}
                </p>
                {section.is_urgent ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-red-50 px-2 py-0.5 text-xs font-medium text-red-700">
                    <AlertTriangle className="h-3 w-3" />
                    Urgent
                  </span>
                ) : null}
              </div>
              {section.body?.trim() ? (
                <p className="whitespace-pre-wrap text-sm text-gray-700">
                  {section.body}
                </p>
              ) : null}
              {section.bullets && section.bullets.length > 0 ? (
                <ul className="list-disc space-y-1 pl-5 text-sm text-gray-700">
                  {section.bullets.map((bullet, bulletIndex) => (
                    <li key={bulletIndex}>{bullet}</li>
                  ))}
                </ul>
              ) : null}
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}

type PregnancyWeekDetailViewProps = {
  week: PregnancyWeek;
};

export default function PregnancyWeekDetailView({
  week,
}: PregnancyWeekDetailViewProps) {
  const [activeLocale, setActiveLocale] = useState<Locale>("en");
  const englishTitle = week.pregnancy_week_translations?.find(
    (item) => item.language_code === "en",
  )?.title;

  const translation = week.pregnancy_week_translations?.find(
    (item) => item.language_code === activeLocale,
  );

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">
            Week
          </p>
          <p className="mt-1 text-lg font-semibold text-gray-900">
            Week {week.week_number}
          </p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">
            Trimester
          </p>
          <p className="mt-1 text-lg font-semibold text-gray-900">
            {week.trimester}
          </p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">
            Status
          </p>
          <span
            className={`mt-2 inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${
              week.is_published
                ? "bg-emerald-50 text-emerald-700"
                : "bg-amber-50 text-amber-700"
            }`}
          >
            {week.is_published ? "Published" : "Draft"}
          </span>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">
            Languages
          </p>
          <p className="mt-1 text-lg font-semibold text-gray-900">
            {week.pregnancy_week_translations?.length ?? 0}
          </p>
        </div>
      </div>

      {week.image_note?.trim() ? (
        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">
            Image note
          </p>
          <p className="mt-1 text-sm text-gray-800">{week.image_note}</p>
        </div>
      ) : null}

      {englishTitle ? (
        <div className="rounded-xl border border-emerald-100 bg-emerald-50/50 p-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-emerald-700">
            English title
          </p>
          <p className="mt-1 text-base font-medium text-gray-900">{englishTitle}</p>
        </div>
      ) : null}

      <div className="admin-panel">
        <div className="mb-4 flex flex-wrap gap-2">
          {LOCALES.map((locale) => {
            const hasTranslation = week.pregnancy_week_translations?.some(
              (item) => item.language_code === locale,
            );
            return (
              <button
                key={locale}
                type="button"
                onClick={() => setActiveLocale(locale)}
                className={cn(
                  "rounded-lg px-3 py-1.5 text-sm font-medium transition-colors",
                  activeLocale === locale
                    ? "bg-emerald-600 text-white"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200",
                  !hasTranslation && activeLocale !== locale
                    ? "opacity-60"
                    : "",
                )}
              >
                {LOCALE_LABELS[locale]}
              </button>
            );
          })}
        </div>

        <TranslationPanel translation={translation} />
      </div>
    </div>
  );
}
