"use client";

import { useEffect } from "react";
import Link from "next/link";
import { Heart } from "lucide-react";
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
import { fetchPregnancies } from "@/features/pregnancies/pregnanciesSlice";
import { formatDate } from "@/lib/format";
import { dailyTipWeekPath } from "@/lib/content/contentLabels";
import { formatGestationalAge, gestationalAge } from "@/lib/pregnancy";
import type { PregnancyStatus } from "@/lib/types/database";

function statusBadge(status: PregnancyStatus) {
  const styles: Record<PregnancyStatus, string> = {
    active: "bg-emerald-100 text-emerald-800",
    completed: "bg-gray-100 text-gray-700",
    miscarriage: "bg-amber-100 text-amber-800",
    terminated: "bg-red-100 text-red-700",
  };
  const labels: Record<PregnancyStatus, string> = {
    active: "Active",
    completed: "Completed",
    miscarriage: "Miscarriage",
    terminated: "Terminated",
  };
  return (
    <span
      className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${styles[status]}`}
    >
      {labels[status]}
    </span>
  );
}

export default function PregnanciesPage() {
  const dispatch = useAppDispatch();
  const { pregnancies, loading, error } = useAppSelector(
    (state) => state.pregnancies,
  );

  useEffect(() => {
    dispatch(fetchPregnancies());
  }, [dispatch]);

  const activeCount = pregnancies.filter((p) => p.status === "active").length;

  return (
    <>
      <PageHero
        title="Pregnancies"
        description="User → Pregnancy → Child. Each row is one pregnancy journey"
        icon={Heart}
        stat={{ label: "Active", value: activeCount }}
      />

      <div className="mx-auto max-w-[1200px] px-6 py-8 lg:px-8">
        {error ? (
          <div className="mb-4 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-600">
            {error}
          </div>
        ) : null}

        <div className="admin-table-wrap">
          <Table>
            <TableHeader>
              <TableRow className="border-b border-white/20 bg-gradient-to-r from-emerald-50/50 to-teal-50/50">
                <TableHead className="font-semibold text-gray-700">#</TableHead>
                <TableHead className="font-semibold text-gray-700">Mother</TableHead>
                <TableHead className="font-semibold text-gray-700">Status</TableHead>
                <TableHead className="font-semibold text-gray-700">LMP</TableHead>
                <TableHead className="font-semibold text-gray-700">EDD</TableHead>
                <TableHead className="font-semibold text-gray-700">Completed</TableHead>
                <TableHead className="font-semibold text-gray-700">Gestational age</TableHead>
                <TableHead className="font-semibold text-gray-700">Content</TableHead>
                <TableHead className="font-semibold text-gray-700">Hospital</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={9} className="py-8 text-center text-gray-500">
                    Loading pregnancies…
                  </TableCell>
                </TableRow>
              ) : pregnancies.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="py-8 text-center text-gray-500">
                    No pregnancy records found.
                  </TableCell>
                </TableRow>
              ) : (
                pregnancies.map((pregnancy) => {
                  const isActive = pregnancy.status === "active";
                  const age = isActive
                    ? gestationalAge(pregnancy.lmp_date, pregnancy.edd)
                    : null;

                  return (
                    <TableRow key={pregnancy.id}>
                      <TableCell>{pregnancy.pregnancy_number}</TableCell>
                      <TableCell>
                        <Link
                          href={`/admin/users/${pregnancy.user_id}`}
                          className="text-emerald-700 hover:underline"
                        >
                          {pregnancy.profiles?.full_name || "View profile"}
                        </Link>
                        {pregnancy.profiles?.phone ? (
                          <p className="text-xs text-gray-500">
                            {pregnancy.profiles.phone}
                          </p>
                        ) : null}
                      </TableCell>
                      <TableCell>{statusBadge(pregnancy.status)}</TableCell>
                      <TableCell>{formatDate(pregnancy.lmp_date)}</TableCell>
                      <TableCell>{formatDate(pregnancy.edd)}</TableCell>
                      <TableCell>{formatDate(pregnancy.completed_at)}</TableCell>
                      <TableCell>
                        {age ? formatGestationalAge(age) : "-"}
                      </TableCell>
                      <TableCell>
                        {age ? (
                          <div className="flex flex-col gap-1 text-sm">
                            <Link
                              href={`/admin/pregnancy-weeks/${age.week}`}
                              className="text-emerald-700 hover:underline"
                            >
                              Week {age.week} info
                            </Link>
                            <Link
                              href={dailyTipWeekPath(age.week)}
                              className="text-emerald-700 hover:underline"
                            >
                              Day {age.dayInWeek} tips
                            </Link>
                          </div>
                        ) : (
                          "-"
                        )}
                      </TableCell>
                      <TableCell>{pregnancy.hospital || "-"}</TableCell>
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
