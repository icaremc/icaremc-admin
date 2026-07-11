"use client";

import { useMemo } from "react";
import Link from "next/link";
import { Flag } from "lucide-react";
import {
  groupResolvedMilestonesByAge,
  resolveMilestoneCheck,
} from "@/lib/children/childGrowthUi";
import { formatMilestoneAnswerStatus } from "@/lib/children/childUi";
import { formatDateTime } from "@/lib/format";
import type {
  ChildGrowthPeriod,
  ChildMilestoneCheck,
} from "@/lib/types/database";
import { cn } from "@/lib/utils";

type ChildMilestonesPanelProps = {
  checks: ChildMilestoneCheck[];
  periods: ChildGrowthPeriod[];
};

export default function ChildMilestonesPanel({
  checks,
  periods,
}: ChildMilestonesPanelProps) {
  const resolved = useMemo(
    () => checks.map((check) => resolveMilestoneCheck(check, periods)),
    [checks, periods],
  );

  const groups = useMemo(
    () => groupResolvedMilestonesByAge(resolved),
    [resolved],
  );

  const yesCount = resolved.filter((row) => row.status === "yes").length;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="admin-section-title flex items-center gap-2">
            <Flag className="h-5 w-5 text-violet-600" />
            Checklist progress
          </h2>
          <p className="mt-1 text-sm text-gray-500">
            {yesCount} achieved · {resolved.length} answered
          </p>
        </div>
        <Link
          href="/admin/child-growth"
          className="text-sm font-medium text-emerald-700 hover:underline"
        >
          Edit learning path content →
        </Link>
      </div>

      {groups.length === 0 ? (
        <div className="admin-panel py-8 text-center text-sm text-gray-500">
          No learning path answers recorded yet for this child.
        </div>
      ) : (
        <div className="space-y-4">
          {groups.map((group) => (
            <section key={group.label} className="admin-panel !p-0 overflow-hidden">
              <div className="border-b border-gray-100 bg-violet-50/40 px-4 py-3">
                <h3 className="text-sm font-semibold text-gray-900">
                  {group.label}
                </h3>
                <p className="text-xs text-gray-500">
                  {
                    group.items.filter((item) => item.status === "yes")
                      .length
                  }{" "}
                  of {group.items.length} yes
                </p>
              </div>
              <ul className="divide-y divide-gray-100">
                {group.items.map((item) => (
                  <li
                    key={item.id}
                    className="flex flex-wrap items-start justify-between gap-3 px-4 py-3"
                  >
                    <div className="min-w-0">
                      <p className="font-medium text-gray-900">
                        {item.displayLabel}
                      </p>
                      {item.categoryTitle && item.itemLabel ? (
                        <p className="mt-0.5 text-xs text-gray-500">
                          {item.categoryTitle}
                        </p>
                      ) : null}
                      <p className="mt-1 text-xs text-gray-400">
                        {formatDateTime(item.createdAt)}
                      </p>
                    </div>
                    <span
                      className={cn(
                        "shrink-0 rounded-md px-2.5 py-0.5 text-xs font-medium",
                        item.status === "yes" &&
                          "bg-emerald-100 text-emerald-800",
                        item.status === "unsure" &&
                          "bg-amber-100 text-amber-800",
                        item.status === "not_yet" &&
                          "bg-gray-100 text-gray-700",
                      )}
                    >
                      {formatMilestoneAnswerStatus(item.status)}
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
