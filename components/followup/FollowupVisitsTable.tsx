"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { ChildFollowupVisitTemplate } from "@/lib/types/database";
import {
  groupFollowupTemplatesByMilestone,
  offsetLabel,
  vaccineSummary,
} from "@/lib/followup/display";

type FollowupVisitsTableProps = {
  templates: ChildFollowupVisitTemplate[];
  loading: boolean;
  canManageContent: boolean;
};

function VisitRows({
  templates,
  canManageContent,
  onOpen,
}: {
  templates: ChildFollowupVisitTemplate[];
  canManageContent: boolean;
  onOpen: (id: string) => void;
}) {
  return (
    <>
      {templates.map((template) => (
        <TableRow
          key={template.id}
          className="cursor-pointer hover:bg-emerald-50/60"
          onClick={() => onOpen(template.id)}
        >
          <TableCell className="font-medium text-gray-900">
            {template.label}
          </TableCell>
          <TableCell className="text-gray-700">
            {offsetLabel(template.offset_days, template.offset_months)} after birth
          </TableCell>
          <TableCell className="max-w-[220px] text-sm text-gray-700">
            {vaccineSummary(template)}
          </TableCell>
          <TableCell>
            <span
              className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${
                template.is_published
                  ? "bg-emerald-50 text-emerald-700"
                  : "bg-amber-50 text-amber-700"
              }`}
            >
              {template.is_published ? "Published" : "Draft"}
            </span>
          </TableCell>
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
    </>
  );
}

function VisitTable({
  templates,
  loading,
  canManageContent,
  onOpen,
  emptyMessage,
}: {
  templates: ChildFollowupVisitTemplate[];
  loading: boolean;
  canManageContent: boolean;
  onOpen: (id: string) => void;
  emptyMessage: string;
}) {
  return (
    <div className="admin-table-wrap">
      <Table>
        <TableHeader>
          <TableRow className="border-b border-white/20 bg-gradient-to-r from-emerald-50/50 to-teal-50/50">
            <TableHead className="font-semibold text-gray-700">Visit</TableHead>
            <TableHead className="font-semibold text-gray-700">Due</TableHead>
            <TableHead className="font-semibold text-gray-700">Vaccines</TableHead>
            <TableHead className="font-semibold text-gray-700">Status</TableHead>
            <TableHead className="text-right font-semibold text-gray-700">
              Actions
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {loading ? (
            <TableRow>
              <TableCell colSpan={5} className="py-8 text-center text-gray-500">
                Loading visit schedule…
              </TableCell>
            </TableRow>
          ) : templates.length === 0 ? (
            <TableRow>
              <TableCell colSpan={5} className="py-8 text-center text-gray-500">
                {emptyMessage}
              </TableCell>
            </TableRow>
          ) : (
            <VisitRows
              templates={templates}
              canManageContent={canManageContent}
              onOpen={onOpen}
            />
          )}
        </TableBody>
      </Table>
    </div>
  );
}

export default function FollowupVisitsTable({
  templates,
  loading,
  canManageContent,
}: FollowupVisitsTableProps) {
  const router = useRouter();
  const milestoneGroups = groupFollowupTemplatesByMilestone(templates);
  const linkedGroups = milestoneGroups.filter((g) => g.periodId != null);
  const unlinkedGroup = milestoneGroups.find((g) => g.periodId == null);

  const open = (id: string) => router.push(`/admin/followup-visits/${id}`);

  if (loading) {
    return (
      <VisitTable
        templates={[]}
        loading
        canManageContent={canManageContent}
        onOpen={open}
        emptyMessage=""
      />
    );
  }

  if (templates.length === 0) {
    return (
      <VisitTable
        templates={[]}
        loading={false}
        canManageContent={canManageContent}
        onOpen={open}
        emptyMessage="No visits yet. Add reminders (e.g. 6 weeks, 9 months) and list vaccines for each."
      />
    );
  }

  return (
    <div className="space-y-8">
      {linkedGroups.map((group) => (
        <section key={group.periodId}>
          <div className="mb-3 flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                Milestone content shown
              </p>
              <h2 className="text-lg font-semibold text-gray-900">{group.label}</h2>
              <p className="mt-1 text-sm text-gray-600">
                {group.templates.length} visit
                {group.templates.length === 1 ? "" : "s"} linked to this age
              </p>
            </div>
            {group.periodId != null && group.ageMonths != null ? (
              <Link
                href={`/admin/child-growth/${group.ageMonths}`}
                className="text-sm font-medium text-emerald-700 hover:underline"
              >
                Edit checklist & growth →
              </Link>
            ) : null}
          </div>
          <VisitTable
            templates={group.templates}
            loading={false}
            canManageContent={canManageContent}
            onOpen={open}
            emptyMessage=""
          />
        </section>
      ))}

      {unlinkedGroup && unlinkedGroup.templates.length > 0 ? (
        <section>
          <div className="mb-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
              Schedule only
            </p>
            <h2 className="text-lg font-semibold text-gray-900">
              Between milestones
            </h2>
            <p className="mt-1 text-sm text-gray-600">
              Parents get a reminder, but no linked checklist. Link a milestone
              on each visit&apos;s edit page to show development content.
            </p>
          </div>
          <VisitTable
            templates={unlinkedGroup.templates}
            loading={false}
            canManageContent={canManageContent}
            onOpen={open}
            emptyMessage=""
          />
        </section>
      ) : null}
    </div>
  );
}
