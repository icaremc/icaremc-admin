"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  CalendarCheck,
  ChevronDown,
  ChevronRight,
  ChevronUp,
  Clock,
  Loader2,
  Search,
  Stethoscope,
  User,
} from "lucide-react";
import PageHero from "@/components/PageHero";
import { Button } from "@/components/ui/button";
import { useAppDispatch, useAppSelector } from "@/app/store/hooks";
import {
  fetchAppointments,
  fetchBookingStats,
  updateAppointmentStatus,
  type BookingStats,
} from "@/features/appointments/appointmentsSlice";
import {
  APPOINTMENT_STATUSES,
  formatAppointmentDate,
} from "@/lib/appointments/status";
import {
  appointmentStatusClass,
  doctorLabel,
  formatMoney,
  nextStatusActions,
  patientLabel,
  patientPhone,
  statusActionLabel,
} from "@/lib/appointments/display";
import { cn } from "@/lib/utils";
import type { Appointment, AppointmentStatus } from "@/lib/types/doctors";

type StatusFilter = "all" | AppointmentStatus;

const ACTIVE_STATUSES: AppointmentStatus[] = ["pending", "confirmed"];

const statFilters: {
  value: StatusFilter;
  label: string;
  statKey: keyof BookingStats;
  accent: string;
}[] = [
  { value: "all", label: "Total", statKey: "total", accent: "border-gray-200" },
  { value: "pending", label: "Pending", statKey: "pending", accent: "border-amber-200" },
  {
    value: "confirmed",
    label: "Confirmed",
    statKey: "confirmed",
    accent: "border-emerald-200",
  },
  {
    value: "completed",
    label: "Completed",
    statKey: "completed",
    accent: "border-gray-200",
  },
  {
    value: "cancelled",
    label: "Cancelled",
    statKey: "cancelled",
    accent: "border-red-200",
  },
];

function statusBadge(status: AppointmentStatus) {
  return (
    <span
      className={cn(
        "rounded-full px-2.5 py-0.5 text-xs font-medium capitalize",
        appointmentStatusClass(status),
      )}
    >
      {status}
    </span>
  );
}

function paymentBadge(appt: Appointment) {
  const styles: Record<Appointment["payment_status"], string> = {
    paid: "bg-emerald-50 text-emerald-700",
    partial: "bg-amber-50 text-amber-700",
    unpaid: "bg-gray-100 text-gray-600",
    waived: "bg-gray-100 text-gray-600",
  };
  const labels: Record<Appointment["payment_status"], string> = {
    paid: "Paid",
    partial: "Partial payment",
    unpaid: "Unpaid",
    waived: "Waived",
  };
  return (
    <span
      className={`rounded-full px-2 py-0.5 text-xs font-medium ${styles[appt.payment_status]}`}
    >
      {labels[appt.payment_status]}
    </span>
  );
}

function startOfDay(date = new Date()): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function dateKey(value: string): string {
  return value.slice(0, 10);
}

function dateGroupLabel(value: string): string {
  const apptDay = startOfDay(new Date(`${value}T12:00:00`));
  const today = startOfDay();
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  if (apptDay.getTime() === today.getTime()) return "Today";
  if (apptDay.getTime() === tomorrow.getTime()) return "Tomorrow";
  return formatAppointmentDate(value);
}

function compareAppointments(a: Appointment, b: Appointment): number {
  const aActive = ACTIVE_STATUSES.includes(a.status);
  const bActive = ACTIVE_STATUSES.includes(b.status);

  if (aActive && !bActive) return -1;
  if (!aActive && bActive) return 1;

  const dateA = new Date(`${a.appointment_date}T12:00:00`).getTime();
  const dateB = new Date(`${b.appointment_date}T12:00:00`).getTime();

  if (dateA !== dateB) {
    return aActive ? dateA - dateB : dateB - dateA;
  }

  return a.time_slot.localeCompare(b.time_slot);
}

