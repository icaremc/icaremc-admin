"use client";

import { useState } from "react";
import LearningPathFieldsEditor from "@/components/content/LearningPathFieldsEditor";
import SectionFieldsEditor from "@/components/content/SectionFieldsEditor";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { LOCALES } from "@/lib/constants";
import {
  CHILD_AGE_GROUP_LABELS,
  ageGroupForMonths,
  type ChildAgeGroup,
} from "@/lib/childGrowth/periods";
import { type GrowthMetricSexFields } from "@/lib/content/formTypes";
import type { Locale } from "@/lib/types/database";
import type { ChildGrowthPeriodFormState } from "@/features/childGrowth/childGrowthSlice";
import { cn } from "@/lib/utils";

const LOCALE_LABELS: Record<Locale, string> = {
  en: "English",
  am: "Amharic",
  om: "Afan Oromo",
};

type SectionKey =
  | "overview"
  | "growth"
  | "milestones"
  | "red_flags"
  | "nutrition";

const SECTIONS: { key: SectionKey; label: string }[] = [
  { key: "overview", label: "Overview" },
  { key: "growth", label: "Growth reference" },
  { key: "milestones", label: "Checklist" },
  { key: "red_flags", label: "Red flags" },
  { key: "nutrition", label: "Nutrition" },
];

type ChildGrowthPeriodFormProps = {
  value: ChildGrowthPeriodFormState;
  onChange: (value: ChildGrowthPeriodFormState) => void;
  isNew?: boolean;
  onSave?: () => void;
  onDelete?: () => void;
  saving?: boolean;
  saveLabel?: string;
};

const METRIC_ROWS: {
  label: string;
  median: keyof GrowthMetricSexFields;
  min: keyof GrowthMetricSexFields;
  max: keyof GrowthMetricSexFields;
}[] = [
  { label: "Weight (kg)", median: "weight_kg", min: "weight_min", max: "weight_max" },
  { label: "Height (cm)", median: "height_cm", min: "height_min", max: "height_max" },
  { label: "Head circ. (cm)", median: "hc_cm", min: "hc_min", max: "hc_max" },
];

function MetricSexFields({
  label,
  fields,
  onChange,
}: {
  label: string;
  fields: GrowthMetricSexFields;
  onChange: (fields: GrowthMetricSexFields) => void;
}) {
  const setField = (key: keyof GrowthMetricSexFields, value: string) => {
    onChange({ ...fields, [key]: value });
  };

  return (
    <div className="space-y-3 rounded-xl border border-gray-200 bg-white p-4">
      <p className="text-sm font-semibold text-gray-800">{label}</p>
      <div className="space-y-2">
        <div className="grid grid-cols-[1fr_repeat(3,80px)] items-center gap-2 text-xs font-medium text-gray-400">
          <span />
          <span className="text-center">Min</span>
          <span className="text-center">Median</span>
          <span className="text-center">Max</span>
        </div>
        {METRIC_ROWS.map((row) => (
          <div
            key={row.median}
            className="grid grid-cols-[1fr_repeat(3,80px)] items-center gap-2"
          >
            <Label className="text-sm font-normal text-gray-600">
              {row.label}
            </Label>
            <Input
              type="number"
              inputMode="decimal"
              value={fields[row.min]}
              onChange={(e) => setField(row.min, e.target.value)}
              className="h-9 px-2 text-center"
            />
            <Input
              type="number"
              inputMode="decimal"
              value={fields[row.median]}
              onChange={(e) => setField(row.median, e.target.value)}
              className="h-9 px-2 text-center"
            />
            <Input
              type="number"
              inputMode="decimal"
              value={fields[row.max]}
              onChange={(e) => setField(row.max, e.target.value)}
              className="h-9 px-2 text-center"
            />
          </div>
        ))}
      </div>
    </div>
  );
}

