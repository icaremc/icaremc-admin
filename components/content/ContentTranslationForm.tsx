"use client";

import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  LOCALES,
  PREGNANCY_DAY_NUMBERS,
  PREGNANCY_WEEK_NUMBERS,
} from "@/lib/constants";
import {
  EMPTY_GROWTH,
  EMPTY_MILESTONE_CATEGORY,
  EMPTY_PREGNANCY_SECTION,
  fieldsForNamespace,
  type GrowthFields,
  type LocaleFormMap,
  type MilestoneCategoryFields,
  type PregnancySectionFields,
} from "@/lib/content/formTypes";
import type { ContentNamespace, Locale } from "@/lib/types/database";
import { cn } from "@/lib/utils";

const LOCALE_LABELS: Record<Locale, string> = {
  en: "English",
  am: "Amharic",
  om: "Afan Oromo",
};

type ContentTranslationFormProps = {
  namespace: ContentNamespace;
  value: LocaleFormMap;
  onChange: (value: LocaleFormMap) => void;
};

function updateLocale(
  value: LocaleFormMap,
  locale: Locale,
  patch: Record<string, unknown>,
): LocaleFormMap {
  return {
    ...value,
    [locale]: { ...value[locale], ...patch },
  };
}

export default function ContentTranslationForm({
  namespace,
  value,
  onChange,
}: ContentTranslationFormProps) {
  const [activeLocale, setActiveLocale] = useState<Locale>("en");
  const fields = fieldsForNamespace(namespace);
  const localeData = value[activeLocale] ?? {};

  const setField = (key: string, fieldValue: unknown) => {
    onChange(updateLocale(value, activeLocale, { [key]: fieldValue }));
  };

  const renderSimpleFields = () =>
    fields
      .filter(
        (field) =>
          !["sections", "categories", "growth"].includes(field.kind) &&
          !(namespace === "daily_tip" && field.key === "week_number") &&
          !(namespace === "daily_tip" && field.key === "day_number"),
      )
      .map((field) => {
        const fieldValue = String(localeData[field.key] ?? "");
        return (
          <div key={field.key}>
            <Label htmlFor={`${activeLocale}-${field.key}`}>
              {field.label}
              {field.required && activeLocale === "en" ? (
                <span className="ml-1 text-red-500">*</span>
              ) : null}
            </Label>
            {field.kind === "textarea" ? (
              <Textarea
                id={`${activeLocale}-${field.key}`}
                value={fieldValue}
                onChange={(e) => setField(field.key, e.target.value)}
                placeholder={field.placeholder}
                rows={field.key === "text" || field.key === "body" ? 4 : 3}
                className="mt-1.5"
              />
            ) : (
              <Input
                id={`${activeLocale}-${field.key}`}
                value={fieldValue}
                onChange={(e) => setField(field.key, e.target.value)}
                placeholder={field.placeholder}
                className="mt-1.5"
              />
            )}
          </div>
        );
      });

  const renderSections = () => {
    const sections = (localeData.sections as PregnancySectionFields[]) ?? [
      { ...EMPTY_PREGNANCY_SECTION },
    ];

    const updateSection = (
      index: number,
      patch: Partial<PregnancySectionFields>,
    ) => {
      const next = sections.map((section, i) =>
        i === index ? { ...section, ...patch } : section,
      );
      setField("sections", next);
    };

    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <Label>Sections</Label>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() =>
              setField("sections", [...sections, { ...EMPTY_PREGNANCY_SECTION }])
            }
          >
            <Plus className="mr-1 h-4 w-4" />
            Add section
          </Button>
        </div>
        {sections.map((section, index) => (
          <div
            key={index}
            className="space-y-3 rounded-xl border border-gray-200 bg-gray-50/80 p-4"
          >
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-gray-700">
                Section {index + 1}
              </p>
              {sections.length > 1 ? (
                <button
                  type="button"
                  onClick={() =>
                    setField(
                      "sections",
                      sections.filter((_, i) => i !== index),
                    )
                  }
                  className="text-gray-400 hover:text-red-600"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              ) : null}
            </div>
            <div>
              <Label>Section title</Label>
              <Input
                value={section.title}
                onChange={(e) => updateSection(index, { title: e.target.value })}
                className="mt-1.5"
              />
            </div>
            <div>
              <Label>Body</Label>
              <Textarea
                value={section.body}
                onChange={(e) => updateSection(index, { body: e.target.value })}
                rows={3}
                className="mt-1.5"
              />
            </div>
            <div>
              <Label>Bullet points (one per line)</Label>
              <Textarea
                value={section.bulletsText}
                onChange={(e) =>
                  updateSection(index, { bulletsText: e.target.value })
                }
                rows={3}
                placeholder="One bullet per line"
                className="mt-1.5"
              />
            </div>
            <label className="flex items-center gap-2 text-sm text-gray-700">
              <input
                type="checkbox"
                checked={section.is_urgent}
                onChange={(e) =>
                  updateSection(index, { is_urgent: e.target.checked })
                }
              />
              Mark as urgent
            </label>
          </div>
        ))}
      </div>
    );
  };

  const renderGrowth = (
    key: "growth_boys" | "growth_girls",
    title: string,
  ) => {
    const growth = (localeData[key] as GrowthFields) ?? { ...EMPTY_GROWTH };
    const updateGrowth = (patch: Partial<GrowthFields>) => {
      setField(key, { ...growth, ...patch });
    };

    return (
      <div className="space-y-3 rounded-xl border border-gray-200 bg-gray-50/80 p-4">
        <p className="text-sm font-medium text-gray-700">{title}</p>
        {(
          [
            ["weight_range", "Weight range"],
            ["length_range", "Length range"],
            ["head_circumference_range", "Head circumference range"],
            ["weight_average", "Weight average"],
            ["length_average", "Length average"],
            ["head_average", "Head average"],
          ] as const
        ).map(([fieldKey, label]) => (
          <div key={fieldKey}>
            <Label>{label}</Label>
            <Input
              value={growth[fieldKey]}
              onChange={(e) => updateGrowth({ [fieldKey]: e.target.value })}
              className="mt-1.5"
            />
          </div>
        ))}
      </div>
    );
  };

  const renderCategories = () => {
    const categories = (localeData.categories as MilestoneCategoryFields[]) ?? [
      { ...EMPTY_MILESTONE_CATEGORY },
    ];

    const updateCategory = (
      index: number,
      patch: Partial<MilestoneCategoryFields>,
    ) => {
      const next = categories.map((category, i) =>
        i === index ? { ...category, ...patch } : category,
      );
      setField("categories", next);
    };

    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <Label>Development categories</Label>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() =>
              setField("categories", [
                ...categories,
                { ...EMPTY_MILESTONE_CATEGORY },
              ])
            }
          >
            <Plus className="mr-1 h-4 w-4" />
            Add category
          </Button>
        </div>
        {categories.map((category, index) => (
          <div
            key={index}
            className="space-y-3 rounded-xl border border-gray-200 bg-gray-50/80 p-4"
          >
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-gray-700">
                Category {index + 1}
              </p>
              {categories.length > 1 ? (
                <button
                  type="button"
                  onClick={() =>
                    setField(
                      "categories",
                      categories.filter((_, i) => i !== index),
                    )
                  }
                  className="text-gray-400 hover:text-red-600"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              ) : null}
            </div>
            <div>
              <Label>Category title</Label>
              <Input
                value={category.title}
                onChange={(e) =>
                  updateCategory(index, { title: e.target.value })
                }
                className="mt-1.5"
              />
            </div>
            <div>
              <Label>Milestone items (one per line)</Label>
              <Textarea
                value={category.itemsText}
                onChange={(e) =>
                  updateCategory(index, { itemsText: e.target.value })
                }
                rows={4}
                placeholder="One milestone per line"
                className="mt-1.5"
              />
            </div>
          </div>
        ))}
      </div>
    );
  };

  const renderDailyTipWeek = () => {
    if (namespace !== "daily_tip") return null;
    const weekNumber = String(value.en?.week_number ?? "");
    const dayNumber = String(value.en?.day_number ?? "");

    return (
      <div className="space-y-4 rounded-xl border border-gray-200 bg-gray-50/80 p-4">
        <div>
          <Label htmlFor="week_number">Pregnancy week</Label>
          <select
            id="week_number"
            value={weekNumber}
            onChange={(e) =>
              onChange(updateLocale(value, "en", { week_number: e.target.value }))
            }
            className="mt-1.5 w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm"
          >
            <option value="">Select pregnancy week…</option>
            {PREGNANCY_WEEK_NUMBERS.map((week) => (
              <option key={week} value={String(week)}>
                Week {week}
              </option>
            ))}
          </select>
        </div>
        <div>
          <Label htmlFor="day_number">Day in week</Label>
          <select
            id="day_number"
            value={dayNumber}
            onChange={(e) =>
              onChange(updateLocale(value, "en", { day_number: e.target.value }))
            }
            className="mt-1.5 w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm"
          >
            <option value="">Select day…</option>
            {PREGNANCY_DAY_NUMBERS.map((day) => (
              <option key={day} value={String(day)}>
                Day {day}
              </option>
            ))}
          </select>
        </div>
        <p className="text-xs text-gray-500">
          One tip per day (1–7) within each pregnancy week. The app shows the tip
          matching the mother&apos;s current week and day.
        </p>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {renderDailyTipWeek()}
      <div>
        <Label className="mb-2 block">Language</Label>
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
              )}
            >
              {LOCALE_LABELS[locale]}
              {locale === "en" ? (
                <span className="ml-1 text-xs opacity-80">*</span>
              ) : null}
            </button>
          ))}
        </div>
        <p className="mt-2 text-xs text-gray-500">
          Fill in each language separately. English is required; Amharic and
          Oromo fall back to English in the app when empty.
        </p>
      </div>

      <div className="space-y-4">
        {renderSimpleFields()}
        {namespace === "milestone" ? (
          <>
            <div className="grid gap-4 lg:grid-cols-2">
              {renderGrowth("growth_boys", "Growth standards (boys)")}
              {renderGrowth("growth_girls", "Growth standards (girls)")}
            </div>
            {renderCategories()}
          </>
        ) : null}
      </div>
    </div>
  );
}
