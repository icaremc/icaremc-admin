"use client";

import { useState } from "react";
import { LOCALES } from "@/lib/constants";
import {
  fieldsForNamespace,
  type GrowthFields,
  type MilestoneCategoryFields,
} from "@/lib/content/formTypes";
import {
  dailyTipDayNumber,
  dailyTipWeekNumber,
} from "@/lib/content/contentLabels";
import { namespaceUsesUuidEntityId } from "@/lib/content/entityId";
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

function GrowthPanel({ title, growth }: { title: string; growth: GrowthFields }) {
  const entries = (
    [
      ["weight_range", "Weight range"],
      ["length_range", "Length range"],
      ["head_circumference_range", "Head circumference range"],
      ["weight_average", "Weight average"],
      ["length_average", "Length average"],
      ["head_average", "Head average"],
    ] as const
  ).filter(([key]) => growth[key]?.trim());

  if (entries.length === 0) return null;

  return (
    <div className="space-y-2 rounded-xl border border-gray-200 bg-white p-4">
      <p className="text-sm font-semibold text-gray-900">{title}</p>
      {entries.map(([key, label]) => (
        <DetailField key={key} label={label} value={growth[key]} />
      ))}
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
  const growthBoys = localeData.growth_boys as GrowthFields | undefined;
  const growthGirls = localeData.growth_girls as GrowthFields | undefined;

  const hasMilestoneContent =
    namespace === "milestone" &&
    (categories.some(
      (category) => category.title.trim() || category.itemsText.trim(),
    ) ||
      growthBoys ||
      growthGirls);

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
        <>
          <div className="grid gap-4 lg:grid-cols-2">
            {growthBoys ? (
              <GrowthPanel title="Growth standards (boys)" growth={growthBoys} />
            ) : null}
            {growthGirls ? (
              <GrowthPanel title="Growth standards (girls)" growth={growthGirls} />
            ) : null}
          </div>

          {categories.filter(
            (category) => category.title.trim() || category.itemsText.trim(),
          ).length > 0 ? (
            <div className="space-y-3 border-t border-gray-200 pt-4">
              <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">
                Development categories
              </p>
              {categories.map((category, index) => {
                if (!category.title.trim() && !category.itemsText.trim()) {
                  return null;
                }

                const items = category.itemsText
                  .split("\n")
                  .map((line) => line.trim())
                  .filter(Boolean);

                return (
                  <div
                    key={index}
                    className="space-y-2 rounded-xl border border-gray-200 bg-white p-4"
                  >
                    <p className="text-sm font-semibold text-gray-900">
                      {category.title || `Category ${index + 1}`}
                    </p>
                    {items.length > 0 ? (
                      <ul className="list-disc space-y-1 pl-5 text-sm text-gray-700">
                        {items.map((item, itemIndex) => (
                          <li key={itemIndex}>{item}</li>
                        ))}
                      </ul>
                    ) : null}
                  </div>
                );
              })}
            </div>
          ) : null}
        </>
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
        {!namespaceUsesUuidEntityId(namespace) ? (
          <div className="rounded-xl border border-gray-200 bg-white p-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">
              Entity ID
            </p>
            <p className="mt-1 break-all font-mono text-xs text-gray-900">
              {item.entity_id}
            </p>
          </div>
        ) : null}
        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">
            Version
          </p>
          <p className="mt-1 text-lg font-semibold text-gray-900">v{item.version}</p>
        </div>
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
        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">
            Namespace
          </p>
          <p className="mt-1 text-sm font-medium text-gray-900">{item.namespace}</p>
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
