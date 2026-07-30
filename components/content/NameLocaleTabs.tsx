"use client";

import { LOCALES } from "@/lib/constants";
import type { Locale } from "@/lib/types/database";
import type { NameTranslationsForm } from "@/lib/i18n/nameTranslations";
import { cn } from "@/lib/utils";

const LOCALE_LABELS: Record<Locale, string> = {
  en: "English",
  am: "Amharic",
  om: "Oromo",
};

type NameLocaleTabsProps = {
  active: Locale;
  translations: NameTranslationsForm;
  onChange: (locale: Locale) => void;
};

export default function NameLocaleTabs({
  active,
  translations,
  onChange,
}: NameLocaleTabsProps) {
  return (
    <div className="flex flex-wrap gap-2">
      {LOCALES.map((locale) => {
        const done = translations[locale].name.trim().length > 0;
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
                    : "bg-gray-300",
              )}
              title={done ? "Name added" : "Not started"}
            />
          </button>
        );
      })}
    </div>
  );
}
