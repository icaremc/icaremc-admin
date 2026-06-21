"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { TrendingUp } from "lucide-react";
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
import { fetchChildGrowthPeriods } from "@/features/childGrowth/childGrowthSlice";
import { CHILD_AGE_GROUP_LABELS, type ChildAgeGroup } from "@/lib/childGrowth/periods";
import { formatDateTime } from "@/lib/format";

export default function ChildGrowthPage() {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const { periods, loading, error } = useAppSelector((state) => state.childGrowth);

  useEffect(() => {
    dispatch(fetchChildGrowthPeriods());
  }, [dispatch]);

  return (
    <>
      <PageHero
        title="Child milestones"
        description="Growth, vaccines, milestones, red flags, nutrition, and visit reminders (0–18 years) in English, Amharic, and Oromo"
        icon={TrendingUp}
        stat={{ label: "Periods", value: periods.length }}
      />

      <div className="mx-auto max-w-[1200px] px-6 py-8 lg:px-8">
        <div className="mb-6 flex justify-end">
          <Link href="/admin/child-growth/new">
            <Button>Add period</Button>
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
                <TableHead className="font-semibold text-gray-700">Age</TableHead>
                <TableHead className="font-semibold text-gray-700">Months</TableHead>
                <TableHead className="font-semibold text-gray-700">Group</TableHead>
                <TableHead className="font-semibold text-gray-700">Languages</TableHead>
                <TableHead className="font-semibold text-gray-700">Status</TableHead>
                <TableHead className="font-semibold text-gray-700">Updated</TableHead>
                <TableHead className="text-right font-semibold text-gray-700">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={7} className="py-8 text-center text-gray-500">
                    Loading child growth periods…
                  </TableCell>
                </TableRow>
              ) : periods.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="py-8 text-center text-gray-500">
                    No periods yet. Add a checkpoint (e.g. newborn, 2 months, 6 months).
                  </TableCell>
                </TableRow>
              ) : (
                periods.map((period) => (
                  <TableRow
                    key={period.id}
                    className="cursor-pointer hover:bg-emerald-50/60"
                    onClick={() =>
                      router.push(`/admin/child-growth/${period.age_months}`)
                    }
                  >
                    <TableCell className="font-medium text-gray-900">
                      {period.age_label}
                    </TableCell>
                    <TableCell>{period.age_months}</TableCell>
                    <TableCell>
                      {CHILD_AGE_GROUP_LABELS[period.age_group as ChildAgeGroup] ??
                        period.age_group}
                    </TableCell>
                    <TableCell>
                      {period.child_growth_period_translations?.length ?? 0}
                    </TableCell>
                    <TableCell>
                      <span
                        className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${
                          period.is_published
                            ? "bg-emerald-50 text-emerald-700"
                            : "bg-amber-50 text-amber-700"
                        }`}
                      >
                        {period.is_published ? "Published" : "Draft"}
                      </span>
                    </TableCell>
                    <TableCell className="text-gray-600">
                      {formatDateTime(period.updated_at)}
                    </TableCell>
                    <TableCell className="text-right">
                      <Link
                        href={`/admin/child-growth/${period.age_months}/edit`}
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
