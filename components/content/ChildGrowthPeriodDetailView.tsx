"use client";

import { useState } from "react";
import { AlertTriangle } from "lucide-react";
import { LOCALES } from "@/lib/constants";
import { CHILD_AGE_GROUP_LABELS, type ChildAgeGroup } from "@/lib/childGrowth/periods";
import type {
  ChildGrowthGrowthData,
  ChildGrowthPeriod,
  ChildGrowthPeriodTranslation,
  Locale,
  PregnancyWeekSection,
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

function SectionList({
  label,
  sections,
}: {
  label: string;
  sections: PregnancyWeekSection[];
}) {
  if (!sections?.length) return null;

  return (
    <div className="space-y-3 border-t border-gray-200 pt-4">
      <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">
        {label}
      </p>
      {sections.map((section, index) => (
        <div
          key={index}
          className="space-y-2 rounded-xl border border-gray-200 bg-white p-4"
        >
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-sm font-semibold text-gray-900">
              {section.title || `${label} ${index + 1}`}
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
  );
}

function GrowthPanel({ growth }: { growth: ChildGrowthGrowthData }) {
  const hasBoys =
    growth.boys &&
    Object.values(growth.boys).some((v) => typeof v === "string" && v.trim());
  const hasGirls =
    growth.girls &&
    Object.values(growth.girls).some((v) => typeof v === "string" && v.trim());

  if (!growth.notes?.trim() && !hasBoys && !hasGirls) return null;

  return (
    <div className="space-y-3 border-t border-gray-200 pt-4">
      <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">
        Growth tracking
      </p>
      <DetailField label="Notes" value={growth.notes} />
      {hasBoys ? (
        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <p className="text-sm font-semibold text-gray-800">Boys</p>
          <dl className="mt-2 grid gap-2 text-sm sm:grid-cols-2">
            {growth.boys?.weight_range ? (
              <div>
                <dt className="text-gray-500">Weight</dt>
                <dd className="text-gray-900">{growth.boys.weight_range}</dd>
              </div>
            ) : null}
            {growth.boys?.length_range ? (
              <div>
                <dt className="text-gray-500">Length</dt>
                <dd className="text-gray-900">{growth.boys.length_range}</dd>
              </div>
            ) : null}
            {growth.boys?.head_circumference_range ? (
              <div>
                <dt className="text-gray-500">Head circumference</dt>
                <dd className="text-gray-900">
                  {growth.boys.head_circumference_range}
                </dd>
              </div>
            ) : null}
          </dl>
        </div>
      ) : null}
      {hasGirls ? (
        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <p className="text-sm font-semibold text-gray-800">Girls</p>
          <dl className="mt-2 grid gap-2 text-sm sm:grid-cols-2">
            {growth.girls?.weight_range ? (
              <div>
                <dt className="text-gray-500">Weight</dt>
                <dd className="text-gray-900">{growth.girls.weight_range}</dd>
              </div>
            ) : null}
            {growth.girls?.length_range ? (
              <div>
                <dt className="text-gray-500">Length</dt>
                <dd className="text-gray-900">{growth.girls.length_range}</dd>
              </div>
            ) : null}
            {growth.girls?.head_circumference_range ? (
              <div>
                <dt className="text-gray-500">Head circumference</dt>
                <dd className="text-gray-900">
                  {growth.girls.head_circumference_range}
                </dd>
              </div>
            ) : null}
          </dl>
        </div>
      ) : null}
    </div>
  );
}

function TranslationPanel({
  translation,
}: {
  translation: ChildGrowthPeriodTranslation | undefined;
}) {
  if (!translation) {
    return (
      <p className="rounded-xl border border-dashed border-gray-200 bg-gray-50 p-6 text-sm text-gray-500">
        No translation content for this language yet.
      </p>
    );
  }

  return (
    <div className="space-y-6">
      <DetailField label="Title" value={translation.title} />
      <DetailField label="Subtitle" value={translation.subtitle} />
      <GrowthPanel growth={translation.growth ?? {}} />
      <SectionList label="Vaccines" sections={translation.vaccines ?? []} />

      {translation.milestones && translation.milestones.length > 0 ? (
        <div className="space-y-3 border-t border-gray-200 pt-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">
            Developmental milestones
          </p>
          {translation.milestones.map((category, index) => (
            <div
              key={index}
              className="rounded-xl border border-gray-200 bg-white p-4"
            >
              <p className="text-sm font-semibold text-gray-900">
                {category.title || `Category ${index + 1}`}
              </p>
              {category.items && category.items.length > 0 ? (
                <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-gray-700">
                  {category.items.map((item, itemIndex) => (
                    <li key={itemIndex}>{item}</li>
                  ))}
                </ul>
              ) : null}
            </div>
          ))}
        </div>
      ) : null}

      <SectionList label="Red flags" sections={translation.red_flags ?? []} />
      <SectionList
        label="Nutrition guidance"
        sections={translation.nutrition ?? []}
      />
      <SectionList
        label="Visit reminders"
        sections={translation.visit_reminders ?? []}
      />
    </div>
  );
}

type ChildGrowthPeriodDetailViewProps = {
  period: ChildGrowthPeriod;
};

export default function ChildGrowthPeriodDetailView({
  period,
}: ChildGrowthPeriodDetailViewProps) {
  const [activeLocale, setActiveLocale] = useState<Locale>("en");
  const englishTitle = period.child_growth_period_translations?.find(
    (item) => item.language_code === "en",
  )?.title;

  const translation = period.child_growth_period_translations?.find(
    (item) => item.language_code === activeLocale,
  );

  const ageGroupLabel =
    CHILD_AGE_GROUP_LABELS[period.age_group as ChildAgeGroup] ??
    period.age_group;

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">
            Age
          </p>
          <p className="mt-1 text-lg font-semibold text-gray-900">
            {period.age_label}
          </p>
          <p className="text-sm text-gray-500">{period.age_months} months</p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">
            Age group
          </p>
          <p className="mt-1 text-lg font-semibold text-gray-900">
            {ageGroupLabel}
          </p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">
            Status
          </p>
          <span
            className={`mt-2 inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${
              period.is_published
                ? "bg-emerald-50 text-emerald-700"
                : "bg-amber-50 text-amber-700"
            }`}
          >
            {period.is_published ? "Published" : "Draft"}
          </span>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">
            Languages
          </p>
          <p className="mt-1 text-lg font-semibold text-gray-900">
            {period.child_growth_period_translations?.length ?? 0}
          </p>
        </div>
      </div>

      {period.image_note?.trim() ? (
        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">
            Image note
          </p>
          <p className="mt-1 text-sm text-gray-800">{period.image_note}</p>
        </div>
      ) : null}

      {englishTitle ? (
        <div className="rounded-xl border border-emerald-100 bg-emerald-50/50 p-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-emerald-700">
            English title
          </p>
          <p className="mt-1 text-base font-medium text-gray-900">
            {englishTitle}
          </p>
        </div>
      ) : null}

      <div className="admin-panel">
        <div className="mb-4 flex flex-wrap gap-2">
          {LOCALES.map((locale) => {
            const hasTranslation = period.child_growth_period_translations?.some(
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
