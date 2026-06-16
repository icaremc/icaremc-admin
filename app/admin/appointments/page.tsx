"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { CalendarCheck, ChevronRight } from "lucide-react";
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
  fetchAppointments,
  fetchBookingStats,
  updateAppointmentStatus,
} from "@/features/appointments/appointmentsSlice";
import { APPOINTMENT_STATUSES } from "@/lib/appointments/status";
import { formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { AppointmentStatus } from "@/lib/types/doctors";

type StatusFilter = "all" | AppointmentStatus;

const statusFilters: { value: StatusFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "pending", label: "Pending" },
  { value: "confirmed", label: "Confirmed" },
  { value: "completed", label: "Completed" },
  { value: "cancelled", label: "Cancelled" },
];

function statusBadge(status: AppointmentStatus) {
  const styles: Record<AppointmentStatus, string> = {
    pending: "bg-amber-100 text-amber-800",
    confirmed: "bg-emerald-100 text-emerald-800",
    completed: "bg-gray-100 text-gray-700",
    cancelled: "bg-red-100 text-red-700",
  };
  return (
    <span
      className={`rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${styles[status]}`}
    >
      {status}
    </span>
  );
}

export default function AppointmentsPage() {
  const dispatch = useAppDispatch();
  const { appointments, stats, loading, savingId, error } = useAppSelector(
    (state) => state.appointments,
  );
  const [filter, setFilter] = useState<StatusFilter>("all");
  const [search, setSearch] = useState("");

  useEffect(() => {
    dispatch(fetchAppointments());
    dispatch(fetchBookingStats());
  }, [dispatch]);

  const filteredAppointments = useMemo(() => {
    const query = search.trim().toLowerCase();
    return appointments.filter((appt) => {
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

      return (
        doctorName.includes(query) ||
        patientName.includes(query) ||
        phone.includes(query) ||
        note.includes(query) ||
        appt.time_slot.toLowerCase().includes(query)
      );
    });
  }, [appointments, filter, search]);

  const countForFilter = (value: StatusFilter) => {
    if (value === "all") return stats.total || appointments.length;
    return stats[value] ?? appointments.filter((a) => a.status === value).length;
  };

  return (
    <>
      <PageHero
        title="Appointments"
        description="Bookings from ICare-MC patients — review status and manage the schedule"
        icon={CalendarCheck}
        stat={{ label: "Pending", value: stats.pending }}
      />

      <div className="mx-auto max-w-[1200px] px-6 py-8 lg:px-8">
        <div className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {(
            [
              ["Total", stats.total],
              ["Pending", stats.pending],
              ["Confirmed", stats.confirmed],
              ["Completed", stats.completed],
              ["Cancelled", stats.cancelled],
            ] as const
          ).map(([label, value]) => (
            <div
              key={label}
              className="rounded-xl border border-gray-200 bg-white px-4 py-3"
            >
              <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
                {label}
              </p>
              <p className="mt-1 text-2xl font-semibold text-gray-900">{value}</p>
            </div>
          ))}
        </div>

        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap items-center gap-2">
            {statusFilters.map(({ value, label }) => (
              <button
                key={value}
                type="button"
                onClick={() => setFilter(value)}
                className={cn(
                  "rounded-full px-3 py-1.5 text-sm font-medium transition-colors",
                  filter === value
                    ? "bg-emerald-100 text-emerald-800"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200",
                )}
              >
                {label} ({countForFilter(value)})
              </button>
            ))}
          </div>
          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search patient, doctor, phone…"
            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm sm:max-w-xs"
          />
        </div>

        {error ? (
          <p className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </p>
        ) : null}

        <div className="admin-table-wrap">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Time</TableHead>
                <TableHead>Patient</TableHead>
                <TableHead>Doctor</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Note</TableHead>
                <TableHead className="w-10" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={7} className="py-10 text-center text-gray-500">
                    Loading appointments…
                  </TableCell>
                </TableRow>
              ) : filteredAppointments.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="py-10 text-center text-gray-500">
                    No appointments match your filters.
                  </TableCell>
                </TableRow>
              ) : (
                filteredAppointments.map((appt) => {
                  const doctor = appt.doctor_profiles;
                  const patient = appt.profiles;
                  const doctorLabel = doctor
                    ? `Dr. ${doctor.first_name} ${doctor.last_name}`
                    : "—";
                  const patientLabel =
                    appt.patient_name ?? patient?.full_name ?? "Patient";
                  const isSaving = savingId === appt.id;

                  return (
                    <TableRow key={appt.id}>
                      <TableCell>{formatDate(appt.appointment_date)}</TableCell>
                      <TableCell>{appt.time_slot}</TableCell>
                      <TableCell>
                        <Link
                          href={`/admin/users/${appt.patient_id}`}
                          className="font-medium text-emerald-700 hover:underline"
                        >
                          {patientLabel}
                        </Link>
                        <div className="text-xs text-gray-500">
                          {appt.patient_phone ?? patient?.phone ?? "—"}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Link
                          href={`/admin/doctors/${appt.doctor_id}`}
                          className="font-medium text-emerald-700 hover:underline"
                        >
                          {doctorLabel}
                        </Link>
                        <div className="text-xs text-gray-500">
                          {doctor?.specialty ?? "—"}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col gap-2">
                          {statusBadge(appt.status)}
                          <select
                            value={appt.status}
                            disabled={isSaving}
                            onChange={(event) => {
                              const nextStatus = event.target
                                .value as AppointmentStatus;
                              if (nextStatus === appt.status) return;
                              dispatch(
                                updateAppointmentStatus({
                                  id: appt.id,
                                  status: nextStatus,
                                }),
                              ).then(() => dispatch(fetchBookingStats()));
                            }}
                            className="rounded-md border border-gray-200 bg-white px-2 py-1 text-xs text-gray-700 disabled:opacity-50"
                          >
                            {APPOINTMENT_STATUSES.map((status) => (
                              <option key={status} value={status}>
                                Set {status}
                              </option>
                            ))}
                          </select>
                        </div>
                      </TableCell>
                      <TableCell className="max-w-[220px] truncate">
                        {appt.note ?? "—"}
                      </TableCell>
                      <TableCell>
                        <ChevronRight className="h-4 w-4 text-gray-300" />
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </>
  );
}
