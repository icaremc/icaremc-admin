"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect } from "react";
import { FileText, Pencil } from "lucide-react";
import PageHero from "@/components/PageHero";
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
  om: "Afan Oromo",
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

  const heroTitle = selected ? dailyTipHeroTitle(selected) : tipId;

  return (
    <>
      <PageHero
        title={heroTitle}
        description={
          selected
            ? `Daily tip · Week ${selected.week_number}${
                selected.day_number ? `, day ${selected.day_number}` : ""
              } · Updated ${formatDateTime(selected.updated_at)}`
            : "Daily tip"
        }
        icon={FileText}
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
          <div className="admin-panel space-y-6">
            <dl className="grid gap-4 sm:grid-cols-3">
              <div>
                <dt className="text-xs font-medium uppercase tracking-wide text-gray-500">
                  Week
                </dt>
                <dd className="mt-1 text-sm text-gray-900">{selected.week_number}</dd>
              </div>
              <div>
                <dt className="text-xs font-medium uppercase tracking-wide text-gray-500">
                  Day
                </dt>
                <dd className="mt-1 text-sm text-gray-900">
                  {selected.day_number ?? "—"}
                </dd>
              </div>
              <div>
                <dt className="text-xs font-medium uppercase tracking-wide text-gray-500">
                  Category
                </dt>
                <dd className="mt-1 text-sm text-gray-900">
                  {selected.category ?? "—"}
                </dd>
              </div>
            </dl>

            {LOCALES.map((locale) => {
              const row = selected.daily_tip_translations?.find(
                (item) => item.language_code === locale,
              );
              if (!row) return null;

              return (
                <div key={locale} className="border-t border-gray-200 pt-4">
                  <h3 className="text-sm font-semibold text-gray-900">
                    {LOCALE_LABELS[locale]}
                  </h3>
                  {row.title ? (
                    <p className="mt-2 font-medium text-gray-800">{row.title}</p>
                  ) : null}
                  <p className="mt-2 whitespace-pre-wrap text-sm text-gray-700">
                    {row.content}
                  </p>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </>
  );
}
