"use client";

import Link from "next/link";
import { DollarSign, Wallet } from "lucide-react";
import StatCard from "@/components/StatCard";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatMoney } from "@/lib/appointments/display";
import { formatAppointmentDate } from "@/lib/appointments/status";
import { formatDateTime } from "@/lib/format";
import type { DoctorWalletHistory } from "@/lib/finance/doctorWalletHistory";
import { cn } from "@/lib/utils";

type DoctorWalletPanelProps = {
  history: DoctorWalletHistory | null;
  loading: boolean;
  error: string | null;
};

export default function DoctorWalletPanel({
  history,
  loading,
  error,
}: DoctorWalletPanelProps) {
  const currency = history?.wallet?.currency ?? "ETB";

  if (loading && !history) {
    return (
      <div className="flex items-center gap-2 text-sm text-gray-600">
        <div className="h-4 w-4 animate-spin rounded-full border-2 border-emerald-600 border-t-transparent" />
        Loading wallet history…
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-[var(--radius)] border border-red-200 bg-red-50 p-4 text-sm text-red-600">
        {error}
      </div>
    );
  }

  if (!history) {
    return (
      <p className="text-sm text-gray-500">No wallet data available for this doctor.</p>
    );
  }

  return (
    <div className="space-y-8">
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Available balance"
          value={formatMoney(history.wallet?.available_balance ?? 0, currency)}
          icon={Wallet}
          accent="emerald"
        />
        <StatCard
          label="Pending payout"
          value={formatMoney(history.wallet?.pending_balance ?? 0, currency)}
          icon={Wallet}
          accent="amber"
        />
        <StatCard
          label="Total earnings"
          value={formatMoney(
            history.earnings.reduce((sum, row) => sum + row.amount, 0),
            currency,
          )}
          icon={DollarSign}
          accent="teal"
        />
        <StatCard
          label="Platform commission"
          value={`${history.commissionPercent}%`}
          icon={DollarSign}
          accent="violet"
        />
      </section>

      <section className="admin-panel">
        <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="admin-section-title">Earning history</h2>
            <p className="mt-1 text-sm text-gray-500">
              Net credits from completed appointments
            </p>
          </div>
          <span className="text-sm text-gray-500">
            {history.earnings.length} record{history.earnings.length === 1 ? "" : "s"}
          </span>
        </div>
        <div className="admin-table-wrap">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Appointment</TableHead>
                <TableHead>Parent</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {history.earnings.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="py-8 text-center text-gray-500">
                    No earnings recorded yet.
                  </TableCell>
                </TableRow>
              ) : (
                history.earnings.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell className="text-sm text-gray-600">
                      {formatDateTime(row.created_at)}
                    </TableCell>
                    <TableCell className="font-medium text-emerald-700">
                      +{formatMoney(row.amount, currency)}
                    </TableCell>
                    <TableCell className="text-sm">
                      {row.appointment_id ? (
                        <Link
                          href={`/admin/appointments/${row.appointment_id}`}
                          className="font-medium text-emerald-700 hover:underline"
                        >
                          {row.service_name?.trim() || "Consultation"}
                          {row.appointment_date && row.time_slot
                            ? ` · ${formatAppointmentDate(row.appointment_date)} ${row.time_slot}`
                            : null}
                        </Link>
                      ) : (
                        <span className="text-gray-500">N/A</span>
                      )}
                    </TableCell>
                    <TableCell className="text-sm">
                      {row.patient_id && row.patient_name ? (
                        <Link
                          href={`/admin/users/${row.patient_id}`}
                          className="font-medium text-emerald-700 hover:underline"
                        >
                          {row.patient_name}
                        </Link>
                      ) : (
                        <span className="text-gray-500">N/A</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </section>

      <section className="admin-panel">
        <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="admin-section-title">Wallet transactions</h2>
            <p className="mt-1 text-sm text-gray-500">
              Credits, payout holds, releases, penalties, and adjustments
            </p>
          </div>
          <span className="text-sm text-gray-500">
            {history.transactions.length} record
            {history.transactions.length === 1 ? "" : "s"}
          </span>
        </div>
        <div className="admin-table-wrap">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Note</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {history.transactions.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="py-8 text-center text-gray-500">
                    No wallet transactions yet.
                  </TableCell>
                </TableRow>
              ) : (
                history.transactions.map((tx) => (
                  <TableRow key={tx.id}>
                    <TableCell className="text-sm text-gray-600">
                      {formatDateTime(tx.created_at)}
                    </TableCell>
                    <TableCell className="capitalize">
                      {tx.type.replace(/_/g, " ")}
                    </TableCell>
                    <TableCell
                      className={cn(
                        "font-semibold",
                        tx.is_credit ? "text-emerald-700" : "text-red-700",
                      )}
                    >
                      {tx.is_credit ? "+" : "−"}
                      {formatMoney(Number(tx.amount), currency)}
                    </TableCell>
                    <TableCell className="max-w-[280px] truncate text-sm text-gray-600">
                      {tx.note ?? "—"}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </section>
    </div>
  );
}
