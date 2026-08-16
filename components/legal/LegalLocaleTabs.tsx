"use client";

import { LOCALES } from "@/lib/constants";
import { LEGAL_LOCALE_LABELS } from "@/lib/legal/legalDocuments";
import type { Locale } from "@/lib/types/database";
import { cn } from "@/lib/utils";

type LegalLocaleTabsProps = {
  active: Locale;
  hasLocale: (locale: Locale) => boolean;
  onChange: (locale: Locale) => void;
  disabled?: boolean;
};

export function LegalLocaleTabs({
  active,
  hasLocale,
  onChange,
  disabled,
}: LegalLocaleTabsProps) {
  return (
    <div className="flex flex-wrap gap-2">
      {LOCALES.map((locale) => {
        const done = hasLocale(locale);
        return (
          <button
            key={locale}
            type="button"
            disabled={disabled}
            className={cn(
              "inline-flex items-center gap-2 rounded-full border px-3.5 py-1.5 text-sm font-medium transition-colors",
              active === locale
                ? "border-emerald-600 bg-emerald-600 text-white shadow-sm"
                : "border-gray-200 bg-white text-gray-700 hover:border-emerald-200 hover:bg-emerald-50",
              disabled ? "opacity-60" : "",
            )}
            onClick={() => onChange(locale)}
          >
            <span>{LEGAL_LOCALE_LABELS[locale]}</span>
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
            />
          </button>
        );
      })}
    </div>
  );
}
