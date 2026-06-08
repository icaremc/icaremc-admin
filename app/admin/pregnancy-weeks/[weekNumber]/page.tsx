"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect } from "react";
import { CalendarDays, Pencil } from "lucide-react";
import PregnancyWeekDetailView from "@/components/content/PregnancyWeekDetailView";
import PageHero from "@/components/PageHero";
import { Button } from "@/components/ui/button";
import { useAppDispatch, useAppSelector } from "@/app/store/hooks";
import {
  fetchPregnancyWeek,
  pregnancyWeeksActions,
} from "@/features/pregnancyWeeks/pregnancyWeeksSlice";
import { formatDateTime } from "@/lib/format";

export default function PregnancyWeekDetailPage() {
  const params = useParams<{ weekNumber: string }>();
  const dispatch = useAppDispatch();
  const { selected, loading, error } = useAppSelector(
    (state) => state.pregnancyWeeks,
  );

  const weekNumber = Number(params.weekNumber);
  const englishTitle = selected?.pregnancy_week_translations?.find(
    (item) => item.language_code === "en",
  )?.title;

  useEffect(() => {
    dispatch(pregnancyWeeksActions.clearPregnancyWeekMessages());
    if (!Number.isNaN(weekNumber)) {
      dispatch(fetchPregnancyWeek(weekNumber));
    }
  }, [dispatch, weekNumber]);

  return (
    <>
      <PageHero
        title={
          englishTitle
            ? englishTitle
            : Number.isNaN(weekNumber)
              ? "Pregnancy week"
              : `Week ${weekNumber}`
        }
        description={
          selected
            ? `Trimester ${selected.trimester} · Updated ${formatDateTime(selected.updated_at)}`
            : "Pregnancy week details"
        }
        icon={CalendarDays}
        stat={
          selected
            ? {
                label: "Week",
                value: selected.week_number,
              }
            : undefined
        }
      />

      <div className="mx-auto max-w-4xl px-6 py-8 lg:px-8">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <Link
            href="/admin/pregnancy-weeks"
            className="text-sm font-medium text-emerald-600 hover:underline"
          >
            ← Back to pregnancy weeks
          </Link>
          {!loading && selected ? (
            <Link href={`/admin/pregnancy-weeks/${weekNumber}/edit`}>
              <Button>
                <Pencil className="mr-2 h-4 w-4" />
                Edit week
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
          <p className="text-sm text-gray-600">Loading pregnancy week…</p>
        ) : selected ? (
          <PregnancyWeekDetailView week={selected} />
        ) : null}
      </div>
    </>
  );
}
