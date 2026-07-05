"use client";

import Link from "next/link";
import { useEffect } from "react";
import { useParams } from "next/navigation";
import { Activity, ArrowLeft, ExternalLink, Loader2 } from "lucide-react";
import PageHero from "@/components/PageHero";
import { useAppDispatch, useAppSelector } from "@/app/store/hooks";
import { fetchActivityLogDetail } from "@/features/activity/activityLogsSlice";
import {
  activityDetailDescription,
  activityEventCategory,
  activityMetadataSections,
  activityResourceHref,
  activityResourceLabel,
  activityTechnicalSection,
} from "@/lib/activity/formatActivity";
import { adminRoleLabel } from "@/lib/adminRoles";
import { formatDateTime } from "@/lib/format";

function DetailSection({
  title,
  rows,
}: {
  title: string;
  rows: Array<{ label: string; value: string }>;
}) {
  return (
    <section className="admin-panel space-y-4">
      <h2 className="admin-section-title">{title}</h2>
      <dl className="grid gap-3 text-sm">
        {rows.map((row) => (
          <div key={`${title}-${row.label}`} className="grid gap-1 sm:grid-cols-[180px_1fr]">
            <dt className="text-gray-500">{row.label}</dt>
            <dd className="break-words text-gray-900">{row.value}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

export default function ActivityLogDetailPage() {
  const params = useParams();
  const dispatch = useAppDispatch();
  const source = params.source as "admin" | "platform";
  const id = params.id as string;
  const { selectedLog: log, detailLoading, error } = useAppSelector(
    (state) => state.activityLogs,
  );

  useEffect(() => {
    if (source && id) {
      dispatch(fetchActivityLogDetail({ source, id }));
    }
  }, [dispatch, source, id]);

  if (detailLoading && !log) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-emerald-600" />
      </div>
    );
  }

  if (error || !log) {
    return (
      <div className="mx-auto max-w-[900px] px-6 py-12">
        <p className="text-red-600">{error ?? "Activity log not found"}</p>
        <Link
          href="/admin/activity"
          className="mt-4 inline-flex h-9 items-center rounded-[var(--radius)] border border-gray-200 bg-white px-4 text-sm font-medium text-gray-900 hover:bg-gray-50"
        >
          Back to activity log
        </Link>
      </div>
    );
  }

  const resourceHref = activityResourceHref(log);
  const metadataSections = activityMetadataSections(log);
  const technicalSection = activityTechnicalSection(log);

  return (
    <>
      <PageHero
        title="Activity details"
        description={activityEventCategory(log.event_type)}
        icon={Activity}
        actions={
          <Link
            href="/admin/activity"
            className="inline-flex items-center gap-2 text-sm font-medium text-gray-600 hover:text-gray-900"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </Link>
        }
      />

      <div className="mx-auto max-w-[900px] space-y-6 px-6 py-8 lg:px-8">
        <section className="admin-panel space-y-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-lg font-semibold text-gray-900">
                {activityDetailDescription(log)}
              </p>
              <p className="mt-1 text-sm text-gray-500">{formatDateTime(log.created_at)}</p>
            </div>
            <span
              className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${
                log.source === "admin"
                  ? "bg-violet-50 text-violet-700"
                  : "bg-sky-50 text-sky-700"
              }`}
            >
              {log.source === "admin" ? "Admin portal" : "Mobile app"}
            </span>
          </div>
        </section>

        <DetailSection
          title="Who"
          rows={[
            {
              label: "Name",
              value: log.actor_name || log.actor_email || "Unknown",
            },
            {
              label: "Email",
              value: log.actor_email || "N/A",
            },
            {
              label: "Role",
              value:
                log.actor_type === "admin" && log.actor_role
                  ? adminRoleLabel(log.actor_role)
                  : log.actor_type ?? "N/A",
            },
          ]}
        />

        <DetailSection
          title="What happened"
          rows={[
            { label: "Summary", value: activityDetailDescription(log) },
            { label: "Category", value: activityEventCategory(log.event_type) },
            {
              label: "Resource",
              value: log.resource_type
                ? `${activityResourceLabel(log.resource_type)}${log.resource_id ? ` (${log.resource_id})` : ""}`
                : "N/A",
            },
          ]}
        />

        {resourceHref ? (
          <div className="admin-panel">
            <Link
              href={resourceHref}
              className="inline-flex h-8 items-center gap-2 rounded-[var(--radius)] border border-gray-200 bg-white px-3 text-sm font-medium text-gray-900 hover:bg-gray-50"
            >
              Open related record
              <ExternalLink className="h-4 w-4" />
            </Link>
          </div>
        ) : null}

        {metadataSections.map((section) => (
          <DetailSection key={section.title} title={section.title} rows={section.rows} />
        ))}

        <DetailSection title={technicalSection.title} rows={technicalSection.rows} />
      </div>
    </>
  );
}
