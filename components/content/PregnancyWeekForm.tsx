"use client";

import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { LOCALES } from "@/lib/constants";
import { EMPTY_PREGNANCY_SECTION } from "@/lib/content/formTypes";
import type { Locale } from "@/lib/types/database";
import {
  type PregnancyWeekFormState,
  trimesterForWeek,
} from "@/features/pregnancyWeeks/pregnancyWeeksSlice";
import { cn } from "@/lib/utils";

const LOCALE_LABELS: Record<Locale, string> = {
  en: "English",
  am: "Amharic",
  om: "Afan Oromo",
};

type PregnancyWeekFormProps = {
  value: PregnancyWeekFormState;
  onChange: (value: PregnancyWeekFormState) => void;
  isNew?: boolean;
};

export default function PregnancyWeekForm({
  value,
  onChange,
  isNew,
}: PregnancyWeekFormProps) {
  const [activeLocale, setActiveLocale] = useState<Locale>("en");
  const translation = value.translations[activeLocale];
  const sections = translation.sections;

  const setWeekNumber = (weekNumber: number) => {
    onChange({
      ...value,
      week_number: weekNumber,
      trimester: trimesterForWeek(weekNumber),
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
    field: Exclude<keyof typeof translation, "sections">,
    fieldValue: string,
  ) => {
    updateTranslation({ [field]: fieldValue });
  };

  const updateSection = (
    index: number,
    patch: Partial<(typeof sections)[number]>,
  ) => {
    updateTranslation({
      sections: sections.map((section, i) =>
        i === index ? { ...section, ...patch } : section,
      ),
    });
  };

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-3">
        <div>
          <Label htmlFor="week_number">Week number</Label>
          <Input
            id="week_number"
            type="number"
            min={1}
            max={42}
            disabled={!isNew}
            value={value.week_number || ""}
            onChange={(e) => setWeekNumber(Number(e.target.value))}
            className="mt-1.5"
          />
        </div>
        <div>
          <Label>Trimester</Label>
          <Input
            value={value.trimester}
            disabled
            className="mt-1.5 bg-gray-50"
          />
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
        <div>
          <Label>Baby development</Label>
          <Textarea
            value={translation.baby_development}
            onChange={(e) =>
              setTranslationField("baby_development", e.target.value)
            }
            rows={3}
            className="mt-1.5"
          />
        </div>
        <div>
          <Label>Mother changes</Label>
          <Textarea
            value={translation.mother_changes}
            onChange={(e) =>
              setTranslationField("mother_changes", e.target.value)
            }
            rows={3}
            className="mt-1.5"
          />
        </div>
        <div>
          <Label>Recommendations</Label>
          <Textarea
            value={translation.recommendations}
            onChange={(e) =>
              setTranslationField("recommendations", e.target.value)
            }
            rows={3}
            className="mt-1.5"
          />
        </div>
        <div>
          <Label>Warning signs</Label>
          <Textarea
            value={translation.warning_signs}
            onChange={(e) =>
              setTranslationField("warning_signs", e.target.value)
            }
            rows={3}
            className="mt-1.5"
          />
        </div>

        <div className="space-y-4 border-t border-gray-200 pt-4">
          <div className="flex items-center justify-between">
            <Label>Sections</Label>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() =>
                updateTranslation({
                  sections: [...sections, { ...EMPTY_PREGNANCY_SECTION }],
                })
              }
            >
              <Plus className="mr-1 h-4 w-4" />
              Add section
            </Button>
          </div>

          {sections.map((section, index) => (
            <div
              key={index}
              className="space-y-3 rounded-xl border border-gray-200 bg-white p-4"
            >
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-gray-700">
                  Section {index + 1}
                </p>
                {sections.length > 1 ? (
                  <button
                    type="button"
                    onClick={() =>
                      updateTranslation({
                        sections: sections.filter((_, i) => i !== index),
                      })
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
                  onChange={(e) =>
                    updateSection(index, { title: e.target.value })
                  }
                  className="mt-1.5"
                />
              </div>
              <div>
                <Label>Body</Label>
                <Textarea
                  value={section.body}
                  onChange={(e) =>
                    updateSection(index, { body: e.target.value })
                  }
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
      </div>
    </div>
  );
}
