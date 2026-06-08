"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { CalendarDays } from "lucide-react";
import PageHero from "@/components/PageHero";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useAppDispatch, useAppSelector } from "@/app/store/hooks";
import { fetchPregnancyWeeks } from "@/features/pregnancyWeeks/pregnancyWeeksSlice";
import { formatDateTime } from "@/lib/format";

export default function PregnancyWeeksPage() {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const { weeks, loading, error } = useAppSelector(
    (state) => state.pregnancyWeeks,
  );

  useEffect(() => {
    dispatch(fetchPregnancyWeeks());
  }, [dispatch]);

  return (
    <>
      <PageHero
        title="Pregnancy weeks"
        description="Normalized UUID records with per-language translations"
        icon={CalendarDays}
        stat={{ label: "Weeks", value: weeks.length }}
      />

      <div className="mx-auto max-w-[1200px] px-6 py-8 lg:px-8">
        <div className="mb-6 flex justify-end">
          <Link href="/admin/pregnancy-weeks/new">
            <Button>Add week</Button>
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
                <TableHead className="font-semibold text-gray-700">Week</TableHead>
                <TableHead className="font-semibold text-gray-700">Trimester</TableHead>
                <TableHead className="font-semibold text-gray-700">Languages</TableHead>
                <TableHead className="font-semibold text-gray-700">Status</TableHead>
                <TableHead className="font-semibold text-gray-700">Updated</TableHead>
                <TableHead className="text-right font-semibold text-gray-700">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={6} className="py-8 text-center text-gray-500">
                    Loading pregnancy weeks…
                  </TableCell>
                </TableRow>
              ) : weeks.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="py-8 text-center text-gray-500">
                    No pregnancy weeks yet. Run v2 migration or add a week.
                  </TableCell>
                </TableRow>
              ) : (
                weeks.map((week) => (
                  <TableRow
                    key={week.id}
                    className="cursor-pointer hover:bg-emerald-50/60"
                    onClick={() =>
                      router.push(`/admin/pregnancy-weeks/${week.week_number}`)
                    }
                  >
                    <TableCell className="font-medium text-gray-900">
                      Week {week.week_number}
                    </TableCell>
                    <TableCell>{week.trimester}</TableCell>
                    <TableCell>
                      {week.pregnancy_week_translations?.length ?? 0}
                    </TableCell>
                    <TableCell>
                      <span
                        className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${
                          week.is_published
                            ? "bg-emerald-50 text-emerald-700"
                            : "bg-amber-50 text-amber-700"
                        }`}
                      >
                        {week.is_published ? "Published" : "Draft"}
                      </span>
                    </TableCell>
                    <TableCell className="text-gray-600">
                      {formatDateTime(week.updated_at)}
                    </TableCell>
                    <TableCell className="text-right">
                      <Link
                        href={`/admin/pregnancy-weeks/${week.week_number}/edit`}
                        className="font-medium text-gray-600 hover:text-gray-900 hover:underline"
                        onClick={(e) => e.stopPropagation()}
                      >
                        Edit
                      </Link>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </>
  );
}
