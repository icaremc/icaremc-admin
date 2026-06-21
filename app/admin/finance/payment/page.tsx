"use client";

import { useEffect, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CreditCard } from "lucide-react";
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
import { formatMoney } from "@/lib/appointments/display";
import { formatAppointmentDate } from "@/lib/appointments/status";
import { formatDateTime } from "@/lib/format";
import { cn } from "@/lib/utils";

export default function FinancePaymentsPage() {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const { appointments, loading, error } = useAppSelector((state) => state.appointments);

  useEffect(() => {
    dispatch(fetchAppointments());
  }, [dispatch]);

  const payments = useMemo(
    () =>
      appointments
        .filter((appt) => appt.amount_paid > 0 || appt.payment_status !== "unpaid")
        .sort((a, b) => b.appointment_date.localeCompare(a.appointment_date)),
    [appointments],
  );

  const paidTotal = payments.reduce((sum, appt) => sum + Number(appt.amount_paid ?? 0), 0);

  return (
    <>
      <PageHero
        title="Payments"
        description="Appointment prepayments and payment status from the patient app"
        icon={CreditCard}
        stat={{ label: "Collected", value: formatMoney(paidTotal, "ETB") }}
      />

      <div className="mx-auto max-w-[1200px] px-6 py-8 lg:px-8">
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
                <TableHead>Patient</TableHead>
                <TableHead>Doctor</TableHead>
                <TableHead>Total</TableHead>
                <TableHead>Paid</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Updated</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={7} className="py-10 text-center text-gray-500">
                    Loading payments…
                  </TableCell>
                </TableRow>
              ) : payments.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="py-10 text-center text-gray-500">
                    No payment records yet.
                  </TableCell>
                </TableRow>
              ) : (
                payments.map((appt) => {
                  const doctor = appt.doctor_profiles;
                  return (
                    <TableRow
                      key={appt.id}
                      className="cursor-pointer hover:bg-emerald-50/60"
                      onClick={() => router.push(`/admin/appointments/${appt.id}`)}
                    >
                      <TableCell>
                        {formatAppointmentDate(appt.appointment_date)}
                        <p className="text-xs text-gray-500">{appt.time_slot}</p>
                      </TableCell>
                      <TableCell>
                        <Link
                          href={`/admin/users/${appt.patient_id}`}
                          className="font-medium text-emerald-700 hover:underline"
                          onClick={(e) => e.stopPropagation()}
                        >
                          {appt.patient_name ?? appt.profiles?.full_name ?? "Patient"}
                        </Link>
                      </TableCell>
                      <TableCell>
                        {doctor
                          ? `Dr. ${doctor.first_name} ${doctor.last_name}`
                          : "—"}
                      </TableCell>
                      <TableCell>
                        {formatMoney(Number(appt.total_amount), appt.currency)}
                      </TableCell>
                      <TableCell className="font-medium">
                        {formatMoney(Number(appt.amount_paid), appt.currency)}
                      </TableCell>
                      <TableCell>
                        <span
                          className={cn(
                            "rounded-full px-2 py-0.5 text-xs font-medium capitalize",
                            appt.payment_status === "paid"
                              ? "bg-emerald-100 text-emerald-800"
                              : appt.payment_status === "partial"
                                ? "bg-amber-100 text-amber-800"
                                : "bg-gray-100 text-gray-700",
                          )}
                        >
                          {appt.payment_status}
                        </span>
                      </TableCell>
                      <TableCell className="text-sm text-gray-500">
                        {formatDateTime(appt.updated_at)}
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
