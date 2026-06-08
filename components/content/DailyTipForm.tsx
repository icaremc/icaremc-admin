"use client";

import { useState } from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { LOCALES, PREGNANCY_DAY_NUMBERS, PREGNANCY_WEEK_NUMBERS } from "@/lib/constants";
import type { Locale } from "@/lib/types/database";
import type { DailyTipFormState } from "@/features/dailyTips/dailyTipsSlice";
import { cn } from "@/lib/utils";

const LOCALE_LABELS: Record<Locale, string> = {
  en: "English",
  am: "Amharic",
  om: "Afan Oromo",
};

const CATEGORY_OPTIONS = [
  { value: "", label: "None" },
  { value: "nutrition", label: "Nutrition" },
  { value: "exercise", label: "Exercise" },
  { value: "warning", label: "Warning" },
  { value: "emotional", label: "Emotional" },
  { value: "general", label: "General" },
];

type DailyTipFormProps = {
  value: DailyTipFormState;
  onChange: (value: DailyTipFormState) => void;
  lockWeek?: boolean;
  lockDay?: boolean;
};

export default function DailyTipForm({
  value,
  onChange,
  lockWeek,
  lockDay,
}: DailyTipFormProps) {
  const [activeLocale, setActiveLocale] = useState<Locale>("en");
  const translation = value.translations[activeLocale];

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

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-3">
        <div>
          <Label htmlFor="week_number">Pregnancy week</Label>
          {lockWeek ? (
            <Input
              id="week_number"
              value={value.week_number}
              readOnly
              className="mt-1.5 bg-gray-50"
            />
          ) : (
            <select
              id="week_number"
              className="mt-1.5 flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={value.week_number}
              onChange={(e) =>
                onChange({ ...value, week_number: Number(e.target.value) })
              }
            >
              {PREGNANCY_WEEK_NUMBERS.map((week) => (
                <option key={week} value={week}>
                  Week {week}
                </option>
              ))}
            </select>
          )}
        </div>

        <div>
          <Label htmlFor="day_number">Day in week</Label>
          {lockDay ? (
            <Input
              id="day_number"
              value={value.day_number ?? ""}
              readOnly
              className="mt-1.5 bg-gray-50"
            />
          ) : (
            <select
              id="day_number"
              className="mt-1.5 flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={value.day_number ?? ""}
              onChange={(e) =>
                onChange({
                  ...value,
                  day_number: e.target.value ? Number(e.target.value) : null,
                })
              }
            >
              <option value="">Not set</option>
              {PREGNANCY_DAY_NUMBERS.map((day) => (
                <option key={day} value={day}>
                  Day {day}
                </option>
              ))}
            </select>
          )}
        </div>

        <div>
          <Label htmlFor="category">Category</Label>
          <select
            id="category"
            className="mt-1.5 flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            value={value.category}
            onChange={(e) => onChange({ ...value, category: e.target.value })}
          >
            {CATEGORY_OPTIONS.map((option) => (
              <option key={option.value || "none"} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 border-b border-gray-200 pb-2">
        {LOCALES.map((locale) => (
          <button
            key={locale}
            type="button"
            className={cn(
              "rounded-full px-3 py-1 text-sm font-medium transition-colors",
              activeLocale === locale
                ? "bg-emerald-600 text-white"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200",
            )}
            onClick={() => setActiveLocale(locale)}
          >
            {LOCALE_LABELS[locale]}
          </button>
        ))}
      </div>

      <div className="space-y-4">
        <div>
          <Label htmlFor="title">
            Title{activeLocale === "en" ? " (optional — defaults from content)" : ""}
          </Label>
          <Input
            id="title"
            value={translation.title}
            onChange={(e) => updateTranslation({ title: e.target.value })}
            placeholder="Short headline for the tip"
            className="mt-1.5"
          />
        </div>

        <div>
          <Label htmlFor="content">
            Content{activeLocale === "en" ? " *" : ""}
          </Label>
          <Textarea
            id="content"
            value={translation.content}
            onChange={(e) => updateTranslation({ content: e.target.value })}
            placeholder="Health tip shown in the app"
            rows={5}
            className="mt-1.5"
          />
        </div>
      </div>
    </div>
  );
}
