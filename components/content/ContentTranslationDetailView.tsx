"use client";

import { useState } from "react";
import { ImageGallery } from "@/components/content/ImageGallery";
import { VideoEmbed } from "@/components/content/VideoEmbed";
import { LOCALES } from "@/lib/constants";
import {
  fieldsForNamespace,
  type MilestoneCategoryFields,
} from "@/lib/content/formTypes";
import {
  collectLearningPathImageUrls,
  learningPathItemHasContent,
} from "@/lib/content/learningPathMedia";
import {
  dailyTipDayNumber,
  dailyTipWeekNumber,
} from "@/lib/content/contentLabels";
import { contentEntityIdLabel } from "@/lib/constants";
import { translationsToForm } from "@/lib/content/transform";
import type {
  ContentNamespace,
  ContentTranslation,
  Locale,
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

function LocaleContentPanel({
  namespace,
  localeData,
}: {
  namespace: ContentNamespace;
  localeData: Record<string, unknown>;
}) {
  const fields = fieldsForNamespace(namespace).filter(
    (field) =>
      !["sections", "categories", "growth"].includes(field.kind) &&
      !(namespace === "daily_tip" && field.key === "week_number") &&
      !(namespace === "daily_tip" && field.key === "day_number"),
  );

  const hasSimpleContent = fields.some((field) =>
    String(localeData[field.key] ?? "").trim(),
  );

  const categories =
    (localeData.categories as MilestoneCategoryFields[] | undefined) ?? [];

  const hasMilestoneContent =
    namespace === "milestone" &&
    categories.some(
      (category) =>
        category.title.trim() ||
        category.items.some((item) => learningPathItemHasContent(item)),
    );

  if (!hasSimpleContent && !hasMilestoneContent) {
    return (
      <p className="rounded-xl border border-dashed border-gray-200 bg-gray-50 p-6 text-sm text-gray-500">
        No translation content for this language yet.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      {fields.map((field) => (
        <DetailField
          key={field.key}
          label={field.label}
          value={String(localeData[field.key] ?? "")}
        />
      ))}

      {namespace === "milestone" ? (
        categories.filter(
          (category) =>
            category.title.trim() ||
            category.items.some((item) => learningPathItemHasContent(item)),
        ).length > 0 ? (
          <div className="space-y-3 border-t border-gray-200 pt-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">
              Checklist
            </p>
            {categories.map((category, index) => {
              const hasItems = category.items.some((item) =>
                learningPathItemHasContent(item),
              );
              if (!category.title.trim() && !hasItems) {
                return null;
              }

              return (
                <div
                  key={index}
                  className="space-y-2 rounded-xl border border-gray-200 bg-white p-4"
                >
                  <p className="text-sm font-semibold text-gray-900">
                    {category.title || `Category ${index + 1}`}
                  </p>
                  {hasItems ? (
                    <ul className="space-y-2">
                      {category.items.map((item, itemIndex) => {
                        if (!learningPathItemHasContent(item)) {
                          return null;
                        }
                        const images = collectLearningPathImageUrls(item);
                        return (
                          <li
                            key={itemIndex}
                            className="rounded-lg border border-gray-100 bg-gray-50/80 p-3 text-sm text-gray-700"
                          >
                            <p className="font-medium text-gray-900">
                              {item.label || `Item ${itemIndex + 1}`}
                            </p>
                            {item.explanation.trim() ? (
                              <p className="mt-1 whitespace-pre-wrap text-sm text-gray-600">
                                {item.explanation.trim()}
                              </p>
                            ) : null}
                            <ImageGallery urls={images} />
                            {item.video_url.trim() ? (
                              <VideoEmbed url={item.video_url} />
                            ) : null}
                          </li>
                        );
                      })}
                    </ul>
                  ) : null}
                </div>
              );
            })}
          </div>
        ) : null
      ) : null}
    </div>
  );
}

type ContentTranslationDetailViewProps = {
  namespace: ContentNamespace;
  item: ContentTranslation;
};

export default function ContentTranslationDetailView({
  namespace,
  item,
}: ContentTranslationDetailViewProps) {
  const [activeLocale, setActiveLocale] = useState<Locale>("en");
  const form = translationsToForm(namespace, item.translations);
  const localeData = form[activeLocale] ?? {};

  return (
    <div className="space-y-6">
      <div
        className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4"
      >
        {namespace === "daily_tip" ? (
          <>
            <div className="rounded-xl border border-gray-200 bg-white p-4">
              <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">
                Pregnancy week
              </p>
              <p className="mt-1 text-lg font-semibold text-gray-900">
                {dailyTipWeekNumber(item) !== null
                  ? `Week ${dailyTipWeekNumber(item)}`
                  : "Not set"}
              </p>
            </div>
            <div className="rounded-xl border border-gray-200 bg-white p-4">
              <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">
                Day in week
              </p>
              <p className="mt-1 text-lg font-semibold text-gray-900">
                {dailyTipDayNumber(item) !== null
                  ? `Day ${dailyTipDayNumber(item)}`
                  : "Not set"}
              </p>
            </div>
          </>
        ) : null}
        {namespace === "milestone" ? (
          <div className="rounded-xl border border-gray-200 bg-white p-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">
              {contentEntityIdLabel(namespace)}
            </p>
            <p className="mt-1 text-lg font-semibold text-gray-900">
              {item.entity_id}
            </p>
          </div>
        ) : null}
        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">
            Status
          </p>
          <span
            className={`mt-2 inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${
              item.is_published
                ? "bg-emerald-50 text-emerald-700"
                : "bg-amber-50 text-amber-700"
            }`}
          >
            {item.is_published ? "Published" : "Draft"}
          </span>
        </div>
      </div>

      <div className="admin-panel">
        <div className="mb-4 flex flex-wrap gap-2">
          {LOCALES.map((locale) => {
            const hasTranslation = Boolean(
              item.translations[locale] &&
                Object.keys(item.translations[locale]).length > 0,
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
                  !hasTranslation && activeLocale !== locale ? "opacity-60" : "",
                )}
              >
                {LOCALE_LABELS[locale]}
              </button>
            );
          })}
        </div>

        <LocaleContentPanel namespace={namespace} localeData={localeData} />
      </div>
    </div>
  );
}
