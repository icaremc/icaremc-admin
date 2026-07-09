"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect } from "react";
import { CalendarCheck } from "lucide-react";
import PageHero from "@/components/PageHero";
import { Button } from "@/components/ui/button";
import { useAppDispatch, useAppSelector } from "@/app/store/hooks";
import {
  fetchFollowupVisitTemplate,
  followupVisitsActions,
} from "@/features/followupVisits/followupVisitsSlice";
import { useAdminCanManage } from "@/lib/useAdminPermissions";
import { formatDateTime } from "@/lib/format";
import { milestoneDisplayLabel, offsetLabel } from "@/lib/followup/display";

function offsetLabelFromBirth(days: number | null, months: number | null): string {
  const base = offsetLabel(days, months);
  return base === "—" ? base : `${base} from birth`;
}

export default function FollowupVisitTemplateDetailPage() {
  const params = useParams<{ id: string }>();
  const id = params.id;
  const dispatch = useAppDispatch();
  const { selected, loading, error } = useAppSelector((state) => state.followupVisits);
  const canManageContent = useAdminCanManage("manage_content");

  useEffect(() => {
    if (id) dispatch(fetchFollowupVisitTemplate(id));
    return () => {
      dispatch(followupVisitsActions.clearFollowupVisitSelected());
    };
  }, [dispatch, id]);

  const template = selected?.id === id ? selected : null;

  return (
    <>
      <PageHero
        title={template?.label ?? "Follow-up visit"}
        description={template ? `Code: ${template.code}` : "Loading template…"}
        icon={CalendarCheck}
      />
      <div className="mx-auto max-w-[900px] px-6 py-8 lg:px-8">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <Link href="/admin/followup-visits" className="text-sm text-emerald-700 hover:underline">
            ← Back to follow-up templates
          </Link>
          {canManageContent && template ? (
            <Link href={`/admin/followup-visits/${template.id}/edit`}>
              <Button>Edit</Button>
            </Link>
          ) : null}
        </div>

        {error ? (
          <div className="mb-4 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-600">
            {error}
          </div>
        ) : null}

        {loading && !template ? (
          <p className="text-sm text-gray-500">Loading…</p>
        ) : template ? (
          <div className="space-y-4 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
            <DetailRow label="Sort order" value={String(template.sort_order)} />
            <DetailRow
              label="Offset"
              value={offsetLabelFromBirth(template.offset_days, template.offset_months)}
            />
            <DetailRow
              label="Milestone"
              value={
                template.child_growth_periods
                  ? milestoneDisplayLabel(
                      template.child_growth_periods.age_label,
                      template.child_growth_periods.age_months,
                    )
                  : "Not linked"
              }
            />
            <DetailRow
              label="Remind before"
              value={(template.remind_days_before ?? []).join(", ") || "—"}
            />
            <DetailRow
              label="Status"
              value={template.is_published ? "Published" : "Draft"}
            />
            <DetailRow label="Updated" value={formatDateTime(template.updated_at)} />
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                Modules
              </p>
              <ul className="mt-2 flex flex-wrap gap-2">
                {Object.entries(template.modules ?? {}).map(([key, enabled]) =>
                  enabled ? (
                    <li
                      key={key}
                      className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-800"
                    >
                      {key.replace("_", " ")}
                    </li>
                  ) : null,
                )}
              </ul>
            </div>
          </div>
        ) : (
          <p className="text-sm text-gray-500">Template not found.</p>
        )}
      </div>
    </>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
        {label}
      </p>
      <p className="mt-1 text-sm text-gray-900">{value}</p>
    </div>
  );
}
