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
import { fetchMothers } from "@/features/mothers/mothersSlice";
import { formatDate } from "@/lib/format";
import { dailyTipWeekPath } from "@/lib/content/contentLabels";
import { formatGestationalAge, gestationalAge } from "@/lib/pregnancy";

function statusBadge(status: string | undefined) {
  const value = status ?? "active";
  if (value === "delivered") {
    return (
      <span className="rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-700">
        Delivered
      </span>
    );
  }
  return (
    <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-medium text-emerald-800">
      Active
    </span>
  );
}

export default function MothersPage() {
  const dispatch = useAppDispatch();
  const { mothers, loading, error } = useAppSelector((state) => state.mothers);

  useEffect(() => {
    dispatch(fetchMothers());
  }, [dispatch]);

  const activeCount = mothers.filter((m) => (m.status ?? "active") === "active").length;

  return (
    <>
      <PageHero
        title="Pregnancies"
        description="Each row is one pregnancy — mothers can have multiple active/delivered records"
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
                <TableHead className="font-semibold text-gray-700">Pregnancy ID</TableHead>
                <TableHead className="font-semibold text-gray-700">User ID</TableHead>
                <TableHead className="font-semibold text-gray-700">Status</TableHead>
                <TableHead className="font-semibold text-gray-700">Start date</TableHead>
                <TableHead className="font-semibold text-gray-700">Due date</TableHead>
                <TableHead className="font-semibold text-gray-700">Delivered</TableHead>
                <TableHead className="font-semibold text-gray-700">Gestational age</TableHead>
                <TableHead className="font-semibold text-gray-700">Content</TableHead>
                <TableHead className="font-semibold text-gray-700">First</TableHead>
                <TableHead className="font-semibold text-gray-700">Hospital</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={10} className="py-8 text-center text-gray-500">
                    Loading pregnancies…
                  </TableCell>
                </TableRow>
              ) : mothers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={10} className="py-8 text-center text-gray-500">
                    No pregnancy records found.
                  </TableCell>
                </TableRow>
              ) : (
                mothers.map((mother) => {
                  const isActive = (mother.status ?? "active") === "active";
                  const age = isActive
                    ? gestationalAge(mother.pregnancy_start_date, mother.due_date)
                    : null;

                  return (
                    <TableRow key={mother.id}>
                      <TableCell className="font-mono text-xs text-gray-600">
                        {mother.id.slice(0, 8)}…
                      </TableCell>
                      <TableCell className="font-mono text-xs text-gray-600">
                        {mother.user_id.slice(0, 8)}…
                      </TableCell>
                      <TableCell>{statusBadge(mother.status)}</TableCell>
                      <TableCell>{formatDate(mother.pregnancy_start_date)}</TableCell>
                      <TableCell>{formatDate(mother.due_date)}</TableCell>
                      <TableCell>{formatDate(mother.delivered_at)}</TableCell>
                      <TableCell>
                        {age ? formatGestationalAge(age) : "—"}
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
                          "—"
                        )}
                      </TableCell>
                      <TableCell>{mother.is_first_pregnancy ? "Yes" : "No"}</TableCell>
                      <TableCell>{mother.hospital || "—"}</TableCell>
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
