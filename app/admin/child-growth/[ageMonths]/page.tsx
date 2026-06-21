"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect } from "react";
import { Pencil, TrendingUp } from "lucide-react";
import ChildGrowthPeriodDetailView from "@/components/content/ChildGrowthPeriodDetailView";
import PageHero from "@/components/PageHero";
import { Button } from "@/components/ui/button";
import { useAppDispatch, useAppSelector } from "@/app/store/hooks";
import {
  childGrowthActions,
  fetchChildGrowthPeriod,
} from "@/features/childGrowth/childGrowthSlice";
import { formatDateTime } from "@/lib/format";

export default function ChildGrowthPeriodDetailPage() {
  const params = useParams<{ ageMonths: string }>();
  const dispatch = useAppDispatch();
  const { selected, loading, error } = useAppSelector((state) => state.childGrowth);

  const ageMonths = Number(params.ageMonths);
  const englishTitle = selected?.child_growth_period_translations?.find(
    (item) => item.language_code === "en",
  )?.title;

  useEffect(() => {
    dispatch(childGrowthActions.clearChildGrowthMessages());
    if (!Number.isNaN(ageMonths)) {
      dispatch(fetchChildGrowthPeriod(ageMonths));
    }
  }, [dispatch, ageMonths]);

  return (
    <>
      <PageHero
        title={
          englishTitle
            ? englishTitle
            : Number.isNaN(ageMonths)
              ? "Child growth period"
              : selected?.age_label ?? `${ageMonths} months`
        }
        description={
          selected
            ? `${selected.age_label} · Updated ${formatDateTime(selected.updated_at)}`
            : "Child growth period details"
        }
        icon={TrendingUp}
        stat={
          selected
            ? {
                label: "Months",
                value: selected.age_months,
              }
            : undefined
        }
      />

      <div className="mx-auto max-w-4xl px-6 py-8 lg:px-8">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <Link
            href="/admin/child-growth"
            className="text-sm font-medium text-emerald-600 hover:underline"
          >
            ← Back to timeline
          </Link>
          {!loading && selected ? (
            <Link href={`/admin/child-growth/${ageMonths}/edit`}>
              <Button>
                <Pencil className="mr-2 h-4 w-4" />
                Edit period
              </Button>
            </Link>
          ) : null}
        </div>

        {error ? (
          <div className="mb-4 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-600">
            {error}
          </div>
        ) : null}

        {loading ? (
          <p className="text-sm text-gray-600">Loading period…</p>
        ) : selected ? (
          <ChildGrowthPeriodDetailView period={selected} />
        ) : null}
      </div>
    </>
  );
}
