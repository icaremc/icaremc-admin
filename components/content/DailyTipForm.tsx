"use client";

import { useState } from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import DailyTipLocaleTabs from "@/components/content/DailyTipLocaleTabs";
import { PREGNANCY_DAY_NUMBERS, PREGNANCY_WEEK_NUMBERS } from "@/lib/constants";
import type { Locale } from "@/lib/types/database";
import type { DailyTipFormState } from "@/features/dailyTips/dailyTipsSlice";

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
    <div className="space-y-8">
      <section className="rounded-xl border border-gray-200 bg-gray-50/50 p-5">
        <h3 className="mb-4 text-sm font-semibold text-gray-900">Schedule</h3>
        <div className="grid gap-4 sm:grid-cols-3">
          <div>
            <Label htmlFor="week_number">Pregnancy week</Label>
            {lockWeek ? (
              <Input
                id="week_number"
                value={`Week ${value.week_number}`}
                readOnly
                className="mt-1.5 bg-white"
              />
            ) : (
              <select
                id="week_number"
                className="mt-1.5 flex h-10 w-full rounded-md border border-input bg-white px-3 py-2 text-sm"
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
                value={`Day ${value.day_number ?? 1}`}
                readOnly
                className="mt-1.5 bg-white"
              />
            ) : (
              <select
                id="day_number"
                className="mt-1.5 flex h-10 w-full rounded-md border border-input bg-white px-3 py-2 text-sm"
                value={value.day_number ?? 1}
                onChange={(e) =>
                  onChange({
                    ...value,
                    day_number: Number(e.target.value),
                  })
                }
              >
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
              className="mt-1.5 flex h-10 w-full rounded-md border border-input bg-white px-3 py-2 text-sm"
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
      </section>

      <section className="rounded-xl border border-gray-200 p-5">
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="text-sm font-semibold text-gray-900">Translations</h3>
            <p className="text-xs text-gray-500">
              Add a title per language, shown on the home screen in the app
            </p>
          </div>
        </div>

        <DailyTipLocaleTabs
          active={activeLocale}
          translations={value.translations}
          onChange={setActiveLocale}
        />

        <div className="mt-5 space-y-4 rounded-lg bg-gradient-to-br from-emerald-50/80 to-teal-50/40 p-4">
          <div>
            <Label htmlFor="title">
              Title
              {activeLocale === "en" ? (
                <span className="ml-1 font-normal text-gray-500">(recommended)</span>
              ) : null}
            </Label>
            <Input
              id="title"
              value={translation.title}
              onChange={(e) => updateTranslation({ title: e.target.value })}
              placeholder="Short headline mothers see first"
              className="mt-1.5 border-emerald-200/60 bg-white"
            />
          </div>

          <div>
            <Label htmlFor="content">
              Content
              {activeLocale === "en" ? (
                <span className="ml-1 text-red-500">*</span>
              ) : null}
            </Label>
            <Textarea
              id="content"
              value={translation.content}
              onChange={(e) => updateTranslation({ content: e.target.value })}
              placeholder="Full health tip body text"
              rows={5}
              className="mt-1.5 border-emerald-200/60 bg-white"
            />
          </div>
        </div>
      </section>
    </div>
  );
}
