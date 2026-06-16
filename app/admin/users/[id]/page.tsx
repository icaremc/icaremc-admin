"use client";

import { useEffect, useMemo } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  Activity,
  ArrowLeft,
  Baby,
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
import { dailyTipWeekPath } from "@/lib/content/contentLabels";
import { formatGestationalAge, gestationalAge } from "@/lib/pregnancy";
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

function VitalsGrid({ logs }: { logs: PregnancyLog[] }) {
  const byWeek = useMemo(() => {
    const map = new Map<number, PregnancyLog>();
    for (const log of logs) map.set(log.week_number, log);
    return map;
  }, [logs]);

  const weeksWithData = [...byWeek.keys()].sort((a, b) => a - b);

  if (weeksWithData.length === 0) {
    return (
      <p className="text-sm text-gray-500">
        No weekly vitals logged yet (weeks 1–40).
      </p>
    );
  }

  return (
    <div className="admin-table-wrap">
      <Table>
        <TableHeader>
          <TableRow className="border-b border-white/20 bg-gradient-to-r from-emerald-50/50 to-teal-50/50">
            <TableHead>Week</TableHead>
            <TableHead>Weight</TableHead>
            <TableHead>Height</TableHead>
            <TableHead>Blood pressure</TableHead>
            <TableHead>Temp</TableHead>
            <TableHead>Symptoms</TableHead>
            <TableHead>Notes</TableHead>
            <TableHead>Updated</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {weeksWithData.map((week) => {
            const log = byWeek.get(week)!;
            return (
              <TableRow key={log.id}>
                <TableCell className="font-medium">Week {week}</TableCell>
                <TableCell>
                  {log.weight != null ? `${log.weight} kg` : "-"}
                </TableCell>
                <TableCell>
                  {log.height != null ? `${log.height} cm` : "-"}
                </TableCell>
                <TableCell>
                  {log.blood_pressure_systolic != null
                    ? `${log.blood_pressure_systolic}/${log.blood_pressure_diastolic ?? "-"}`
                    : "-"}
                </TableCell>
                <TableCell>
                  {log.temperature != null ? `${log.temperature} °C` : "-"}
                </TableCell>
                <TableCell>
                  {log.symptoms.length ? log.symptoms.join(", ") : "-"}
                </TableCell>
                <TableCell className="text-gray-600">
                  {truncate(log.notes ?? "", 48)}
                </TableCell>
                <TableCell className="text-gray-500 text-xs">
                  {formatDateTime(log.updated_at)}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}

function PregnancyCard({
  pregnancy,
  logs,
}: {
  pregnancy: Pregnancy;
  logs: PregnancyLog[];
}) {
  const isActive = pregnancy.status === "active";
  const age = isActive
    ? gestationalAge(pregnancy.lmp_date, pregnancy.edd)
    : null;

  return (
    <div className="admin-panel space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">
            Pregnancy #{pregnancy.pregnancy_number}
          </h3>
        </div>
        {statusBadge(pregnancy.status)}
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <p className="text-xs font-medium uppercase text-gray-500">LMP</p>
          <p className="text-sm text-gray-900">{formatDate(pregnancy.lmp_date)}</p>
        </div>
        <div>
          <p className="text-xs font-medium uppercase text-gray-500">EDD</p>
          <p className="text-sm text-gray-900">{formatDate(pregnancy.edd)}</p>
        </div>
        <div>
          <p className="text-xs font-medium uppercase text-gray-500">
            Gestational age
          </p>
          <p className="text-sm text-gray-900">
            {age ? formatGestationalAge(age) : "-"}
          </p>
        </div>
        <div>
          <p className="text-xs font-medium uppercase text-gray-500">
            First pregnancy
          </p>
          <p className="text-sm text-gray-900">
            {pregnancy.is_first_pregnancy ? "Yes" : "No"}
          </p>
        </div>
      </div>

      {(pregnancy.location || pregnancy.hospital) && (
        <div className="flex flex-wrap gap-4 text-sm text-gray-700">
          {pregnancy.location ? (
            <span className="inline-flex items-center gap-1">
              <MapPin className="h-4 w-4 text-emerald-600" />
              {pregnancy.location}
            </span>
          ) : null}
          {pregnancy.hospital ? (
            <span>{pregnancy.hospital}</span>
          ) : null}
        </div>
      )}

      {pregnancy.conditions.length > 0 ? (
        <div>
          <p className="mb-1 text-xs font-medium uppercase text-gray-500">
            Conditions
          </p>
          <p className="text-sm text-gray-800">
            {pregnancy.conditions.join(", ")}
          </p>
        </div>
      ) : null}

      {age ? (
        <div className="flex flex-wrap gap-3 text-sm">
          <Link
            href={`/admin/pregnancy-weeks/${age.week}`}
            className="text-emerald-700 hover:underline"
          >
            Week {age.week} CMS content
          </Link>
          <Link
            href={dailyTipWeekPath(age.week)}
            className="text-emerald-700 hover:underline"
          >
            Daily tips for week {age.week}
          </Link>
        </div>
      ) : null}

      <div>
        <h4 className="admin-section-title mb-3 flex items-center gap-2">
          <Activity className="h-4 w-4 text-emerald-600" />
          Weekly vitals ({logs.length} weeks logged)
        </h4>
        <VitalsGrid logs={logs} />
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
  const activePregnancy = detail?.pregnancies.find((p) => p.status === "active");

  return (
    <>
      <PageHero
        title={profile?.full_name || "Mother profile"}
        description="Pregnancy journey, weekly vitals, and children"
        icon={User}
        stat={{
          label: "Pregnancies",
          value: detail?.pregnancies.length ?? 0,
        }}
      />

      <div className="mx-auto max-w-[1200px] space-y-6 px-6 py-8 lg:px-8">
        <Link
          href="/admin/users"
          className="inline-flex items-center gap-2 text-sm text-emerald-700 hover:underline"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to users
        </Link>

        {error ? (
          <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-600">
            {error}
          </div>
        ) : null}

        {loading && !detail ? (
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-emerald-600 border-t-transparent" />
            Loading mother details…
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
                  <p className="text-xs font-medium uppercase text-gray-500">Role</p>
                  <p className="text-sm capitalize text-gray-900">
                    {profile.role ?? "mother"}
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
                  <p className="text-xs font-medium uppercase text-gray-500">Joined</p>
                  <p className="text-sm text-gray-900">
                    {formatDateTime(profile.created_at)}
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

            <section className="admin-panel">
              <SendPushForm userId={profile.id} role={profile.role} />
            </section>

            <section>
              <h2 className="admin-section-title mb-4 flex items-center gap-2">
                <Heart className="h-5 w-5 text-emerald-600" />
                Pregnancies
              </h2>
              {detail.pregnancies.length === 0 ? (
                <p className="text-sm text-gray-500">No pregnancy records.</p>
              ) : (
                <div className="space-y-6">
                  {detail.pregnancies.map((pregnancy) => (
                    <PregnancyCard
                      key={pregnancy.id}
                      pregnancy={pregnancy}
                      logs={detail.logsByPregnancy[pregnancy.id] ?? []}
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

            {activePregnancy && detail.logsByPregnancy[activePregnancy.id]?.length === 0 ? (
              <p className="text-sm text-amber-700">
                Active pregnancy has no weekly health logs yet. The mother can save
                vitals in the mobile app Health tracker.
              </p>
            ) : null}
          </>
        ) : null}
      </div>
    </>
  );
}
