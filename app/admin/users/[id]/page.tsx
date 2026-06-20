"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  Activity,
  ArrowLeft,
  Baby,
  Building2,
  ChevronDown,
  ChevronUp,
  Heart,
  MapPin,
  Phone,
  User,
} from "lucide-react";
import PageHero from "@/components/PageHero";
import SendPushForm from "@/components/users/SendPushForm";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useAppDispatch, useAppSelector } from "@/app/store/hooks";
import { fetchUserDetail } from "@/features/users/userDetailSlice";
import { formatDate, formatDateTime, truncate } from "@/lib/format";
import {
  formatGestationalAge,
  gestationalAge,
  type GestationalAge,
} from "@/lib/pregnancy";
import type { Pregnancy, PregnancyLog, PregnancyStatus } from "@/lib/types/database";

function statusBadge(status: PregnancyStatus) {
  const styles: Record<PregnancyStatus, string> = {
    active: "bg-emerald-100 text-emerald-800",
    completed: "bg-gray-100 text-gray-700",
    miscarriage: "bg-amber-100 text-amber-800",
    terminated: "bg-red-100 text-red-700",
  };
  const labels: Record<PregnancyStatus, string> = {
    active: "Active",
    completed: "Completed",
    miscarriage: "Miscarriage",
    terminated: "Terminated",
  };
  return (
    <span
      className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${styles[status]}`}
    >
      {labels[status]}
    </span>
  );
}

function sortPregnancies(pregnancies: Pregnancy[]): Pregnancy[] {
  return [...pregnancies].sort((a, b) => {
    if (a.status === "active" && b.status !== "active") return -1;
    if (b.status === "active" && a.status !== "active") return 1;
    return b.pregnancy_number - a.pregnancy_number;
  });
}

function daysUntilDue(edd: string | null): number | null {
  if (!edd) return null;
  const due = new Date(`${edd}T00:00:00`);
  if (Number.isNaN(due.getTime())) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  due.setHours(0, 0, 0, 0);
  return Math.round((due.getTime() - today.getTime()) / (24 * 60 * 60 * 1000));
}

function dueDateLabel(edd: string | null): string | null {
  const days = daysUntilDue(edd);
  if (days === null) return null;
  if (days === 0) return "Due today";
  if (days > 0) return `${days} day${days === 1 ? "" : "s"} until due date`;
  const overdue = Math.abs(days);
  return `${overdue} day${overdue === 1 ? "" : "s"} past due date`;
}

function pregnancyProgress(age: GestationalAge): number {
  return Math.min(100, Math.round((age.week / 40) * 100));
}

function VitalsTable({ logs }: { logs: PregnancyLog[] }) {
  const sorted = useMemo(
    () => [...logs].sort((a, b) => b.week_number - a.week_number),
    [logs],
  );

  return (
    <div className="admin-table-wrap">
      <Table>
        <TableHeader>
          <TableRow className="border-b border-white/20 bg-gradient-to-r from-emerald-50/50 to-teal-50/50">
            <TableHead>Week</TableHead>
            <TableHead>Weight</TableHead>
            <TableHead>Blood pressure</TableHead>
            <TableHead>Symptoms</TableHead>
            <TableHead>Notes</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sorted.map((log) => (
            <TableRow key={log.id}>
              <TableCell className="font-medium">Week {log.week_number}</TableCell>
              <TableCell>{log.weight != null ? `${log.weight} kg` : "—"}</TableCell>
              <TableCell>
                {log.blood_pressure_systolic != null
                  ? `${log.blood_pressure_systolic}/${log.blood_pressure_diastolic ?? "—"}`
                  : "—"}
              </TableCell>
              <TableCell className="max-w-[180px]">
                {log.symptoms.length ? log.symptoms.join(", ") : "—"}
              </TableCell>
              <TableCell className="max-w-[200px] text-gray-600">
                {log.notes ? truncate(log.notes, 64) : "—"}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

function LatestVitalSummary({ log }: { log: PregnancyLog }) {
  return (
    <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-gray-700">
      <span>
        <span className="text-gray-500">Week</span>{" "}
        <span className="font-medium text-gray-900">{log.week_number}</span>
      </span>
      {log.weight != null ? (
        <span>
          <span className="text-gray-500">Weight</span>{" "}
          <span className="font-medium text-gray-900">{log.weight} kg</span>
        </span>
      ) : null}
      {log.blood_pressure_systolic != null ? (
        <span>
          <span className="text-gray-500">BP</span>{" "}
          <span className="font-medium text-gray-900">
            {log.blood_pressure_systolic}/{log.blood_pressure_diastolic ?? "—"}
          </span>
        </span>
      ) : null}
      {log.symptoms.length > 0 ? (
        <span>
          <span className="text-gray-500">Symptoms</span>{" "}
          <span className="font-medium text-gray-900">{log.symptoms.join(", ")}</span>
        </span>
      ) : null}
      <span className="text-xs text-gray-400">
        Updated {formatDateTime(log.updated_at)}
      </span>
    </div>
  );
}

function PregnancyCard({
  pregnancy,
  logs,
  defaultExpanded = false,
}: {
  pregnancy: Pregnancy;
  logs: PregnancyLog[];
  defaultExpanded?: boolean;
}) {
  const isActive = pregnancy.status === "active";
  const [expanded, setExpanded] = useState(defaultExpanded);
  const [vitalsOpen, setVitalsOpen] = useState(isActive && logs.length > 0);

  const age = isActive
    ? gestationalAge(pregnancy.lmp_date, pregnancy.edd)
    : null;
  const dueLabel = isActive ? dueDateLabel(pregnancy.edd) : null;
  const latestLog = useMemo(
    () =>
      logs.length > 0
        ? [...logs].sort((a, b) => b.week_number - a.week_number)[0]
        : null,
    [logs],
  );

  const hasCareDetails = pregnancy.hospital || pregnancy.location;
  const hasConditions = pregnancy.conditions.length > 0;

  if (!isActive && !expanded) {
    return (
      <button
        type="button"
        onClick={() => setExpanded(true)}
        className="admin-panel flex w-full items-center justify-between gap-4 text-left transition hover:border-emerald-200 hover:bg-emerald-50/30"
      >
        <div className="min-w-0 space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-medium text-gray-900">
              Pregnancy #{pregnancy.pregnancy_number}
            </span>
            {statusBadge(pregnancy.status)}
            {!pregnancy.is_first_pregnancy ? (
              <span className="text-xs text-gray-500">Repeat pregnancy</span>
            ) : null}
          </div>
          <p className="text-sm text-gray-600">
            {pregnancy.edd ? `Due ${formatDate(pregnancy.edd)}` : "No due date recorded"}
            {pregnancy.completed_at
              ? ` · Ended ${formatDate(pregnancy.completed_at)}`
              : ""}
          </p>
        </div>
        <ChevronDown className="h-5 w-5 shrink-0 text-gray-400" />
      </button>
    );
  }

  return (
    <div className="admin-panel space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-base font-semibold text-gray-900">
              {isActive
                ? "Current pregnancy"
                : `Pregnancy #${pregnancy.pregnancy_number}`}
            </h3>
            {statusBadge(pregnancy.status)}
            {pregnancy.is_first_pregnancy ? (
              <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-600">
                First pregnancy
              </span>
            ) : null}
          </div>
          {!isActive ? (
            <p className="text-sm text-gray-500">
              {pregnancy.completed_at
                ? `Ended ${formatDate(pregnancy.completed_at)}`
                : "Past pregnancy record"}
            </p>
          ) : null}
        </div>
        {!isActive ? (
          <button
            type="button"
            onClick={() => setExpanded(false)}
            className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700"
          >
            Collapse
            <ChevronUp className="h-4 w-4" />
          </button>
        ) : null}
      </div>

      {isActive && age ? (
        <div className="rounded-xl border border-emerald-100 bg-gradient-to-br from-emerald-50/80 to-teal-50/50 p-4">
          <p className="text-2xl font-semibold tracking-tight text-emerald-900">
            {formatGestationalAge(age)}
          </p>
          {dueLabel ? (
            <p className="mt-1 text-sm font-medium text-emerald-800">{dueLabel}</p>
          ) : null}
          <div className="mt-3">
            <div className="mb-1 flex justify-between text-xs text-emerald-800/80">
              <span>Progress</span>
              <span>{pregnancyProgress(age)}%</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-emerald-100">
              <div
                className="h-full rounded-full bg-emerald-600 transition-all"
                style={{ width: `${pregnancyProgress(age)}%` }}
              />
            </div>
          </div>
        </div>
      ) : null}

      <dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <div>
          <dt className="text-xs font-medium uppercase text-gray-500">Due date</dt>
          <dd className="mt-0.5 text-sm font-medium text-gray-900">
            {formatDate(pregnancy.edd)}
          </dd>
        </div>
        <div>
          <dt className="text-xs font-medium uppercase text-gray-500">
            Last menstrual period
          </dt>
          <dd className="mt-0.5 text-sm font-medium text-gray-900">
            {formatDate(pregnancy.lmp_date)}
          </dd>
        </div>
        {!isActive && pregnancy.completed_at ? (
          <div>
            <dt className="text-xs font-medium uppercase text-gray-500">Ended</dt>
            <dd className="mt-0.5 text-sm font-medium text-gray-900">
              {formatDate(pregnancy.completed_at)}
            </dd>
          </div>
        ) : null}
      </dl>

      {hasCareDetails ? (
        <div className="flex flex-col gap-2 rounded-lg border border-gray-100 bg-gray-50/60 px-4 py-3 sm:flex-row sm:flex-wrap sm:gap-6">
          {pregnancy.hospital ? (
            <div className="flex items-start gap-2 text-sm text-gray-800">
              <Building2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
              <span>{pregnancy.hospital}</span>
            </div>
          ) : null}
          {pregnancy.location ? (
            <div className="flex items-start gap-2 text-sm text-gray-800">
              <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
              <span>{pregnancy.location}</span>
            </div>
          ) : null}
        </div>
      ) : null}

      {hasConditions ? (
        <div>
          <p className="text-xs font-medium uppercase text-gray-500">Conditions</p>
          <p className="mt-1 text-sm text-gray-800">
            {pregnancy.conditions.join(", ")}
          </p>
        </div>
      ) : null}

      <div className="border-t border-gray-100 pt-4">
        <button
          type="button"
          onClick={() => setVitalsOpen((open) => !open)}
          className="flex w-full items-center justify-between gap-3 text-left"
        >
          <span className="flex items-center gap-2 text-sm font-semibold text-gray-900">
            <Activity className="h-4 w-4 text-emerald-600" />
            Weekly vitals
            <span className="font-normal text-gray-500">
              ({logs.length} week{logs.length === 1 ? "" : "s"} logged)
            </span>
          </span>
          {vitalsOpen ? (
            <ChevronUp className="h-4 w-4 text-gray-400" />
          ) : (
            <ChevronDown className="h-4 w-4 text-gray-400" />
          )}
        </button>

        {!vitalsOpen && latestLog ? (
          <div className="mt-3 rounded-lg border border-gray-100 bg-white px-4 py-3">
            <p className="mb-2 text-xs font-medium uppercase text-gray-500">
              Latest entry
            </p>
            <LatestVitalSummary log={latestLog} />
          </div>
        ) : null}

        {!vitalsOpen && !latestLog ? (
          <p className="mt-3 text-sm text-gray-500">
            No vitals logged yet in the mobile app.
          </p>
        ) : null}

        {vitalsOpen ? (
          <div className="mt-3">
            {logs.length > 0 ? (
              <VitalsTable logs={logs} />
            ) : (
              <p className="text-sm text-gray-500">
                No vitals logged yet in the mobile app.
              </p>
            )}
          </div>
        ) : null}
      </div>
    </div>
  );
}

