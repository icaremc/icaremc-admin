"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useMemo } from "react";
import { ChevronLeft, ChevronRight, Lightbulb, Plus } from "lucide-react";
import PageHero from "@/components/PageHero";
import DailyTipLanguageTitles from "@/components/content/DailyTipLanguageTitles";
import DailyTipStatusBadge from "@/components/content/DailyTipStatusBadge";
import DailyTipWeekProgress from "@/components/content/DailyTipWeekProgress";
import { Button } from "@/components/ui/button";
import { useAppDispatch, useAppSelector } from "@/app/store/hooks";
import { fetchDailyTips } from "@/features/dailyTips/dailyTipsSlice";
import { PREGNANCY_DAY_NUMBERS, PREGNANCY_WEEK_NUMBERS } from "@/lib/constants";
import {
  dailyTipEditPath,
  dailyTipNewPath,
  dailyTipPath,
  dailyTipWeekPath,
} from "@/lib/content/contentLabels";
import { dailyTipAdjacentWeek } from "@/lib/content/dailyTipUi";
import type { DailyTip } from "@/lib/types/database";

function parseWeekNumber(raw: string): number | null {
  const parsed = Number(raw);
  if (!Number.isInteger(parsed) || parsed < 1 || parsed > 42) return null;
  return parsed;
}

function DaySlot({
  day,
  tip,
  weekNumber,
  onOpen,
}: {
  day: number;
  tip?: DailyTip;
  weekNumber: number;
  onOpen: (path: string) => void;
}) {
  const filled = Boolean(tip);

  return (
    <article
      className={`flex h-full flex-col rounded-xl border p-4 transition ${
        filled
          ? "cursor-pointer border-emerald-200 bg-gradient-to-br from-white to-emerald-50/40 hover:border-emerald-400 hover:shadow-md"
          : "border-dashed border-gray-200 bg-gray-50/60"
      }`}
      onClick={() => {
        if (tip) onOpen(dailyTipPath(tip.id));
      }}
    >
      <div className="mb-3 flex items-center justify-between gap-2">
        <span className="text-sm font-bold text-gray-900">Day {day}</span>
        {tip ? (
          <DailyTipStatusBadge active={tip.is_active} />
        ) : (
          <span className="text-[10px] font-medium uppercase tracking-wide text-gray-400">
            Empty
          </span>
        )}
      </div>

      {tip ? (
        <>
          <DailyTipLanguageTitles tip={tip} layout="stacked" maxTitleLength={40} />
          <div className="mt-auto pt-4">
            <Link
              href={dailyTipEditPath(tip.id)}
              className="text-xs font-medium text-gray-600 hover:text-gray-900 hover:underline"
              onClick={(e) => e.stopPropagation()}
            >
              Edit
            </Link>
          </div>
        </>
      ) : (
        <div className="flex flex-1 flex-col items-center justify-center py-6 text-center">
          <p className="text-xs text-gray-400">No tip for this day</p>
          <Link
            href={dailyTipNewPath(weekNumber, day)}
            className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-emerald-700 hover:underline"
            onClick={(e) => e.stopPropagation()}
          >
            <Plus className="h-3.5 w-3.5" />
            Add tip
          </Link>
        </div>
      )}
    </article>
  );
}

export default function DailyTipWeekPage() {
  const params = useParams<{ namespace: string; weekNumber: string }>();
  const router = useRouter();
  const dispatch = useAppDispatch();
  const { tips, loading, error } = useAppSelector((state) => state.dailyTips);

  const weekNumber = parseWeekNumber(params.weekNumber);
  const isValidWeek =
    weekNumber !== null && PREGNANCY_WEEK_NUMBERS.includes(weekNumber);

  useEffect(() => {
    dispatch(fetchDailyTips());
  }, [dispatch]);

  const tipsByDay = useMemo(() => {
    const map = new Map<number, DailyTip>();
    if (!isValidWeek || weekNumber === null) return map;

    for (const tip of tips) {
      if (tip.week_number !== weekNumber) continue;
      if (tip.day_number !== null) map.set(tip.day_number, tip);
    }
    return map;
  }, [tips, isValidWeek, weekNumber]);

  const filledDays = tipsByDay.size;
  const prevWeek = weekNumber != null ? dailyTipAdjacentWeek(weekNumber, -1) : null;
  const nextWeek = weekNumber != null ? dailyTipAdjacentWeek(weekNumber, 1) : null;

  if (!isValidWeek) {
    return (
      <>
        <PageHero
          title="Invalid week"
          description="Choose a pregnancy week between 1 and 42"
          icon={Lightbulb}
        />
        <div className="mx-auto max-w-[1200px] px-6 py-8 lg:px-8">
          <Link
            href="/admin/content/daily_tip"
            className="text-sm font-medium text-emerald-600 hover:underline"
          >
            ← Back to all weeks
          </Link>
        </div>
      </>
    );
  }

  return (
    <>
      <PageHero
        title={`Week ${weekNumber}`}
        description="One tip per day. Mothers in this gestational week see the matching day"
        icon={Lightbulb}
        stat={{ label: "Days filled", value: `${filledDays}/7` }}
      />

      <div className="mx-auto max-w-[1200px] px-6 py-8 lg:px-8">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <Link
            href="/admin/content/daily_tip"
            className="text-sm font-medium text-emerald-600 hover:underline"
          >
            ← All weeks
          </Link>
          <div className="flex items-center gap-2">
            {prevWeek ? (
              <Link href={dailyTipWeekPath(prevWeek)}>
                <Button variant="outline" size="sm">
                  <ChevronLeft className="mr-1 h-4 w-4" />
                  Week {prevWeek}
                </Button>
              </Link>
            ) : null}
            {nextWeek ? (
              <Link href={dailyTipWeekPath(nextWeek)}>
                <Button variant="outline" size="sm">
                  Week {nextWeek}
                  <ChevronRight className="ml-1 h-4 w-4" />
                </Button>
              </Link>
            ) : null}
          </div>
        </div>

        {error ? (
          <div className="mb-4 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-600">
            {error}
          </div>
        ) : null}

        <div className="admin-panel mb-6">
          <DailyTipWeekProgress daysFilled={filledDays} />
        </div>

        {loading ? (
          <div className="admin-panel py-12 text-center text-sm text-gray-500">
            Loading week…
          </div>
        ) : (
          <>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {PREGNANCY_DAY_NUMBERS.map((day) => (
                <DaySlot
                  key={day}
                  day={day}
                  weekNumber={weekNumber}
                  tip={tipsByDay.get(day)}
                  onOpen={(path) => router.push(path)}
                />
              ))}
            </div>
          </>
        )}
      </div>
    </>
  );
}
