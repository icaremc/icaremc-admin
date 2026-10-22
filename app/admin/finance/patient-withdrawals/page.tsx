"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Clock,
  DollarSign,
  Loader2,
  RefreshCw,
  Wallet,
} from "lucide-react";
import PageHero from "@/components/PageHero";
import StatCard from "@/components/StatCard";
import { ConfirmActionModal } from "@/components/ConfirmActionModal";
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
import {
  fetchPatientWithdrawals,
  updatePatientWithdrawal,
} from "@/features/finance/patientWithdrawalSlice";
import { formatMoney } from "@/lib/appointments/display";
import { formatDateTime } from "@/lib/format";
import { cn } from "@/lib/utils";
import { patientWithdrawalConfirmCopy } from "@/lib/admin/confirmMessages";
import type {
  PatientWithdrawalRequest,
  PatientWithdrawalStatus,
} from "@/lib/types/finance";

const statusStyles: Record<PatientWithdrawalStatus, string> = {
  pending: "bg-amber-100 text-amber-800",
  approved: "bg-emerald-100 text-emerald-800",
  rejected: "bg-red-100 text-red-700",
  completed: "bg-gray-100 text-gray-700",
};

function maskAccountNumber(accountNumber?: string | null): string {
  const normalized = (accountNumber ?? "").trim();
  if (!normalized) return "N/A";
  if (normalized.length <= 4) return normalized;
  return `${"*".repeat(Math.max(normalized.length - 4, 2))}${normalized.slice(-4)}`;
}

function accountHint(request: PatientWithdrawalRequest): string | undefined {
  const method = request.payout_method;
  if (!method?.account_number) return undefined;
  const bank = method.bank_name?.trim() || "Bank";
  return `${bank} · ${maskAccountNumber(method.account_number)}`;
}