export default function UserDetailPage() {
  const params = useParams();
  const userId = typeof params.id === "string" ? params.id : "";
  const dispatch = useAppDispatch();
  const { detail, loading, error } = useAppSelector((state) => state.userDetail);

  useEffect(() => {
    if (userId) dispatch(fetchUserDetail(userId));
  }, [dispatch, userId]);

  const profile = detail?.profile;
  const sortedPregnancies = detail ? sortPregnancies(detail.pregnancies) : [];
  const activePregnancy = sortedPregnancies.find((p) => p.status === "active");
  const pastPregnancyCount = sortedPregnancies.filter((p) => p.status !== "active").length;

  return (
    <>
      <PageHero
        title={profile?.full_name || "Parent profile"}
        description="Profile details, pregnancy journey, weekly vitals, and children"
        icon={User}
        stat={{
          label: activePregnancy
            ? "Current week"
            : "Pregnancies",
          value: activePregnancy
            ? (() => {
                const age = gestationalAge(
                  activePregnancy.lmp_date,
                  activePregnancy.edd,
                );
                return age ? `Week ${age.week}` : "—";
              })()
            : (detail?.pregnancies.length ?? 0),
        }}
      />

      <div className="mx-auto max-w-[1200px] space-y-6 px-6 py-8 lg:px-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Link
            href="/admin/users"
            className="inline-flex items-center gap-2 text-sm text-emerald-700 hover:underline"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to parents
          </Link>
          {profile ? <SendPushForm userId={profile.id} role="mother" /> : null}
        </div>

        {error ? (
          <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-600">
            {error}
          </div>
        ) : null}

        {loading && !detail ? (
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-emerald-600 border-t-transparent" />
            Loading parent details…
          </div>
        ) : null}

        {profile ? (
          <>
            <section className="admin-panel">
              <h2 className="admin-section-title mb-4">Profile</h2>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <div>
                  <p className="text-xs font-medium uppercase text-gray-500">Name</p>
                  <p className="text-sm font-medium text-gray-900">
                    {profile.full_name || "-"}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-medium uppercase text-gray-500">Phone</p>
                  <p className="inline-flex items-center gap-1 text-sm text-gray-900">
                    <Phone className="h-3.5 w-3.5 text-gray-400" />
                    {profile.phone || "-"}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-medium uppercase text-gray-500">Locale</p>
                  <p className="text-sm uppercase text-gray-900">
                    {profile.locale || "-"}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-medium uppercase text-gray-500">
                    Onboarding
                  </p>
                  <p className="text-sm text-gray-900">
                    {profile.onboarding_complete ? "Complete" : "Pending"}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-medium uppercase text-gray-500">
                    Dark mode
                  </p>
                  <p className="text-sm text-gray-900">
                    {profile.dark_mode ? "On" : "Off"}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-medium uppercase text-gray-500">Joined</p>
                  <p className="text-sm text-gray-900">
                    {formatDateTime(profile.created_at)}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-medium uppercase text-gray-500">
                    Last updated
                  </p>
                  <p className="text-sm text-gray-900">
                    {formatDateTime(profile.updated_at)}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-medium uppercase text-gray-500">
                    Push token
                  </p>
                  <p className="text-sm text-gray-900">
                    {profile.fcm_token ? "Registered" : "Not registered"}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-medium uppercase text-gray-500">
                    Notifications
                  </p>
                  <p className="text-sm text-gray-900">
                    {profile.notifications_enabled ? "Enabled" : "Disabled"}
                  </p>
                </div>
              </div>
            </section>

            <section>
              <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
                <div>
                  <h2 className="admin-section-title flex items-center gap-2">
                    <Heart className="h-5 w-5 text-emerald-600" />
                    Pregnancy
                  </h2>
                  {pastPregnancyCount > 0 ? (
                    <p className="mt-1 text-sm text-gray-500">
                      {activePregnancy
                        ? `1 active · ${pastPregnancyCount} past`
                        : `${pastPregnancyCount} past record${pastPregnancyCount === 1 ? "" : "s"}`}
                    </p>
                  ) : null}
                </div>
              </div>
              {sortedPregnancies.length === 0 ? (
                <div className="admin-panel text-sm text-gray-500">
                  No pregnancy recorded for this parent yet.
                </div>
              ) : (
                <div className="space-y-4">
                  {sortedPregnancies.map((pregnancy) => (
                    <PregnancyCard
                      key={pregnancy.id}
                      pregnancy={pregnancy}
                      logs={detail.logsByPregnancy[pregnancy.id] ?? []}
                      defaultExpanded={pregnancy.status === "active"}
                    />
                  ))}
                </div>
              )}
            </section>

            <section>
              <h2 className="admin-section-title mb-4 flex items-center gap-2">
                <Baby className="h-5 w-5 text-emerald-600" />
                Children ({detail.children.length})
              </h2>
              {detail.children.length === 0 ? (
                <p className="text-sm text-gray-500">No children recorded.</p>
              ) : (
                <div className="admin-table-wrap">
                  <Table>
                    <TableHeader>
                      <TableRow className="border-b border-white/20 bg-gradient-to-r from-emerald-50/50 to-teal-50/50">
                        <TableHead>Name</TableHead>
                        <TableHead>Gender</TableHead>
                        <TableHead>Birth date</TableHead>
                        <TableHead>Birth weight</TableHead>
                        <TableHead>Birth height</TableHead>
                        <TableHead>Delivery</TableHead>
                        <TableHead>Active</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {detail.children.map((child) => (
                        <TableRow key={child.id}>
                          <TableCell className="font-medium">
                            {child.name || "-"}
                          </TableCell>
                          <TableCell className="capitalize">{child.gender}</TableCell>
                          <TableCell>{formatDate(child.birth_date)}</TableCell>
                          <TableCell>
                            {child.birth_weight != null
                              ? `${child.birth_weight} kg`
                              : "-"}
                          </TableCell>
                          <TableCell>
                            {child.birth_height != null
                              ? `${child.birth_height} cm`
                              : "-"}
                          </TableCell>
                          <TableCell>{child.delivery_type || "-"}</TableCell>
                          <TableCell>
                            {child.is_active ? "Yes" : "No"}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </section>
          </>
        ) : null}
      </div>
    </>
  );
}
