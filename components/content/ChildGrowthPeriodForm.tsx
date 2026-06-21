"use client";

import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
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
import {
  EMPTY_MILESTONE_CATEGORY,
  type GrowthFields,
} from "@/lib/content/formTypes";
import type { Locale } from "@/lib/types/database";
import type { ChildGrowthPeriodFormState } from "@/features/childGrowth/childGrowthSlice";
import { cn } from "@/lib/utils";

const LOCALE_LABELS: Record<Locale, string> = {
  en: "English",
  am: "Amharic",
  om: "Afan Oromo",
};

type ChildGrowthPeriodFormProps = {
  value: ChildGrowthPeriodFormState;
  onChange: (value: ChildGrowthPeriodFormState) => void;
  isNew?: boolean;
};

function GrowthSexFields({
  label,
  fields,
  onChange,
}: {
  label: string;
  fields: GrowthFields;
  onChange: (fields: GrowthFields) => void;
}) {
  const setField = (key: keyof GrowthFields, fieldValue: string) => {
    onChange({ ...fields, [key]: fieldValue });
  };

  return (
    <div className="space-y-3 rounded-xl border border-gray-200 bg-white p-4">
      <p className="text-sm font-semibold text-gray-800">{label}</p>
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <Label>Weight range</Label>
          <Input
            value={fields.weight_range}
            onChange={(e) => setField("weight_range", e.target.value)}
            placeholder="e.g. 4.4–7.0 kg"
            className="mt-1.5"
          />
        </div>
        <div>
          <Label>Length range</Label>
          <Input
            value={fields.length_range}
            onChange={(e) => setField("length_range", e.target.value)}
            placeholder="e.g. 54–61 cm"
            className="mt-1.5"
          />
        </div>
        <div>
          <Label>Head circumference range</Label>
          <Input
            value={fields.head_circumference_range}
            onChange={(e) =>
              setField("head_circumference_range", e.target.value)
            }
            placeholder="e.g. 36.9–41.3 cm"
            className="mt-1.5"
          />
        </div>
        <div>
          <Label>Weight average</Label>
          <Input
            value={fields.weight_average}
            onChange={(e) => setField("weight_average", e.target.value)}
            className="mt-1.5"
          />
        </div>
        <div>
          <Label>Length average</Label>
          <Input
            value={fields.length_average}
            onChange={(e) => setField("length_average", e.target.value)}
            className="mt-1.5"
          />
        </div>
        <div>
          <Label>Head average</Label>
          <Input
            value={fields.head_average}
            onChange={(e) => setField("head_average", e.target.value)}
            className="mt-1.5"
          />
        </div>
      </div>
    </div>
  );
}

export default function ChildGrowthPeriodForm({
  value,
  onChange,
  isNew,
}: ChildGrowthPeriodFormProps) {
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

  const updateTranslation = (
    patch: Partial<typeof translation>,
  ) => {
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
    field: Exclude<keyof typeof translation, "growth" | "vaccines" | "milestones" | "red_flags" | "nutrition" | "visit_reminders">,
    fieldValue: string,
  ) => {
    updateTranslation({ [field]: fieldValue });
  };

  const updateGrowth = (
    patch: Partial<typeof translation.growth>,
  ) => {
    updateTranslation({
      growth: { ...translation.growth, ...patch },
    });
  };

  const updateMilestone = (
    index: number,
    patch: Partial<(typeof milestones)[number]>,
  ) => {
    updateTranslation({
      milestones: milestones.map((category, i) =>
        i === index ? { ...category, ...patch } : category,
      ),
    });
  };

  return (
    <div className="space-y-6">
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
            onChange={(e) =>
              onChange({ ...value, age_label: e.target.value })
            }
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
          </button>
        ))}
      </div>

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

        <div className="space-y-4 border-t border-gray-200 pt-4">
          <Label className="text-base">Growth tracking</Label>
          <div>
            <Label>Notes</Label>
            <Textarea
              value={translation.growth.notes}
              onChange={(e) => updateGrowth({ notes: e.target.value })}
              rows={2}
              placeholder="General growth guidance for this age"
              className="mt-1.5"
            />
          </div>
          <GrowthSexFields
            label="Boys"
            fields={translation.growth.boys}
            onChange={(boys) => updateGrowth({ boys })}
          />
          <GrowthSexFields
            label="Girls"
            fields={translation.growth.girls}
            onChange={(girls) => updateGrowth({ girls })}
          />
        </div>

        <SectionFieldsEditor
          label="Vaccines"
          sections={translation.vaccines}
          onChange={(vaccines) => updateTranslation({ vaccines })}
        />

        <div className="space-y-4 border-t border-gray-200 pt-4">
          <div className="flex items-center justify-between">
            <Label>Developmental milestones</Label>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() =>
                updateTranslation({
                  milestones: [
                    ...milestones,
                    { ...EMPTY_MILESTONE_CATEGORY },
                  ],
                })
              }
            >
              <Plus className="mr-1 h-4 w-4" />
              Add category
            </Button>
          </div>

          {milestones.map((category, index) => (
            <div
              key={index}
              className="space-y-3 rounded-xl border border-gray-200 bg-white p-4"
            >
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-gray-700">
                  Category {index + 1}
                </p>
                {milestones.length > 1 ? (
                  <button
                    type="button"
                    onClick={() =>
                      updateTranslation({
                        milestones: milestones.filter((_, i) => i !== index),
                      })
                    }
                    className="text-gray-400 hover:text-red-600"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                ) : null}
              </div>
              <div>
                <Label>Category (e.g. Communication, Motor)</Label>
                <Input
                  value={category.title}
                  onChange={(e) =>
                    updateMilestone(index, { title: e.target.value })
                  }
                  className="mt-1.5"
                />
              </div>
              <div>
                <Label>Milestones (one per line)</Label>
                <Textarea
                  value={category.itemsText}
                  onChange={(e) =>
                    updateMilestone(index, { itemsText: e.target.value })
                  }
                  rows={4}
                  placeholder="One milestone per line"
                  className="mt-1.5"
                />
              </div>
            </div>
          ))}
        </div>

        <SectionFieldsEditor
          label="Red flags"
          sections={translation.red_flags}
          onChange={(red_flags) => updateTranslation({ red_flags })}
          urgentLabel="High priority alert"
        />

        <SectionFieldsEditor
          label="Nutrition guidance"
          sections={translation.nutrition}
          onChange={(nutrition) => updateTranslation({ nutrition })}
        />

        <SectionFieldsEditor
          label="Visit reminders"
          sections={translation.visit_reminders}
          onChange={(visit_reminders) => updateTranslation({ visit_reminders })}
        />
      </div>
    </div>
  );
}
