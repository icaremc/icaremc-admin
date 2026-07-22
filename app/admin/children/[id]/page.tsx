"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { Baby, Flag, LineChart, Pencil, Syringe, User } from "lucide-react";
import PageHero from "@/components/PageHero";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import ChildAvatar from "@/components/children/ChildAvatar";
import ChildBirthEditForm from "@/components/children/ChildBirthEditForm";
import ChildGrowthPanel from "@/components/children/ChildGrowthPanel";
import ChildMilestonesPanel from "@/components/children/ChildMilestonesPanel";
import ChildVaccinesPanel from "@/components/children/ChildVaccinesPanel";
import { useAppDispatch, useAppSelector } from "@/app/store/hooks";
import {
  childrenActions,
  fetchChildDetail,
  updateChild,
} from "@/features/children/childrenSlice";
import {
  childAgeLabel,
  childDisplayName,
  formatGestationalAge,
  parseMilestoneItemKey,
} from "@/lib/children/childUi";
import { formatDate, formatDateTime } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { ChildUpdatePayload } from "@/lib/types/database";

type DetailTab = "child" | "parent" | "growth" | "vaccines" | "milestones";

const TABS: {
  id: DetailTab;
  label: string;
  description: string;
  icon: typeof Baby;
}[] = [
  {
    id: "child",
    label: "Child",
    description: "Birth record",
    icon: Baby,
  },
  {
    id: "parent",
    label: "Parent",
    description: "Parent account",
    icon: User,
  },
  {
    id: "growth",
    label: "Growth",
    description: "WHO charts & status",
    icon: LineChart,
  },
  {
    id: "vaccines",
    label: "Vaccines",
    description: "Doses given",
    icon: Syringe,
  },
  {
    id: "milestones",
    label: "Milestones",
    description: "Checklist progress",
    icon: Flag,
  },
];

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
  const [activeTab, setActiveTab] = useState<DetailTab>("child");
  const [editOpen, setEditOpen] = useState(false);

  useEffect(() => {
    if (!childId) return;
    dispatch(fetchChildDetail(childId));
    return () => {
      dispatch(childrenActions.clearChildDetail());
    };
  }, [childId, dispatch]);

  const child = selected?.child;
  const milestoneChecks = selected?.milestoneChecks ?? [];
  const measurements = selected?.measurements ?? [];
  const vaccineRecords = selected?.vaccineRecords ?? [];
  const vaccineSchedule = selected?.vaccineSchedule ?? [];
  const growthPeriods = selected?.growthPeriods ?? [];

  const achievedCount = milestoneChecks.filter(
    (row) => parseMilestoneItemKey(row.item_key).status === "yes",
  ).length;
  const vaccinesGiven = vaccineRecords.filter((row) => row.received).length;

  const handleSaveBirthRecord = async (patch: ChildUpdatePayload) => {
    if (!child) return;
    const result = await dispatch(updateChild({ childId: child.id, patch }));
    if (updateChild.fulfilled.match(result)) {
      setEditOpen(false);
    }
  };

  const tabBadge = (tabId: DetailTab): number | null => {
    if (tabId === "milestones") return milestoneChecks.length;
    if (tabId === "growth") return measurements.length;
    if (tabId === "vaccines") return vaccinesGiven;
    return null;
  };

  return (
    <>
      <PageHero
        title={child ? childDisplayName(child) : "Child"}
        description={
          child
            ? `${child.gender === "female" ? "Girl" : "Boy"} · ${childAgeLabel(child.birth_date)}`
            : "Birth record, growth, vaccines, and milestones"
        }
        icon={Baby}
        stat={
          child
            ? { label: "Milestones achieved", value: achievedCount }
            : undefined
        }
      />

      {!detailLoading && child ? (
        <div className="border-b border-gray-200 bg-white">
          <div className="admin-tabs-bar">
            {TABS.map((tab) => {
              const Icon = tab.icon;
              const active = activeTab === tab.id;
              const badge = tabBadge(tab.id);
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={cn(
                    "whitespace-nowrap border-b-2 px-4 py-3 text-left transition-colors",
                    active
                      ? "border-emerald-600 text-emerald-700"
                      : "border-transparent text-gray-500 hover:border-gray-200 hover:text-gray-800",
                  )}
                >
                  <span className="flex items-center gap-2 text-sm font-medium">
                    <Icon className="h-4 w-4 shrink-0" />
                    {tab.label}
                    {badge != null && badge > 0 ? (
                      <span
                        className={cn(
                          "rounded-md px-1.5 py-0.5 text-[10px] font-semibold",
                          active
                            ? "bg-emerald-100 text-emerald-800"
                            : "bg-gray-100 text-gray-600",
                        )}
                      >
                        {badge}
                      </span>
                    ) : null}
                  </span>
                  <span
                    className={cn(
                      "mt-0.5 block text-xs font-normal",
                      active ? "text-emerald-600/80" : "text-gray-400",
                    )}
                  >
                    {tab.description}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      ) : null}

      <div className="admin-page">
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
        ) : activeTab === "child" ? (
          <div className="space-y-6">
            <section className="admin-panel">
              <div className="mb-4 flex flex-wrap items-center justify-between gap-4">
                <div className="flex flex-wrap items-center gap-4">
                  <ChildAvatar child={child} size="md" />
                  <div>
                    <h2 className="admin-section-title">Birth record</h2>
                    <p className="text-sm text-gray-500">
                      {child.gender === "female" ? "Girl" : "Boy"} ·{" "}
                      {childAgeLabel(child.birth_date)}
                    </p>
                  </div>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setEditOpen(true)}
                >
                  <Pencil className="mr-2 h-4 w-4" />
                  Edit birth record
                </Button>
              </div>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <MetaItem
                  label="Name"
                  value={child.name || childDisplayName(child)}
                />
                <MetaItem
                  label="Birth date"
                  value={formatDate(child.birth_date)}
                />
                <MetaItem label="Age" value={childAgeLabel(child.birth_date)} />
                <MetaItem
                  label="Sex"
                  value={child.gender === "female" ? "Female" : "Male"}
                />
                <MetaItem
                  label="Birth weight"
                  value={
                    child.birth_weight != null
                      ? `${child.birth_weight} kg`
                      : "-"
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
                    child.birth_height != null
                      ? `${child.birth_height} cm`
                      : "-"
                  }
                />
                <MetaItem
                  label="Delivery"
                  value={child.delivery_type || "-"}
                />
                <MetaItem
                  label="Active"
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

            <Modal
              open={editOpen}
              onClose={() => setEditOpen(false)}
              title="Edit birth record"
              className="max-h-[90vh] max-w-2xl overflow-y-auto"
            >
              <ChildBirthEditForm
                child={child}
                saving={saving}
                onSave={handleSaveBirthRecord}
              />
            </Modal>
          </div>
        ) : activeTab === "parent" ? (
          child.profiles ? (
            <section className="admin-panel">
              <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                <h2 className="admin-section-title flex items-center gap-2">
                  <User className="h-5 w-5 text-emerald-600" />
                  Parent
                </h2>
                <Link
                  href={`/admin/users/${child.user_id}`}
                  className="text-sm font-medium text-emerald-700 hover:underline"
                >
                  Open user profile →
                </Link>
              </div>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <MetaItem
                  label="Name"
                  value={child.profiles.full_name || "—"}
                />
                <MetaItem label="Phone" value={child.profiles.phone || "—"} />
                <MetaItem
                  label="I am a"
                  value={child.profiles.account_type || "Parent"}
                />
                <MetaItem
                  label="Locale"
                  value={(child.profiles.locale || "—").toUpperCase()}
                />
                <MetaItem
                  label="Onboarding"
                  value={
                    child.profiles.onboarding_complete
                      ? "Complete"
                      : "Pending"
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
          ) : (
            <div className="admin-panel py-8 text-center text-sm text-gray-500">
              No parent profile linked to this child.
            </div>
          )
        ) : activeTab === "growth" ? (
          <ChildGrowthPanel child={child} measurements={measurements} />
        ) : activeTab === "vaccines" ? (
          <ChildVaccinesPanel
            child={child}
            records={vaccineRecords}
            schedule={vaccineSchedule}
          />
        ) : (
          <ChildMilestonesPanel
            checks={milestoneChecks}
            periods={growthPeriods}
          />
        )}
      </div>
    </>
  );
}
