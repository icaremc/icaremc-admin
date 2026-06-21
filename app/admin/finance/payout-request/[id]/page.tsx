"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  ArrowLeft,
  DollarSign,
  Loader2,
  Wallet,
} from "lucide-react";
import PageHero from "@/components/PageHero";
import StatCard from "@/components/StatCard";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useAppDispatch, useAppSelector } from "@/app/store/hooks";
import { fetchPayoutDetail } from "@/features/finance/payoutDetailSlice";
import {
  sendPayoutViaChapa,
  updatePayoutRequest,
  verifyPayoutViaChapa,
  type ChapaTransferResult,
} from "@/features/finance/payoutSlice";
import { formatMoney } from "@/lib/appointments/display";
import { formatAppointmentDate } from "@/lib/appointments/status";
import { formatDateTime } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { PayoutRequestStatus } from "@/lib/types/finance";

const statusStyles: Record<PayoutRequestStatus, string> = {
  pending: "bg-amber-100 text-amber-800",
  approved: "bg-emerald-100 text-emerald-800",
  rejected: "bg-red-100 text-red-700",
  completed: "bg-gray-100 text-gray-700",
};

function hasChapaReference(note: string | null | undefined): boolean {
  return (note ?? "").toLowerCase().includes("reference=");
}

function maskAccountNumber(accountNumber?: string | null): string {
  const normalized = (accountNumber ?? "").trim();
  if (!normalized) return "—";
  if (normalized.length <= 4) return normalized;
  return `${"*".repeat(Math.max(normalized.length - 4, 2))}${normalized.slice(-4)}`;
}