export default function PatientWithdrawalsPage() {
  const dispatch = useAppDispatch();
  const { requests, loading, savingId, error } = useAppSelector(
    (state) => state.patientWithdrawals,
  );

  const [pendingAction, setPendingAction] = useState<{
    request: PatientWithdrawalRequest;
    action: "approve" | "reject";
  } | null>(null);

  useEffect(() => {
    void dispatch(fetchPatientWithdrawals());
  }, [dispatch]);

  const stats = useMemo(() => {
    const pending = requests.filter((r) => r.status === "pending");
    return {
      pendingCount: pending.length,
      pendingAmount: pending.reduce((sum, r) => sum + Number(r.amount), 0),
      completedCount: requests.filter((r) => r.status === "completed").length,
      totalCount: requests.length,
    };
  }, [requests]);

  async function confirmPendingAction() {
    if (!pendingAction) return;
    const { request, action } = pendingAction;
    const result = await dispatch(
      updatePatientWithdrawal({ id: request.id, action }),
    );
    if (updatePatientWithdrawal.fulfilled.match(result)) {
      void dispatch(fetchPatientWithdrawals());
    }
    setPendingAction(null);
  }

  const confirmCopy = pendingAction
    ? patientWithdrawalConfirmCopy({
        action: pendingAction.action,
        amount: Number(pendingAction.request.amount),
        currency: pendingAction.request.payout_method?.currency ?? "ETB",
        patientName:
          pendingAction.request.patient?.full_name?.trim() || "Mother",
        accountHint: accountHint(pendingAction.request),
      })
    : null;

  return (
    <>
      <PageHero
        title="Patient withdrawals"
        description="Review mother (MC) wallet withdrawals and send funds via Chapa on approval"
        icon={Wallet}
        stat={{ label: "Pending", value: stats.pendingCount }}
        actions={
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={loading}
              onClick={() => void dispatch(fetchPatientWithdrawals())}
            >
              <RefreshCw
                className={cn("mr-2 h-4 w-4", loading && "animate-spin")}
              />
              Refresh
            </Button>
            <Link
              href="/admin/finance/payout-request"
              className="inline-flex h-8 items-center rounded-[var(--radius)] border border-gray-200 bg-white px-3 text-sm font-medium text-gray-900 hover:bg-gray-50"
            >
              Doctor payouts
            </Link>
          </div>
        }
      />

      <div className="admin-page space-y-6">
        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          <StatCard
            label="Pending requests"
            value={String(stats.pendingCount)}
            icon={Clock}
            accent="amber"
          />
          <StatCard
            label="Pending amount"
            value={formatMoney(stats.pendingAmount, "ETB")}
            icon={DollarSign}
            accent="emerald"
          />
          <StatCard
            label="Completed"
            value={String(stats.completedCount)}
            icon={Wallet}
            accent="teal"
          />
        </section>

        {error ? (
          <p className="rounded-[var(--radius)] border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </p>
        ) : null}

        <div className="admin-panel">
          <div className="admin-table-wrap">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Mother</TableHead>
                  <TableHead>Note</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Account</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Requested</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading && requests.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="py-10 text-center">
                      <Loader2 className="mx-auto h-5 w-5 animate-spin text-emerald-600" />
                    </TableCell>
                  </TableRow>
                ) : requests.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={7}
                      className="py-10 text-center text-gray-500"
                    >
                      No patient withdrawal requests found.
                    </TableCell>
                  </TableRow>
                ) : (
                  requests.map((request) => {
                    const method = request.payout_method;
                    const name =
                      request.patient?.full_name?.trim() || "Mother";
                    const isSaving = savingId === request.id;
                    const currency = method?.currency ?? "ETB";

                    return (
                      <TableRow key={request.id}>
                        <TableCell>
                          <Link
                            href={`/admin/users/${request.patient_id}`}
                            className="font-medium text-emerald-700 hover:underline"
                          >
                            {name}
                          </Link>
                          {request.patient?.phone ? (
                            <p className="text-xs text-gray-500">
                              {request.patient.phone}
                            </p>
                          ) : null}
                        </TableCell>
                        <TableCell className="max-w-[180px] text-sm text-gray-600">
                          {request.note?.trim() || "N/A"}
                        </TableCell>
                        <TableCell>
                          <span
                            className={cn(
                              "rounded-full px-2.5 py-0.5 text-xs font-medium capitalize",
                              statusStyles[request.status],
                            )}
                          >
                            {request.status}
                          </span>
                        </TableCell>
                        <TableCell className="text-sm text-gray-700">
                          {method ? (
                            <div>
                              <p className="font-medium">{method.holder_name}</p>
                              <p>{method.bank_name}</p>
                              <p className="text-xs text-gray-500">
                                {maskAccountNumber(method.account_number)}
                              </p>
                            </div>
                          ) : (
                            <span className="text-amber-700">
                              No payout method
                            </span>
                          )}
                        </TableCell>
                        <TableCell className="font-semibold">
                          <Link
                            href={`/admin/finance/patient-withdrawals/${request.id}`}
                            className="text-emerald-700 hover:underline"
                          >
                            {formatMoney(Number(request.amount), currency)}
                          </Link>
                        </TableCell>
                        <TableCell className="text-sm text-gray-600">
                          {formatDateTime(request.created_at)}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex flex-wrap justify-end gap-2">
                            <Link
                              href={`/admin/finance/patient-withdrawals/${request.id}`}
                              className="inline-flex h-8 items-center rounded-[var(--radius)] border border-gray-200 bg-white px-3 text-sm font-medium text-gray-900 hover:bg-gray-50"
                            >
                              Review
                            </Link>
                            {request.status === "pending" ? (
                              <>
                                <Button
                                  size="sm"
                                  disabled={isSaving || !method?.account_number}
                                  onClick={() =>
                                    setPendingAction({
                                      request,
                                      action: "approve",
                                    })
                                  }
                                >
                                  Approve & send
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  disabled={isSaving}
                                  className="text-red-700"
                                  onClick={() =>
                                    setPendingAction({
                                      request,
                                      action: "reject",
                                    })
                                  }
                                >
                                  Reject
                                </Button>
                              </>
                            ) : null}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      </div>

      <ConfirmActionModal
        open={pendingAction !== null && confirmCopy !== null}
        onClose={() => setPendingAction(null)}
        onConfirm={() => void confirmPendingAction()}
        title={confirmCopy?.title ?? ""}
        description={confirmCopy?.description ?? ""}
        confirmLabel={confirmCopy?.confirmLabel}
        variant={confirmCopy?.variant}
        loading={savingId === pendingAction?.request.id}
      />
    </>
  );
}
