"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { LayoutGrid, List, Pencil } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  CHILD_AGE_GROUP_LABELS,
  type ChildAgeGroup,
} from "@/lib/childGrowth/periods";
import { formatDateTime } from "@/lib/format";
import type { ChildGrowthPeriod } from "@/lib/types/database";
import { cn } from "@/lib/utils";

type ViewMode = "table" | "cards";

const VIEW_STORAGE_KEY = "icare.child-growth.view";

type ChildGrowthPeriodsListProps = {
  periods: ChildGrowthPeriod[];
  loading: boolean;
  canManageContent: boolean;
};

function englishTranslation(period: ChildGrowthPeriod) {
  return period.child_growth_period_translations?.find(
    (item) => item.language_code === "en",
  );
}

function checklistCount(period: ChildGrowthPeriod) {
  const milestones = englishTranslation(period)?.milestones ?? [];
  return milestones.reduce(
    (sum, category) => sum + (category.items?.length ?? 0),
    0,
  );
}

function StatusBadge({ published }: { published: boolean }) {
  return (
    <span
      className={cn(
        "inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium",
        published
          ? "bg-emerald-50 text-emerald-700"
          : "bg-amber-50 text-amber-700",
      )}
    >
      {published ? "Published" : "Draft"}
    </span>
  );
}

function groupLabel(period: ChildGrowthPeriod) {
  return (
    CHILD_AGE_GROUP_LABELS[period.age_group as ChildAgeGroup] ??
    period.age_group
  );
}

