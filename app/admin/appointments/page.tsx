"use client";

import { useEffect } from "react";
import { CalendarCheck2 } from "lucide-react";
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
import { fetchAppointments } from "@/features/appointments/appointmentsSlice";
import { formatDateTime } from "@/lib/format";

export default function AppointmentsPage() {
  const dispatch = useAppDispatch();
  const { appointments, loading, error } = useAppSelector(
    (state) => state.appointments,
  );

  useEffect(() => {
    dispatch(fetchAppointments());
  }, [dispatch]);

  return (
    <>
      <PageHero
        title="Appointments"
        description="Prenatal visits and ultrasound appointments"
        icon={CalendarCheck2}
        stat={{ label: "Total", value: appointments.length }}
      />

      <div className="mx-auto max-w-[1200px] px-6 py-8 lg:px-8">
        {error ? (
          <div className="mb-4 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-600">
            {error}
          </div>
        ) : null}

        <div className="admin-table-wrap">
          <Table>
            <TableHeader>
              <TableRow className="border-b border-white/20 bg-gradient-to-r from-emerald-50/50 to-teal-50/50">
                <TableHead className="font-semibold text-gray-700">Title</TableHead>
                <TableHead className="font-semibold text-gray-700">Type</TableHead>
                <TableHead className="font-semibold text-gray-700">When</TableHead>
                <TableHead className="font-semibold text-gray-700">Location</TableHead>
                <TableHead className="font-semibold text-gray-700">User ID</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={5} className="py-8 text-center text-gray-500">
                    Loading appointments…
                  </TableCell>
                </TableRow>
              ) : appointments.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="py-8 text-center text-gray-500">
                    No appointments found.
                  </TableCell>
                </TableRow>
              ) : (
                appointments.map((appointment) => (
                  <TableRow key={appointment.id}>
                    <TableCell className="font-medium text-gray-900">
                      {appointment.title}
                    </TableCell>
                    <TableCell>{appointment.appointment_type || "—"}</TableCell>
                    <TableCell className="text-gray-600">
                      {formatDateTime(appointment.appointment_at)}
                    </TableCell>
                    <TableCell>{appointment.location || "—"}</TableCell>
                    <TableCell className="font-mono text-xs text-gray-600">
                      {appointment.user_id.slice(0, 8)}…
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </>
  );
}
