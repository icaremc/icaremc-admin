"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect } from "react";
import { Lightbulb, Pencil } from "lucide-react";
import PageHero from "@/components/PageHero";
import DailyTipLanguageTitles from "@/components/content/DailyTipLanguageTitles";
import DailyTipStatusBadge from "@/components/content/DailyTipStatusBadge";
import { Button } from "@/components/ui/button";
import { LOCALES } from "@/lib/constants";
import {
  dailyTipBackPath,
  dailyTipEditPath,
  dailyTipHeroTitle,
} from "@/lib/content/contentLabels";
import { useAppDispatch, useAppSelector } from "@/app/store/hooks";
import {
  dailyTipsActions,
  fetchDailyTip,
} from "@/features/dailyTips/dailyTipsSlice";
import { formatDateTime } from "@/lib/format";
import type { Locale } from "@/lib/types/database";

const LOCALE_LABELS: Record<Locale, string> = {
  en: "English",
  am: "Amharic",
  om: "Oromo",
};

const LOCALE_FLAGS: Record<Locale, string> = {
  en: "🇬🇧",
  am: "🇪🇹",
  om: "🇪🇹",
};

export default function DailyTipDetailPage() {
  const params = useParams<{ entityId: string }>();
  const dispatch = useAppDispatch();
  const { selected, loading, error } = useAppSelector((state) => state.dailyTips);

  const tipId = decodeURIComponent(params.entityId);

  useEffect(() => {
    dispatch(dailyTipsActions.clearDailyTipMessages());
    dispatch(fetchDailyTip(tipId));
  }, [dispatch, tipId]);

  const heroTitle = selected ? dailyTipHeroTitle(selected) : "Daily tip";

  return (
    <>
      <PageHero
        title={heroTitle}
        description={
          selected
            ? `Week ${selected.week_number}${
                selected.day_number ? ` · Day ${selected.day_number}` : ""
              } · Updated ${formatDateTime(selected.updated_at)}`
            : "Daily tip"
        }
        icon={Lightbulb}
        stat={
          selected
            ? {
                label: "Status",
                value: selected.is_active ? "Active" : "Inactive",
              }
            : undefined
        }
      />

      <div className="mx-auto max-w-4xl px-6 py-8 lg:px-8">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <Link
            href={dailyTipBackPath(selected)}
            className="text-sm font-medium text-emerald-600 hover:underline"
          >
            ← Back to week
          </Link>
          {!loading && selected ? (
            <Link href={dailyTipEditPath(tipId)}>
              <Button>
                <Pencil className="mr-2 h-4 w-4" />
                Edit tip
              </Button>
            </Link>
          ) : null}
        </div>

        {error ? (
          <div className="mb-4 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-600">
            {error}
          </div>
        ) : null}

        {loading || !selected ? (
          <p className="text-sm text-gray-600">Loading tip…</p>
        ) : (
          <div className="space-y-6">
            <div className="admin-panel">
              <div className="flex flex-wrap items-center gap-3">
                <span className="rounded-lg bg-emerald-100 px-3 py-1 text-sm font-semibold text-emerald-800">
                  Week {selected.week_number}
                </span>
                {selected.day_number != null ? (
                  <span className="rounded-lg bg-teal-100 px-3 py-1 text-sm font-semibold text-teal-800">
                    Day {selected.day_number}
                  </span>
                ) : null}
                <DailyTipStatusBadge active={selected.is_active} />
                {selected.category ? (
                  <span className="rounded-lg bg-violet-100 px-3 py-1 text-sm capitalize text-violet-800">
                    {selected.category}
                  </span>
                ) : null}
              </div>

              <div className="mt-5">
                <p className="mb-2 text-xs font-medium uppercase tracking-wide text-gray-500">
                  Titles preview
                </p>
                <DailyTipLanguageTitles tip={selected} layout="compact" />
              </div>
            </div>

            <div className="grid gap-4">
              {LOCALES.map((locale) => {
                const row = selected.daily_tip_translations?.find(
                  (item) => item.language_code === locale,
                );
                if (!row) return null;

                return (
                  <article
                    key={locale}
                    className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm"
                  >
                    <div className="flex items-center gap-2 border-b border-gray-100 bg-gradient-to-r from-emerald-50 to-teal-50 px-4 py-3">
                      <span className="text-lg">{LOCALE_FLAGS[locale]}</span>
                      <h3 className="text-sm font-semibold text-gray-900">
                        {LOCALE_LABELS[locale]}
                      </h3>
                    </div>
                    <div className="space-y-3 p-4">
                      {row.title ? (
                        <div>
                          <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
                            Title
                          </p>
                          <p className="mt-1 text-base font-semibold text-gray-900">
                            {row.title}
                          </p>
                        </div>
                      ) : (
                        <p className="text-sm italic text-amber-700">
                          No title. Add one so it appears on the home screen
                        </p>
                      )}
                      <div>
                        <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
                          Content
                        </p>
                        <p className="mt-1 whitespace-pre-wrap text-sm leading-relaxed text-gray-700">
                          {row.content}
                        </p>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </>
  );
}
