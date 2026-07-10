"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, type ReactNode } from "react";
import { Baby, Flag, User } from "lucide-react";
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
import {
  childrenActions,
  fetchChildDetail,
} from "@/features/children/childrenSlice";
import {
  childAgeLabel,
  childDisplayName,
  formatGestationalAge,
  formatMilestoneAnswerStatus,
  formatMilestoneType,
  parseMilestoneItemKey,
} from "@/lib/children/childUi";
import { formatDate, formatDateTime } from "@/lib/format";
import ChildBirthEditForm from "@/components/children/ChildBirthEditForm";
import ChildAvatar from "@/components/children/ChildAvatar";
import { updateChild } from "@/features/children/childrenSlice";

function MetaItem({
  label,
  value,
}: {
  label: string;
  value: ReactNode;
}) {
  return (
    <div className="rounded-lg border border-gray-100 bg-gray-50/80 px-3 py-2.5">
      <p className="text-[10px] font-bold uppercase tracking-wide text-gray-500">
        {label}
      </p>
      <p className="mt-1 text-sm font-medium text-gray-900">{value}</p>
    </div>
  );
}

export default function ChildDetailPage() {
  const params = useParams<{ id: string }>();
  const childId = params.id;
  const dispatch = useAppDispatch();
  const { selected, detailLoading, saving, error } = useAppSelector(
    (state) => state.children,
  );

  useEffect(() => {
    if (!childId) return;
    dispatch(fetchChildDetail(childId));
    return () => {
      dispatch(childrenActions.clearChildDetail());
    };
  }, [childId, dispatch]);

  const child = selected?.child;
  const milestoneChecks = selected?.milestoneChecks ?? [];
  const achievedCount = milestoneChecks.filter(
    (row) => parseMilestoneItemKey(row.item_key).status === "yes",
  ).length;

  return (
    <>
      <PageHero
        title={child ? childDisplayName(child) : "Child"}
        description={
          child
            ? `${child.gender === "female" ? "Girl" : "Boy"} · ${childAgeLabel(child.birth_date)}`
            : "Birth record and milestone progress"
        }
        icon={Baby}
        stat={
          child
            ? { label: "Milestones achieved", value: achievedCount }
            : undefined
        }
      />

      <div className="mx-auto max-w-[1200px] px-6 py-8 lg:px-8">
        <div className="mb-6">
          <Link
            href="/admin/children"
            className="text-sm font-medium text-emerald-600 hover:underline"
          >
            ← All children
          </Link>
        </div>

        {error ? (
          <div className="mb-4 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-600">
            {error}
          </div>
        ) : null}

        {detailLoading || !child ? (
          <div className="admin-panel py-12 text-center text-sm text-gray-500">
            Loading child…
          </div>
        ) : (
          <div className="space-y-8">
            {child.profiles ? (
              <section className="admin-panel">
                <h2 className="admin-section-title mb-4 flex items-center gap-2">
                  <User className="h-5 w-5 text-emerald-600" />
                  Parent
                </h2>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  <MetaItem
                    label="Name"
                    value={child.profiles.full_name || "—"}
                  />
                  <MetaItem label="Phone" value={child.profiles.phone || "—"} />
                  <MetaItem
                    label="I am a"
                    value={child.profiles.account_type || "Mother"}
                  />
                  <MetaItem
                    label="Locale"
                    value={(child.profiles.locale || "—").toUpperCase()}
                  />
                  <MetaItem
                    label="Onboarding"
                    value={
                      child.profiles.onboarding_complete ? "Complete" : "Pending"
                    }
                  />
                  <MetaItem
                    label="Notifications"
                    value={
                      child.profiles.notifications_enabled === false
                        ? "Disabled"
                        : "Enabled"
                    }
                  />
                  {child.profiles.created_at ? (
                    <MetaItem
                      label="Joined"
                      value={formatDate(child.profiles.created_at)}
                    />
                  ) : null}
                </div>
              </section>
            ) : null}

            <section className="admin-panel">
              <div className="mb-4 flex flex-wrap items-center gap-4">
                <ChildAvatar child={child} size="md" />
                <div>
                  <h2 className="admin-section-title">Birth record</h2>
                  <p className="text-sm text-gray-500">
                    {child.gender === "female" ? "Girl" : "Boy"} ·{" "}
                    {childAgeLabel(child.birth_date)}
                  </p>
                </div>
              </div>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <MetaItem label="Name" value={child.name || childDisplayName(child)} />
                <MetaItem label="Birth date" value={formatDate(child.birth_date)} />
                <MetaItem label="Age" value={childAgeLabel(child.birth_date)} />
                <MetaItem label="Sex" value={child.gender === "female" ? "Female" : "Male"} />
                <MetaItem
                  label="Birth weight"
                  value={
                    child.birth_weight != null ? `${child.birth_weight} kg` : "-"
                  }
                />
                <MetaItem
                  label="Gestational age"
                  value={formatGestationalAge(
                    child.gestational_age_weeks,
                    child.gestational_age_days,
                  )}
                />
                <MetaItem
                  label="Birth hospital"
                  value={child.birth_hospital || "-"}
                />
                <MetaItem label="Blood group" value={child.blood_group || "-"} />
                <MetaItem label="Woreda / area" value={child.woreda || "-"} />
                <MetaItem
                  label="Birth height"
                  value={
                    child.birth_height != null ? `${child.birth_height} cm` : "-"
                  }
                />
                <MetaItem
                  label="Delivery"
                  value={child.delivery_type || "-"}
                />
                <MetaItem
                  label="Active in app"
                  value={child.is_active ? "Yes" : "No"}
                />
                <MetaItem
                  label="Pregnancy"
                  value={child.pregnancy_id ? "Linked" : "-"}
                />
              </div>
              <p className="mt-4 text-xs text-gray-500">
                Updated {formatDateTime(child.updated_at)}
              </p>
            </section>

            <section className="admin-panel">
              <h2 className="admin-section-title mb-4">Edit birth record</h2>
              <ChildBirthEditForm
                child={child}
                saving={saving}
                onSave={(patch) => {
                  dispatch(updateChild({ childId: child.id, patch }));
                }}
              />
            </section>

            <section>
              <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                <h2 className="admin-section-title flex items-center gap-2">
                  <Flag className="h-5 w-5 text-violet-600" />
                  Milestone progress ({milestoneChecks.length})
                </h2>
                <Link
                  href="/admin/child-growth"
                  className="text-sm font-medium text-emerald-700 hover:underline"
                >
                  Edit learning path content →
                </Link>
              </div>

              {milestoneChecks.length === 0 ? (
                <div className="admin-panel py-8 text-center text-sm text-gray-500">
                  No learning path answers recorded yet for this child.
                </div>
              ) : (
                <div className="admin-table-wrap">
                  <Table>
                    <TableHeader>
                      <TableRow className="border-b border-white/20 bg-gradient-to-r from-violet-50/50 to-purple-50/50">
                        <TableHead>Item</TableHead>
                        <TableHead>Answer</TableHead>
                        <TableHead>Recorded</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {milestoneChecks.map((row) => {
                        const parsed = parseMilestoneItemKey(row.item_key);
                        return (
                          <TableRow key={row.id}>
                            <TableCell className="font-medium text-gray-900">
                              {formatMilestoneType(row.item_key)}
                            </TableCell>
                            <TableCell>
                              <span
                                className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                                  parsed.status === "yes"
                                    ? "bg-emerald-100 text-emerald-800"
                                    : parsed.status === "unsure"
                                      ? "bg-amber-100 text-amber-800"
                                      : "bg-gray-100 text-gray-700"
                                }`}
                              >
                                {formatMilestoneAnswerStatus(parsed.status)}
                              </span>
                            </TableCell>
                            <TableCell className="text-sm text-gray-600">
                              {formatDateTime(row.created_at)}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              )}
            </section>
          </div>
        )}
      </div>
    </>
  );
}