export default function PayoutRequestDetailPage() {
  const params = useParams();
  const dispatch = useAppDispatch();
  const id = params.id as string;

  const { request, context, loading, error } = useAppSelector(
    (state) => state.payoutDetail,
  );
  const savingId = useAppSelector((state) => state.payout.savingId);

  const [showChapaConfirm, setShowChapaConfirm] = useState(false);
  const [transferResult, setTransferResult] = useState<ChapaTransferResult | null>(
    null,
  );

  useEffect(() => {
    if (id) dispatch(fetchPayoutDetail(id));
  }, [dispatch, id]);

  const doctor = request?.doctor_profiles;
  const method = request?.doctor_payout_methods;
  const currency = method?.currency ?? context?.wallet?.currency ?? "ETB";
  const doctorName = doctor
    ? `Dr. ${doctor.first_name} ${doctor.last_name}`
    : "Doctor";
  const isSaving = savingId === id;
  const waitingChapa =
    request?.status === "approved" && hasChapaReference(request.admin_note);

  async function reload() {
    await dispatch(fetchPayoutDetail(id));
  }

  async function handleAction(action: "approve" | "reject" | "complete") {
    const result = await dispatch(updatePayoutRequest({ id, action }));
    if (updatePayoutRequest.fulfilled.match(result)) {
      await reload();
    }
  }

  async function handleChapaTransfer() {
    setShowChapaConfirm(false);
    const result = await dispatch(sendPayoutViaChapa({ id }));
    if (sendPayoutViaChapa.fulfilled.match(result)) {
      setTransferResult(result.payload);
      await reload();
    }
  }

  async function handleVerify() {
    const result = await dispatch(verifyPayoutViaChapa({ id }));
    if (verifyPayoutViaChapa.fulfilled.match(result)) {
      await reload();
    }
  }

  if (loading && !request) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-emerald-600" />
      </div>
    );
  }

  if (error || !request) {
    return (
      <div className="mx-auto max-w-[1200px] px-6 py-12">
        <p className="text-red-600">{error ?? "Payout request not found"}</p>
        <Link
          href="/admin/finance/payout-request"
          className="mt-4 inline-flex h-9 items-center rounded-[var(--radius)] border border-gray-200 bg-white px-4 text-sm font-medium text-gray-900 hover:bg-gray-50"
        >
          Back to payout requests
        </Link>
      </div>
    );
  }

  return (
    <>
      <PageHero
        title={doctorName}
        description={`Payout review · ${formatMoney(Number(request.amount), currency)}`}
        icon={DollarSign}
        actions={
          <Link
            href="/admin/finance/payout-request"
            className="inline-flex items-center gap-2 text-sm font-medium text-gray-600 hover:text-gray-900"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </Link>
        }
      />

      <div className="mx-auto max-w-[1200px] space-y-8 px-6 py-8 lg:px-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <span
            className={cn(
              "rounded-full px-3 py-1 text-sm font-medium capitalize",
              statusStyles[request.status],
            )}
          >
            {waitingChapa ? "Waiting Chapa" : request.status}
          </span>
          <div className="flex flex-wrap gap-2">
            {request.status === "pending" ? (
              <>
                <Button size="sm" disabled={isSaving} onClick={() => handleAction("approve")}>
                  Allow
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={isSaving}
                  className="text-red-700"
                  onClick={() => handleAction("reject")}
                >
                  Reject
                </Button>
              </>
            ) : null}
            {request.status === "approved" && !hasChapaReference(request.admin_note) ? (
              <>
                <Button
                  size="sm"
                  disabled={isSaving || !method}
                  onClick={() => setShowChapaConfirm(true)}
                >
                  Send with Chapa
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={isSaving || !method}
                  onClick={() => handleAction("complete")}
                >
                  Mark paid
                </Button>
              </>
            ) : null}
            {waitingChapa ? (
              <Button size="sm" variant="outline" disabled={isSaving} onClick={handleVerify}>
                Verify status
              </Button>
            ) : null}
            <Link
              href={`/admin/doctors/${request.doctor_id}`}
              className="inline-flex h-8 items-center rounded-[var(--radius)] border border-gray-200 bg-white px-3 text-sm font-medium text-gray-900 hover:bg-gray-50"
            >
              Doctor profile
            </Link>
          </div>
        </div>

        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            label="Available balance"
            value={formatMoney(context?.wallet?.available_balance ?? 0, currency)}
            icon={Wallet}
            accent="emerald"
          />
          <StatCard
            label="Pending payout"
            value={formatMoney(context?.wallet?.pending_balance ?? 0, currency)}
            icon={Wallet}
            accent="amber"
          />
          <StatCard
            label="Earned this week"
            value={formatMoney(context?.thisWeek.earned ?? 0, currency)}
            icon={DollarSign}
            accent="teal"
          />
          <StatCard
            label="Earned this month"
            value={formatMoney(context?.thisMonth.earned ?? 0, currency)}
            icon={DollarSign}
            accent="violet"
          />
        </section>

        <div className="grid gap-6 lg:grid-cols-2">
          <div className="admin-panel space-y-4">
            <h2 className="admin-section-title">This request</h2>
            <dl className="grid gap-3 text-sm">
              <div className="flex justify-between gap-4">
                <dt className="text-gray-500">Amount</dt>
                <dd className="font-semibold text-gray-900">
                  {formatMoney(Number(request.amount), currency)}
                </dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-gray-500">Requested</dt>
                <dd>{formatDateTime(request.created_at)}</dd>
              </div>
              {request.note ? (
                <div>
                  <dt className="text-gray-500">Doctor note</dt>
                  <dd className="mt-1 text-gray-900">{request.note}</dd>
                </div>
              ) : null}
              {method ? (
                <>
                  <div className="border-t border-gray-100 pt-3">
                    <dt className="mb-2 text-gray-500">Bank details</dt>
                    <dd className="space-y-1 text-gray-900">
                      <p>{method.holder_name}</p>
                      <p>{method.bank_name}</p>
                      <p>{method.account_number}</p>
                      {method.bank_code || method.swift_code ? (
                        <p className="text-xs text-gray-500">
                          Code: {method.bank_code || method.swift_code}
                        </p>
                      ) : null}
                    </dd>
                  </div>
                </>
              ) : (
                <p className="text-amber-700">No payout method on file</p>
              )}
            </dl>
          </div>

          <div className="admin-panel space-y-4">
            <h2 className="admin-section-title">This month</h2>
            <dl className="grid gap-3 text-sm">
              <div className="flex justify-between gap-4">
                <dt className="text-gray-500">Net earnings</dt>
                <dd className="font-medium text-emerald-700">
                  {formatMoney(context?.thisMonth.earned ?? 0, currency)}
                </dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-gray-500">Paid out</dt>
                <dd>{formatMoney(context?.thisMonth.paidOut ?? 0, currency)}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-gray-500">Open requests</dt>
                <dd>{formatMoney(context?.thisMonth.requested ?? 0, currency)}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-gray-500">Payout requests</dt>
                <dd>{context?.thisMonth.payoutCount ?? 0}</dd>
              </div>
              <div className="flex justify-between gap-4 border-t border-gray-100 pt-3">
                <dt className="text-gray-500">Platform commission</dt>
                <dd>{context?.commissionPercent ?? 10}%</dd>
              </div>
            </dl>
            <p className="text-xs text-gray-500">
              Review weekly earnings and wallet balance before releasing funds.
            </p>
          </div>
        </div>

        <section className="admin-panel">
          <h2 className="admin-section-title mb-4">Payout history</h2>
          <div className="admin-table-wrap">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(context?.payoutHistory ?? []).length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={3} className="py-8 text-center text-gray-500">
                      No payout history
                    </TableCell>
                  </TableRow>
                ) : (
                  (context?.payoutHistory ?? []).map((row) => (
                    <TableRow
                      key={row.id}
                      className={row.id === request.id ? "bg-emerald-50/50" : undefined}
                    >
                      <TableCell className="text-sm text-gray-600">
                        {formatDateTime(row.created_at)}
                      </TableCell>
                      <TableCell className="font-medium">
                        {formatMoney(Number(row.amount), currency)}
                      </TableCell>
                      <TableCell>
                        <span
                          className={cn(
                            "rounded-full px-2 py-0.5 text-xs font-medium capitalize",
                            statusStyles[row.status],
                          )}
                        >
                          {row.status}
                        </span>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </section>

        <section className="admin-panel">
          <h2 className="admin-section-title mb-4">Recent earnings</h2>
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
                {(context?.recentEarnings ?? []).length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="py-8 text-center text-gray-500">
                      No earnings recorded yet
                    </TableCell>
                  </TableRow>
                ) : (
                  (context?.recentEarnings ?? []).map((row) => (
                    <TableRow key={row.id}>
                      <TableCell className="text-sm text-gray-600">
                        {formatDateTime(row.created_at)}
                      </TableCell>
                      <TableCell className="font-medium text-emerald-700">
                        +{formatMoney(Number(row.amount), currency)}
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
                          <span className="text-gray-500">—</span>
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
                          <span className="text-gray-500">
                            {row.patient_name ?? "—"}
                          </span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </section>
      </div>

      <Modal
        open={showChapaConfirm}
        onClose={() => setShowChapaConfirm(false)}
        title="Send payout with Chapa"
      >
        <div className="space-y-4 text-sm text-gray-700">
          <p>
            Send {formatMoney(Number(request.amount), currency)} to {method?.holder_name} at{" "}
            {method?.bank_name} ({maskAccountNumber(method?.account_number)})?
          </p>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setShowChapaConfirm(false)}>
              Cancel
            </Button>
            <Button disabled={isSaving} onClick={() => void handleChapaTransfer()}>
              Confirm
            </Button>
          </div>
        </div>
      </Modal>

      <Modal
        open={transferResult !== null}
        onClose={() => setTransferResult(null)}
        title="Transfer initiated"
      >
        {transferResult ? (
          <div className="space-y-2 text-sm text-gray-700">
            <p>{transferResult.message}</p>
            <p>Reference: {transferResult.txRef}</p>
            <Button className="mt-4" onClick={() => setTransferResult(null)}>
              Close
            </Button>
          </div>
        ) : null}
      </Modal>
    </>
  );
}
