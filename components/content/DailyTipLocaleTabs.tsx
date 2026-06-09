"use client";

import { LOCALES } from "@/lib/constants";
import type { Locale } from "@/lib/types/database";
import type { DailyTipFormTranslation } from "@/features/dailyTips/dailyTipsSlice";
import { cn } from "@/lib/utils";

const LOCALE_LABELS: Record<Locale, string> = {
  en: "English",
  am: "Amharic",
  om: "Oromo",
};

type DailyTipLocaleTabsProps = {
  active: Locale;
  translations: Record<Locale, DailyTipFormTranslation>;
  onChange: (locale: Locale) => void;
};

function isComplete(slice: DailyTipFormTranslation): boolean {
  return slice.title.trim().length > 0;
}

export default function DailyTipLocaleTabs({
  active,
  translations,
  onChange,
}: DailyTipLocaleTabsProps) {
  return (
    <div className="flex flex-wrap gap-2">
      {LOCALES.map((locale) => {
        const done = isComplete(translations[locale]);
        const hasContent = translations[locale].content.trim().length > 0;

        return (
          <button
            key={locale}
            type="button"
            className={cn(
              "inline-flex items-center gap-2 rounded-full border px-3.5 py-1.5 text-sm font-medium transition-colors",
              active === locale
                ? "border-emerald-600 bg-emerald-600 text-white shadow-sm"
                : "border-gray-200 bg-white text-gray-700 hover:border-emerald-200 hover:bg-emerald-50",
            )}
            onClick={() => onChange(locale)}
          >
            <span>{LOCALE_LABELS[locale]}</span>
            <span
              className={cn(
                "h-2 w-2 rounded-full",
                active === locale
                  ? done
                    ? "bg-white"
                    : "bg-white/50"
                  : done
                    ? "bg-emerald-500"
                    : hasContent
                      ? "bg-amber-400"
                      : "bg-gray-300",
              )}
              title={
                done
                  ? "Title added"
                  : hasContent
                    ? "Content only. Add a title"
                    : "Not started"
              }
            />
          </button>
        );
      })}
    </div>
  );
}