function groupByDate(appointments: Appointment[]): [string, Appointment[]][] {
  const map = new Map<string, Appointment[]>();
  for (const appt of appointments) {
    const key = dateKey(appt.appointment_date);
    map.set(key, [...(map.get(key) ?? []), appt]);
  }

  return [...map.entries()].sort(([keyA], [keyB]) => {
    const a = appointments.find((appt) => dateKey(appt.appointment_date) === keyA);
    const b = appointments.find((appt) => dateKey(appt.appointment_date) === keyB);
    if (!a || !b) return keyB.localeCompare(keyA);
    return compareAppointments(a, b);
  });
}

function AppointmentCard({
  appt,
  isSaving,
  onStatusChange,
}: {
  appt: Appointment;
  isSaving: boolean;
  onStatusChange: (id: string, status: AppointmentStatus) => void;
}) {
  const router = useRouter();
  const [expanded, setExpanded] = useState(false);
  const doctor = appt.doctor_profiles;
  const quickActions = nextStatusActions(appt.status);
  const hasExtraDetails =
    Boolean(appt.note?.trim()) ||
    Boolean(appt.service_name) ||
    appt.total_amount > 0 ||
    appt.payment_status !== "unpaid";

  return (
    <article
      className="admin-panel cursor-pointer overflow-hidden p-0 transition hover:border-emerald-200 hover:bg-emerald-50/20"
      onClick={() => router.push(`/admin/appointments/${appt.id}`)}
    >
      <div className="flex flex-col gap-4 p-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0 flex-1 space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <div className="inline-flex items-center gap-1.5 text-sm font-semibold text-gray-900">
              <Clock className="h-4 w-4 text-emerald-600" />
              {appt.time_slot}
            </div>
            {statusBadge(appt.status)}
            {appt.total_amount > 0 ? paymentBadge(appt) : null}
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="min-w-0">
              <p className="text-xs font-medium uppercase text-gray-500">Patient</p>
              <Link
                href={`/admin/users/${appt.patient_id}`}
                className="mt-0.5 inline-flex items-center gap-1.5 font-medium text-emerald-700 hover:underline"
                onClick={(event) => event.stopPropagation()}
              >
                <User className="h-3.5 w-3.5" />
                {patientLabel(appt)}
              </Link>
              {patientPhone(appt) ? (
                <p className="mt-0.5 text-sm text-gray-500">{patientPhone(appt)}</p>
              ) : null}
            </div>
            <div className="min-w-0">
              <p className="text-xs font-medium uppercase text-gray-500">Doctor</p>
              <Link
                href={`/admin/doctors/${appt.doctor_id}`}
                className="mt-0.5 inline-flex items-center gap-1.5 font-medium text-emerald-700 hover:underline"
                onClick={(event) => event.stopPropagation()}
              >
                <Stethoscope className="h-3.5 w-3.5" />
                {doctorLabel(appt)}
              </Link>
              <p className="mt-0.5 text-sm text-gray-500">
                {[doctor?.specialty, doctor?.hospital].filter(Boolean).join(" · ") ||
                  "—"}
              </p>
            </div>
          </div>

          {appt.service_name ? (
            <p className="text-sm text-gray-600">
              <span className="font-medium text-gray-800">{appt.service_name}</span>
              {appt.service_price != null
                ? ` · ${formatMoney(appt.service_price, appt.currency)}`
                : ""}
            </p>
          ) : null}
        </div>

        <div
          className="flex shrink-0 flex-wrap items-center gap-2 lg:flex-col lg:items-end"
          onClick={(event) => event.stopPropagation()}
        >
          {quickActions.map((status) => (
            <Button
              key={status}
              type="button"
              size="sm"
              variant={status === "cancelled" ? "outline" : "default"}
              disabled={isSaving}
              className={cn(
                status === "cancelled" && "text-red-700 hover:text-red-800",
              )}
              onClick={() => onStatusChange(appt.id, status)}
            >
              {isSaving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                statusActionLabel(status)
              )}
            </Button>
          ))}
          <Link
            href={`/admin/appointments/${appt.id}`}
            className="inline-flex items-center gap-1 text-sm font-medium text-emerald-700 hover:underline"
            onClick={(event) => event.stopPropagation()}
          >
            View details
            <ChevronRight className="h-4 w-4" />
          </Link>
          {hasExtraDetails ? (
            <button
              type="button"
              onClick={() => setExpanded((open) => !open)}
              className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700"
            >
              {expanded ? "Less" : "More"}
              {expanded ? (
                <ChevronUp className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
            </button>
          ) : null}
        </div>
      </div>

      {expanded ? (
        <div
          className="space-y-3 border-t border-gray-100 bg-gray-50/60 px-4 py-3"
          onClick={(event) => event.stopPropagation()}
        >
          {appt.note?.trim() ? (
            <div>
              <p className="text-xs font-medium uppercase text-gray-500">Note</p>
              <p className="mt-1 text-sm text-gray-800">{appt.note}</p>
            </div>
          ) : null}

          {appt.total_amount > 0 ? (
            <dl className="grid gap-3 text-sm sm:grid-cols-3">
              <div>
                <dt className="text-xs font-medium uppercase text-gray-500">Total</dt>
                <dd className="mt-0.5 font-medium text-gray-900">
                  {formatMoney(appt.total_amount, appt.currency)}
                </dd>
              </div>
              <div>
                <dt className="text-xs font-medium uppercase text-gray-500">Paid</dt>
                <dd className="mt-0.5 font-medium text-gray-900">
                  {formatMoney(appt.amount_paid, appt.currency)}
                </dd>
              </div>
              <div>
                <dt className="text-xs font-medium uppercase text-gray-500">
                  Prepayment
                </dt>
                <dd className="mt-0.5 font-medium capitalize text-gray-900">
                  {appt.prepayment_mode === "none"
                    ? "None"
                    : appt.prepayment_mode === "full"
                      ? "Full"
                      : `${appt.prepayment_percent ?? 0}%`}
                </dd>
              </div>
            </dl>
          ) : null}

          <div className="flex flex-wrap items-center gap-3">
            <label className="text-xs font-medium uppercase text-gray-500">
              Change status
            </label>
            <select
              value={appt.status}
              disabled={isSaving}
              onChange={(event) => {
                const nextStatus = event.target.value as AppointmentStatus;
                if (nextStatus !== appt.status) {
                  onStatusChange(appt.id, nextStatus);
                }
              }}
              className="rounded-md border border-gray-200 bg-white px-2 py-1.5 text-sm text-gray-700 disabled:opacity-50"
            >
              {APPOINTMENT_STATUSES.map((status) => (
                <option key={status} value={status}>
                  {status.charAt(0).toUpperCase() + status.slice(1)}
                </option>
              ))}
            </select>
          </div>
        </div>
      ) : null}
    </article>
  );
}

export default function AppointmentsPage() {
  const dispatch = useAppDispatch();
  const { appointments, stats, loading, savingId, error } = useAppSelector(
    (state) => state.appointments,
  );
  const [filter, setFilter] = useState<StatusFilter>("pending");
  const [search, setSearch] = useState("");

  useEffect(() => {
    dispatch(fetchAppointments());
    dispatch(fetchBookingStats());
  }, [dispatch]);

  const filteredAppointments = useMemo(() => {
    const query = search.trim().toLowerCase();
    return appointments
      .filter((appt) => {
        if (filter !== "all" && appt.status !== filter) return false;
        if (!query) return true;

        const doctor = appt.doctor_profiles;
        const patient = appt.profiles;
        const doctorName = doctor
          ? `${doctor.first_name} ${doctor.last_name}`.toLowerCase()
          : "";
        const patientName = (
          appt.patient_name ??
          patient?.full_name ??
          ""
        ).toLowerCase();
        const phone = (appt.patient_phone ?? patient?.phone ?? "").toLowerCase();
        const note = (appt.note ?? "").toLowerCase();
        const service = (appt.service_name ?? "").toLowerCase();
        const hospital = (doctor?.hospital ?? "").toLowerCase();

        return (
          doctorName.includes(query) ||
          patientName.includes(query) ||
          phone.includes(query) ||
          note.includes(query) ||
          service.includes(query) ||
          hospital.includes(query) ||
          appt.time_slot.toLowerCase().includes(query)
        );
      })
      .sort(compareAppointments);
  }, [appointments, filter, search]);

  const groupedAppointments = useMemo(
    () => groupByDate(filteredAppointments),
    [filteredAppointments],
  );

  const upcomingCount = useMemo(() => {
    const today = startOfDay().getTime();
    return appointments.filter(
      (appt) =>
        ACTIVE_STATUSES.includes(appt.status) &&
        new Date(`${appt.appointment_date}T12:00:00`).getTime() >= today,
    ).length;
  }, [appointments]);

  function handleStatusChange(id: string, status: AppointmentStatus) {
    dispatch(updateAppointmentStatus({ id, status })).then((result) => {
      if (updateAppointmentStatus.fulfilled.match(result)) {
        dispatch(fetchBookingStats());
      }
    });
  }

  return (
    <>
      <PageHero
        title="Appointments"
        description="Bookings from ICare-MC — review upcoming visits and update status"
        icon={CalendarCheck}
        stat={{ label: "Upcoming", value: upcomingCount }}
      />

      <div className="mx-auto max-w-[1200px] px-6 py-8 lg:px-8">
        <div className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {statFilters.map(({ value, label, statKey, accent }) => {
            const count = stats[statKey] ?? 0;
            const selected = filter === value;
            return (
              <button
                key={value}
                type="button"
                onClick={() => setFilter(value)}
                className={cn(
                  "rounded-xl border bg-white px-4 py-3 text-left transition",
                  selected
                    ? "border-emerald-300 bg-emerald-50/50 ring-2 ring-emerald-200"
                    : cn(accent, "hover:border-emerald-200 hover:bg-emerald-50/30"),
                )}
              >
                <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
                  {label}
                </p>
                <p className="mt-1 text-2xl font-semibold tabular-nums text-gray-900">
                  {count}
                </p>
              </button>
            );
          })}
        </div>

        <div className="mb-6">
          <div className="relative w-full sm:max-w-md">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search patient, doctor, phone, service…"
              className="w-full rounded-[var(--radius)] border border-gray-200 bg-white py-3 pl-11 pr-4 text-sm text-gray-900 shadow-sm placeholder:text-gray-500 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-200/50"
            />
          </div>
        </div>

        {error ? (
          <p className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </p>
        ) : null}

        {loading ? (
          <div className="flex items-center gap-2 py-12 text-sm text-gray-600">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading appointments…
          </div>
        ) : filteredAppointments.length === 0 ? (
          <div className="admin-panel py-12 text-center text-sm text-gray-500">
            {filter === "pending"
              ? "No pending appointments — all caught up."
              : "No appointments match your filters."}
          </div>
        ) : (
          <div className="space-y-8">
            {groupedAppointments.map(([day, dayAppointments]) => (
              <section key={day}>
                <h2 className="admin-section-title mb-3">
                  {dateGroupLabel(dayAppointments[0].appointment_date)}
                </h2>
                <div className="space-y-3">
                  {dayAppointments
                    .sort(compareAppointments)
                    .map((appt) => (
                      <AppointmentCard
                        key={appt.id}
                        appt={appt}
                        isSaving={savingId === appt.id}
                        onStatusChange={handleStatusChange}
                      />
                    ))}
                </div>
              </section>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
