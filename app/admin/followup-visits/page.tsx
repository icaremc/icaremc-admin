"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Fragment, useEffect, useMemo } from "react";
import { CalendarCheck } from "lucide-react";
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
import { fetchFollowupVisitTemplates } from "@/features/followupVisits/followupVisitsSlice";
import {
  groupFollowupTemplatesByMilestone,
  offsetLabel,
} from "@/lib/followup/display";
import { useAdminCanManage } from "@/lib/useAdminPermissions";
import { formatDateTime } from "@/lib/format";

export default function FollowupVisitsPage() {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const { templates, loading, error } = useAppSelector(
    (state) => state.followupVisits,
  );
  const canManageContent = useAdminCanManage("manage_content");

  const milestoneGroups = useMemo(
    () => groupFollowupTemplatesByMilestone(templates),
    [templates],
  );

  useEffect(() => {
    dispatch(fetchFollowupVisitTemplates());
  }, [dispatch]);

  return (
    <>
      <PageHero
        title="Baby follow-up"
        description="Visit schedule templates grouped by milestone. Multiple visits can share one milestone's content."
        icon={CalendarCheck}
        stat={{ label: "Templates", value: templates.length }}
      />

      <div className="mx-auto max-w-[1200px] px-6 py-8 lg:px-8">
        {canManageContent ? (
          <div className="mb-6 flex justify-end">
            <Link href="/admin/followup-visits/new">
              <Button>Add visit template</Button>
            </Link>
          </div>
        ) : null}

        {error ? (
          <div className="mb-4 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-600">
            {error}
          </div>
        ) : null}

        <div className="admin-table-wrap">
          <Table>
            <TableHeader>
              <TableRow className="border-b border-white/20 bg-gradient-to-r from-emerald-50/50 to-teal-50/50">
                <TableHead className="font-semibold text-gray-700">Order</TableHead>
                <TableHead className="font-semibold text-gray-700">Label</TableHead>
                <TableHead className="font-semibold text-gray-700">Code</TableHead>
                <TableHead className="font-semibold text-gray-700">Offset</TableHead>
                <TableHead className="font-semibold text-gray-700">Status</TableHead>
                <TableHead className="font-semibold text-gray-700">Updated</TableHead>
                <TableHead className="text-right font-semibold text-gray-700">
                  Actions
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={7} className="py-8 text-center text-gray-500">
                    Loading follow-up templates…
                  </TableCell>
                </TableRow>
              ) : templates.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="py-8 text-center text-gray-500">
                    No templates yet. Run the SQL migration, then refresh — or add one
                    manually.
                  </TableCell>
                </TableRow>
              ) : (
                milestoneGroups.map((group) => (
                  <Fragment key={group.periodId ?? "unlinked"}>
                    <TableRow className="border-t-2 border-emerald-100 bg-emerald-50/50 hover:bg-emerald-50/50">
                      <TableCell colSpan={7} className="py-3">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div>
                            <p className="text-xs font-semibold uppercase tracking-wide text-emerald-800/70">
                              Milestone
                            </p>
                            <p className="text-sm font-semibold text-emerald-950">
                              {group.label}
                            </p>
                          </div>
                          <div className="flex items-center gap-3 text-xs text-emerald-800">
                            <span>
                              {group.templates.length} visit
                              {group.templates.length === 1 ? "" : "s"}
                            </span>
                            {group.periodId != null && group.ageMonths != null ? (
                              <Link
                                href={`/admin/child-growth/${group.ageMonths}`}
                                className="font-medium hover:underline"
                                onClick={(e) => e.stopPropagation()}
                              >
                                View milestone content
                              </Link>
                            ) : null}
                          </div>
                        </div>
                      </TableCell>
                    </TableRow>
                    {group.templates.map((template) => (
                      <TableRow
                        key={template.id}
                        className="cursor-pointer hover:bg-emerald-50/60"
                        onClick={() =>
                          router.push(`/admin/followup-visits/${template.id}`)
                        }
                      >
                        <TableCell>{template.sort_order}</TableCell>
                        <TableCell className="font-medium text-gray-900">
                          {template.label}
                        </TableCell>
                        <TableCell className="font-mono text-xs">{template.code}</TableCell>
                        <TableCell>
                          {offsetLabel(template.offset_days, template.offset_months)}
                        </TableCell>
                        <TableCell>
                          {template.is_published ? "Published" : "Draft"}
                        </TableCell>
                        <TableCell>{formatDateTime(template.updated_at)}</TableCell>
                        <TableCell className="text-right">
                          {canManageContent ? (
                            <Link
                              href={`/admin/followup-visits/${template.id}/edit`}
                              onClick={(e) => e.stopPropagation()}
                              className="text-emerald-700 hover:underline"
                            >
                              Edit
                            </Link>
                          ) : (
                            <span className="text-gray-400">View</span>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </Fragment>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </>
  );
}