export default function ChildGrowthPeriodsList({
  periods,
  loading,
  canManageContent,
}: ChildGrowthPeriodsListProps) {
  const router = useRouter();
  const [view, setView] = useState<ViewMode>("cards");
  const [groupFilter, setGroupFilter] = useState<ChildAgeGroup | "all">("all");

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(VIEW_STORAGE_KEY);
      if (saved === "table" || saved === "cards") setView(saved);
    } catch {
      // ignore storage errors
    }
  }, []);

  const setViewMode = (next: ViewMode) => {
    setView(next);
    try {
      window.localStorage.setItem(VIEW_STORAGE_KEY, next);
    } catch {
      // ignore storage errors
    }
  };

  const groupsPresent = useMemo(() => {
    const seen = new Set<ChildAgeGroup>();
    for (const period of periods) {
      const group = period.age_group as ChildAgeGroup;
      if (group in CHILD_AGE_GROUP_LABELS) seen.add(group);
    }
    return (Object.keys(CHILD_AGE_GROUP_LABELS) as ChildAgeGroup[]).filter(
      (group) => seen.has(group),
    );
  }, [periods]);

  const filtered = useMemo(() => {
    if (groupFilter === "all") return periods;
    return periods.filter((period) => period.age_group === groupFilter);
  }, [periods, groupFilter]);

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setGroupFilter("all")}
            className={cn(
              "rounded-lg px-3 py-1.5 text-xs font-medium transition-colors",
              groupFilter === "all"
                ? "bg-emerald-600 text-white"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200",
            )}
          >
            All ({periods.length})
          </button>
          {groupsPresent.map((group) => {
            const count = periods.filter((p) => p.age_group === group).length;
            return (
              <button
                key={group}
                type="button"
                onClick={() => setGroupFilter(group)}
                className={cn(
                  "rounded-lg px-3 py-1.5 text-xs font-medium transition-colors",
                  groupFilter === group
                    ? "bg-emerald-600 text-white"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200",
                )}
              >
                {CHILD_AGE_GROUP_LABELS[group]} ({count})
              </button>
            );
          })}
        </div>

        <div className="flex items-center gap-2 self-end sm:self-auto">
          <div className="inline-flex rounded-lg border border-gray-200 bg-white p-0.5 shadow-sm">
            <button
              type="button"
              aria-label="Card view"
              aria-pressed={view === "cards"}
              onClick={() => setViewMode("cards")}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors",
                view === "cards"
                  ? "bg-emerald-50 text-emerald-700"
                  : "text-gray-500 hover:text-gray-800",
              )}
            >
              <LayoutGrid className="h-3.5 w-3.5" />
              Cards
            </button>
            <button
              type="button"
              aria-label="Table view"
              aria-pressed={view === "table"}
              onClick={() => setViewMode("table")}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors",
                view === "table"
                  ? "bg-emerald-50 text-emerald-700"
                  : "text-gray-500 hover:text-gray-800",
              )}
            >
              <List className="h-3.5 w-3.5" />
              Table
            </button>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="rounded-xl border border-dashed border-gray-200 bg-white px-6 py-12 text-center text-sm text-gray-500">
          Loading child growth periods…
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-200 bg-white px-6 py-12 text-center text-sm text-gray-500">
          {periods.length === 0
            ? "No periods yet. Add a checkpoint (e.g. newborn, 2 months, 6 months)."
            : "No periods in this age group."}
        </div>
      ) : view === "cards" ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {filtered.map((period) => {
            const title = englishTranslation(period)?.title;
            const items = checklistCount(period);
            const languages =
              period.child_growth_period_translations?.length ?? 0;

            return (
              <article
                key={period.id}
                role="link"
                tabIndex={0}
                onClick={() =>
                  router.push(`/admin/child-growth/${period.age_months}`)
                }
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    router.push(`/admin/child-growth/${period.age_months}`);
                  }
                }}
                className="group flex cursor-pointer flex-col rounded-xl border border-gray-200 bg-white p-5 shadow-sm transition hover:border-emerald-200 hover:shadow-md"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-xs font-medium uppercase tracking-wide text-emerald-700">
                      {groupLabel(period)}
                    </p>
                    <h3 className="mt-1 truncate font-heading text-lg font-semibold text-gray-900">
                      {period.age_label}
                    </h3>
                    <p className="mt-0.5 text-sm text-gray-500">
                      {period.age_months} month
                      {period.age_months === 1 ? "" : "s"}
                      {title ? ` · ${title}` : null}
                    </p>
                  </div>
                  <StatusBadge published={period.is_published} />
                </div>

                <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
                  <div className="rounded-lg bg-gray-50 px-3 py-2">
                    <dt className="text-xs text-gray-500">Checklist</dt>
                    <dd className="font-medium text-gray-900">
                      {items} item{items === 1 ? "" : "s"}
                    </dd>
                  </div>
                  <div className="rounded-lg bg-gray-50 px-3 py-2">
                    <dt className="text-xs text-gray-500">Languages</dt>
                    <dd className="font-medium text-gray-900">{languages}</dd>
                  </div>
                </dl>

                <div className="mt-auto flex items-center justify-between gap-3 border-t border-gray-100 pt-4 mt-4">
                  <p className="text-xs text-gray-400">
                    Updated {formatDateTime(period.updated_at)}
                  </p>
                  {canManageContent ? (
                    <Link
                      href={`/admin/child-growth/${period.age_months}/edit`}
                      onClick={(event) => event.stopPropagation()}
                      className="inline-flex items-center gap-1 text-sm font-medium text-emerald-700 hover:underline"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                      Edit
                    </Link>
                  ) : (
                    <span className="text-sm text-gray-400">View</span>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      ) : (
        <div className="admin-table-wrap">
          <Table>
            <TableHeader>
              <TableRow className="border-b border-white/20 bg-gradient-to-r from-emerald-50/50 to-teal-50/50">
                <TableHead className="font-semibold text-gray-700">Age</TableHead>
                <TableHead className="font-semibold text-gray-700">
                  Months
                </TableHead>
                <TableHead className="font-semibold text-gray-700">
                  Group
                </TableHead>
                <TableHead className="font-semibold text-gray-700">
                  Checklist
                </TableHead>
                <TableHead className="font-semibold text-gray-700">
                  Languages
                </TableHead>
                <TableHead className="font-semibold text-gray-700">
                  Status
                </TableHead>
                <TableHead className="font-semibold text-gray-700">
                  Updated
                </TableHead>
                <TableHead className="text-right font-semibold text-gray-700">
                  Actions
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((period) => {
                const translation = englishTranslation(period);
                const items = checklistCount(period);
                return (
                  <TableRow
                    key={period.id}
                    className="cursor-pointer hover:bg-emerald-50/60"
                    onClick={() =>
                      router.push(`/admin/child-growth/${period.age_months}`)
                    }
                  >
                    <TableCell>
                      <div>
                        <p className="font-medium text-gray-900">
                          {period.age_label}
                        </p>
                        {translation?.title ? (
                          <p className="text-xs text-gray-500">
                            {translation.title}
                          </p>
                        ) : null}
                      </div>
                    </TableCell>
                    <TableCell>{period.age_months}</TableCell>
                    <TableCell>{groupLabel(period)}</TableCell>
                    <TableCell>
                      {items} item{items === 1 ? "" : "s"}
                    </TableCell>
                    <TableCell>
                      {period.child_growth_period_translations?.length ?? 0}
                    </TableCell>
                    <TableCell>
                      <StatusBadge published={period.is_published} />
                    </TableCell>
                    <TableCell className="text-gray-600">
                      {formatDateTime(period.updated_at)}
                    </TableCell>
                    <TableCell className="text-right">
                      {canManageContent ? (
                        <Link
                          href={`/admin/child-growth/${period.age_months}/edit`}
                          className="font-medium text-emerald-700 hover:underline"
                          onClick={(event) => event.stopPropagation()}
                        >
                          Edit
                        </Link>
                      ) : (
                        <span className="text-gray-400">View</span>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