export default function ChildGrowthPeriodForm({
  value,
  onChange,
  isNew,
  onSave,
  onDelete,
  saving,
  saveLabel = "Save",
}: ChildGrowthPeriodFormProps) {
  const [activeSection, setActiveSection] = useState<SectionKey>("overview");
  const [activeLocale, setActiveLocale] = useState<Locale>("en");
  const translation = value.translations[activeLocale];
  const milestones = translation.milestones;

  const setAgeMonths = (ageMonths: number) => {
    onChange({
      ...value,
      age_months: ageMonths,
      age_group: ageGroupForMonths(ageMonths),
    });
  };

  const updateTranslation = (patch: Partial<typeof translation>) => {
    onChange({
      ...value,
      translations: {
        ...value.translations,
        [activeLocale]: {
          ...value.translations[activeLocale],
          ...patch,
        },
      },
    });
  };

  const setTranslationField = (
    field: Exclude<
      keyof typeof translation,
      | "growth"
      | "vaccines"
      | "milestones"
      | "red_flags"
      | "nutrition"
      | "visit_reminders"
    >,
    fieldValue: string,
  ) => {
    updateTranslation({ [field]: fieldValue });
  };

  const updateGrowth = (patch: Partial<typeof translation.growth>) => {
    updateTranslation({ growth: { ...translation.growth, ...patch } });
  };

  const localeHasTitle = (locale: Locale) =>
    value.translations[locale].title.trim().length > 0;

  const localeTabs = (
    <div className="flex flex-wrap gap-2">
      {LOCALES.map((locale) => (
        <button
          key={locale}
          type="button"
          onClick={() => setActiveLocale(locale)}
          className={cn(
            "rounded-lg px-3 py-1.5 text-sm font-medium transition-colors",
            activeLocale === locale
              ? "bg-emerald-600 text-white"
              : "bg-gray-100 text-gray-600 hover:bg-gray-200",
            !localeHasTitle(locale) && activeLocale !== locale
              ? "opacity-60"
              : "",
          )}
        >
          {LOCALE_LABELS[locale]}
        </button>
      ))}
    </div>
  );

  return (
    <div className="space-y-5">
      <div className="sticky top-0 z-20 -mx-4 border-b border-gray-200 bg-white/95 px-4 py-3 backdrop-blur sm:-mx-6 sm:px-6">
        <div className="flex gap-1.5 overflow-x-auto pb-1">
          {SECTIONS.map((section) => (
            <button
              key={section.key}
              type="button"
              onClick={() => setActiveSection(section.key)}
              className={cn(
                "whitespace-nowrap rounded-full px-3 py-1.5 text-sm font-medium transition-colors",
                activeSection === section.key
                  ? "bg-emerald-600 text-white"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200",
              )}
            >
              {section.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">{localeTabs}</div>

      {activeSection === "overview" ? (
        <div className="space-y-5">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <Label htmlFor="age_months">Age (months)</Label>
              <Input
                id="age_months"
                type="number"
                min={0}
                max={216}
                disabled={!isNew}
                value={value.age_months ?? ""}
                onChange={(e) => setAgeMonths(Number(e.target.value))}
                className="mt-1.5"
              />
            </div>
            <div>
              <Label htmlFor="age_label">Age label</Label>
              <Input
                id="age_label"
                value={value.age_label}
                onChange={(e) => onChange({ ...value, age_label: e.target.value })}
                placeholder="e.g. 6 months"
                className="mt-1.5"
              />
            </div>
            <div>
              <Label htmlFor="age_group">Age group</Label>
              <select
                id="age_group"
                value={value.age_group}
                onChange={(e) =>
                  onChange({
                    ...value,
                    age_group: e.target.value as ChildAgeGroup,
                  })
                }
                className="mt-1.5 w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm"
              >
                {(Object.keys(CHILD_AGE_GROUP_LABELS) as ChildAgeGroup[]).map(
                  (group) => (
                    <option key={group} value={group}>
                      {CHILD_AGE_GROUP_LABELS[group]}
                    </option>
                  ),
                )}
              </select>
            </div>
            <div>
              <Label htmlFor="image_note">Image note</Label>
              <Input
                id="image_note"
                value={value.image_note}
                onChange={(e) =>
                  onChange({ ...value, image_note: e.target.value })
                }
                className="mt-1.5"
              />
            </div>
          </div>

          <label className="flex items-center gap-2 text-sm text-gray-700">
            <input
              type="checkbox"
              checked={value.is_published}
              onChange={(e) =>
                onChange({ ...value, is_published: e.target.checked })
              }
            />
            Published
          </label>

          <div className="space-y-4 rounded-xl border border-gray-200 bg-gray-50/80 p-4">
            <div>
              <Label>Title {activeLocale === "en" ? "*" : ""}</Label>
              <Input
                value={translation.title}
                onChange={(e) => setTranslationField("title", e.target.value)}
                className="mt-1.5"
              />
            </div>
            <div>
              <Label>Subtitle</Label>
              <Input
                value={translation.subtitle}
                onChange={(e) => setTranslationField("subtitle", e.target.value)}
                className="mt-1.5"
              />
            </div>
          </div>
        </div>
      ) : null}

      {activeSection === "growth" ? (
        <div className="space-y-5">
          <div className="space-y-4 rounded-xl border border-emerald-100 bg-emerald-50/40 p-4">
            <div>
              <Label className="text-base">Growth reference metrics</Label>
              <p className="mt-0.5 text-xs text-gray-500">
                Shared across languages. Powers the mobile growth chart,
                progress %, and status. Boys/girls text ranges are no longer
                edited here — use these numeric references only.
              </p>
            </div>
            <div className="grid gap-4 lg:grid-cols-2">
              <MetricSexFields
                label="Boys"
                fields={value.growth_metrics.boys}
                onChange={(boys) =>
                  onChange({
                    ...value,
                    growth_metrics: { ...value.growth_metrics, boys },
                  })
                }
              />
              <MetricSexFields
                label="Girls"
                fields={value.growth_metrics.girls}
                onChange={(girls) =>
                  onChange({
                    ...value,
                    growth_metrics: { ...value.growth_metrics, girls },
                  })
                }
              />
            </div>
          </div>

          <div className="space-y-4 rounded-xl border border-gray-200 bg-gray-50/80 p-4">
            <Label className="text-base">
              Growth notes ({LOCALE_LABELS[activeLocale]})
            </Label>
            <Textarea
              value={translation.growth.notes}
              onChange={(e) => updateGrowth({ notes: e.target.value })}
              rows={3}
              placeholder="Optional guidance for this age (shown in the app)"
              className="mt-1.5"
            />
          </div>
        </div>
      ) : null}

      {activeSection === "milestones" ? (
        <LearningPathFieldsEditor
          categories={milestones}
          onChange={(next) => updateTranslation({ milestones: next })}
        />
      ) : null}

      {activeSection === "red_flags" ? (
        <div className="space-y-4 rounded-xl border border-gray-200 bg-gray-50/80 p-4">
          <SectionFieldsEditor
            label="Red flags"
            sections={translation.red_flags}
            onChange={(red_flags) => updateTranslation({ red_flags })}
            urgentLabel="High priority alert"
          />
        </div>
      ) : null}

      {activeSection === "nutrition" ? (
        <div className="space-y-4 rounded-xl border border-gray-200 bg-gray-50/80 p-4">
          <SectionFieldsEditor
            label="Nutrition guidance"
            sections={translation.nutrition}
            onChange={(nutrition) => updateTranslation({ nutrition })}
          />
        </div>
      ) : null}

      {onSave ? (
        <div className="flex flex-wrap items-center gap-3 border-t border-gray-200 pt-4">
          <Button type="button" onClick={onSave} disabled={saving}>
            {saving ? "Saving…" : saveLabel}
          </Button>
          {onDelete ? (
            <Button type="button" variant="destructive" onClick={onDelete}>
              Delete
            </Button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
