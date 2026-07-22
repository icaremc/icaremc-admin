"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect } from "react";
import { CalendarCheck } from "lucide-react";
import CheckupVaccinesDetail from "@/components/followup/CheckupVaccinesDetail";
import PageHero from "@/components/PageHero";
import { Button } from "@/components/ui/button";
import { useAppDispatch, useAppSelector } from "@/app/store/hooks";
import {
  fetchFollowupVisitTemplate,
  followupVisitsActions,
} from "@/features/followupVisits/followupVisitsSlice";
import { useAdminCanManage } from "@/lib/useAdminPermissions";
import { milestoneDisplayLabel, offsetLabel } from "@/lib/followup/display";

function whenLabel(days: number | null, months: number | null): string {
  const base = offsetLabel(days, months);
  return base === "—" ? base : `${base} after birth`;
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
  const vaccineCount =
    template?.vaccines?.filter((v) => v.name?.trim()).length ?? 0;

  return (
    <>
      <PageHero
        title={template?.label ?? "Check-up"}
        description={
          template
            ? `${whenLabel(template.offset_days, template.offset_months)} · ${vaccineCount} vaccine${vaccineCount === 1 ? "" : "s"}`
            : "Loading check-up…"
        }
        icon={CalendarCheck}
      />
      <div className="admin-page admin-page-narrow">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <Link
            href="/admin/child-growth/follow-up"
            className="text-sm text-emerald-700 hover:underline"
          >
            ← Back to visit schedule
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
          <div className="space-y-6">
            {template.child_growth_periods ? (
              <div className="rounded-xl border border-emerald-100 bg-emerald-50/50 px-4 py-3 text-sm text-emerald-950">
                <p>
                  Parents see the{" "}
                  <strong className="font-semibold">
                    {milestoneDisplayLabel(
                      template.child_growth_periods.age_label,
                      template.child_growth_periods.age_months,
                    )}
                  </strong>{" "}
                  checklist when this visit is due.{" "}
                  <Link
                    href={`/admin/child-growth/${template.child_growth_periods.age_months}`}
                    className="font-medium text-emerald-700 hover:underline"
                  >
                    View milestone content
                  </Link>
                </p>
              </div>
            ) : (
              <div className="rounded-xl border border-amber-100 bg-amber-50/50 px-4 py-3 text-sm text-amber-950">
                <p>
                  No milestone linked. Parents only get a reminder, not a
                  checklist.{" "}
                  {canManageContent ? (
                    <Link
                      href={`/admin/followup-visits/${template.id}/edit`}
                      className="font-medium text-amber-800 hover:underline"
                    >
                      Link a milestone on edit
                    </Link>
                  ) : null}
                </p>
              </div>
            )}

            <div className="grid gap-3 sm:grid-cols-3">
              <InfoCard
                label="When"
                value={whenLabel(template.offset_days, template.offset_months)}
              />
              <InfoCard
                label="Milestone content"
                value={
                  template.child_growth_periods
                    ? milestoneDisplayLabel(
                        template.child_growth_periods.age_label,
                        template.child_growth_periods.age_months,
                      )
                    : "None"
                }
              />
              <InfoCard
                label="Status"
                value={template.is_published ? "Published" : "Draft"}
              />
            </div>

            <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
              <h2 className="text-sm font-semibold text-gray-900">Vaccines</h2>
              <div className="mt-4">
                <CheckupVaccinesDetail vaccines={template.vaccines ?? []} />
              </div>
            </section>
          </div>
        ) : (
          <p className="text-sm text-gray-500">Check-up not found.</p>
        )}
      </div>
    </>
  );
}

function InfoCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white px-4 py-3">
      <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
        {label}
      </p>
      <p className="mt-1 text-sm font-medium text-gray-900">{value}</p>
    </div>
  );
}
