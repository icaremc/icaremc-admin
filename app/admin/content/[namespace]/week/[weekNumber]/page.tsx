"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useMemo } from "react";
import { FileText } from "lucide-react";
import PageHero from "@/components/PageHero";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useAppDispatch, useAppSelector } from "@/app/store/hooks";
import { fetchDailyTips } from "@/features/dailyTips/dailyTipsSlice";
import { PREGNANCY_DAY_NUMBERS, PREGNANCY_WEEK_NUMBERS } from "@/lib/constants";
import {
  dailyTipEditPath,
  dailyTipListLabel,
  dailyTipNewPath,
  dailyTipPath,
  dailyTipWeekPath,
} from "@/lib/content/contentLabels";
import type { DailyTip } from "@/lib/types/database";

function parseWeekNumber(raw: string): number | null {
  const parsed = Number(raw);
  if (!Number.isInteger(parsed) || parsed < 1 || parsed > 42) return null;
  return parsed;
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

  if (!isValidWeek) {
    return (
      <>
        <PageHero
          title="Invalid week"
          description="Choose a pregnancy week between 1 and 42"
          icon={FileText}
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
        title={`Week ${weekNumber} daily tips`}
        description="One tip per day (Day 1–7) shown during this pregnancy week"
        icon={FileText}
        stat={{ label: "Days filled", value: `${filledDays}/7` }}
      />

      <div className="mx-auto max-w-[1200px] px-6 py-8 lg:px-8">
        <div className="mb-6">
          <Link
            href="/admin/content/daily_tip"
            className="text-sm font-medium text-emerald-600 hover:underline"
          >
            ← Back to all weeks
          </Link>
        </div>

        {error ? (
          <div className="mb-4 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-600">
            {error}
          </div>
        ) : null}

        <div className="admin-table-wrap">
          <Table>
            <TableHeader>
              <TableRow className="border-b border-white/20 bg-gradient-to-r from-emerald-50/50 to-teal-50/50">
                <TableHead className="font-semibold text-gray-700">Day</TableHead>
                <TableHead className="font-semibold text-gray-700">Tip</TableHead>
                <TableHead className="font-semibold text-gray-700">Status</TableHead>
                <TableHead className="text-right font-semibold text-gray-700">
                  Actions
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={4} className="py-8 text-center text-gray-500">
                    Loading tips…
                  </TableCell>
                </TableRow>
              ) : (
                PREGNANCY_DAY_NUMBERS.map((day) => {
                  const tip = tipsByDay.get(day);

                  return (
                    <TableRow
                      key={day}
                      className={
                        tip
                          ? "cursor-pointer hover:bg-emerald-50/60"
                          : "hover:bg-gray-50/60"
                      }
                      onClick={() => {
                        if (tip) {
                          router.push(dailyTipPath(tip.id));
                        }
                      }}
                    >
                      <TableCell className="font-medium text-gray-900">
                        Day {day}
                      </TableCell>
                      <TableCell className="text-gray-700">
                        {tip ? (
                          dailyTipListLabel(tip)
                        ) : (
                          <span className="text-gray-400">No tip yet</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {tip ? (
                          <span
                            className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${
                              tip.is_active
                                ? "bg-emerald-50 text-emerald-700"
                                : "bg-amber-50 text-amber-700"
                            }`}
                          >
                            {tip.is_active ? "Active" : "Inactive"}
                          </span>
                        ) : (
                          <span className="text-xs text-gray-400">—</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        {tip ? (
                          <Link
                            href={dailyTipEditPath(tip.id)}
                            className="font-medium text-gray-600 hover:text-gray-900 hover:underline"
                            onClick={(e) => e.stopPropagation()}
                          >
                            Edit
                          </Link>
                        ) : (
                          <Link
                            href={dailyTipNewPath(weekNumber, day)}
                            className="font-medium text-emerald-600 hover:underline"
                          >
                            Add tip
                          </Link>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </>
  );
}
