"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, Loader2, Wallet } from "lucide-react";
import PageHero from "@/components/PageHero";
import StatCard from "@/components/StatCard";
import { ConfirmActionModal } from "@/components/ConfirmActionModal";
import { Button } from "@/components/ui/button";
import { useAppDispatch, useAppSelector } from "@/app/store/hooks";
import {
  fetchPatientWithdrawalDetail,
  updatePatientWithdrawal,
} from "@/features/finance/patientWithdrawalSlice";
import { formatMoney } from "@/lib/appointments/display";
import { formatDateTime } from "@/lib/format";
import { cn } from "@/lib/utils";
import { patientWithdrawalConfirmCopy } from "@/lib/admin/confirmMessages";
import type { PatientWithdrawalStatus } from "@/lib/types/finance";

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

export default function PatientWithdrawalDetailPage() {
  const params = useParams();
  const dispatch = useAppDispatch();
  const rawId = params?.id;
  const id = Array.isArray(rawId) ? rawId[0] : rawId;

  const { detail: request, wallet, detailLoading, savingId, error } =
    useAppSelector((state) => state.patientWithdrawals);

  const [pendingAction, setPendingAction] = useState<"approve" | "reject" | null>(
    null,
  );

  useEffect(() => {
    if (!id) return;
    void dispatch(fetchPatientWithdrawalDetail(id));
  }, [dispatch, id]);

  const method = request?.payout_method;
  const currency = method?.currency ?? wallet?.currency ?? "ETB";
  const patientName = request?.patient?.full_name?.trim() || "Mother";
  const isSaving = savingId === id;

  async function confirmPendingAction() {
    if (!id || !pendingAction) return;
    const result = await dispatch(
      updatePatientWithdrawal({ id, action: pendingAction }),
    );
    if (updatePatientWithdrawal.fulfilled.match(result)) {
      await dispatch(fetchPatientWithdrawalDetail(id));
    }
    setPendingAction(null);
  }

  const confirmCopy =
    pendingAction && request
      ? patientWithdrawalConfirmCopy({
          action: pendingAction,
          amount: Number(request.amount),
          currency,
          patientName,
          accountHint: method?.account_number
            ? `${method.bank_name} · ${maskAccountNumber(method.account_number)}`
            : undefined,
        })
      : null;

  const showLoading = Boolean(id) && (detailLoading || (!request && !error));

  if (showLoading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-emerald-600" />
      </div>
    );
  }

  if (error || !request) {
    return (
      <div className="mx-auto max-w-[1200px] px-6 py-12">
        <p className="text-red-600">{error ?? "Withdrawal request not found"}</p>
        <Link
          href="/admin/finance/patient-withdrawals"
          className="mt-4 inline-flex h-9 items-center rounded-[var(--radius)] border border-gray-200 bg-white px-4 text-sm font-medium text-gray-900 hover:bg-gray-50"
        >
          Back to patient withdrawals
        </Link>
      </div>
    );
  }

  return (
    <>
      <PageHero
        title={patientName}
        description={`Withdrawal review · ${formatMoney(Number(request.amount), currency)}`}
        icon={Wallet}
        actions={
          <Link
            href="/admin/finance/patient-withdrawals"
            className="inline-flex items-center gap-2 text-sm font-medium text-gray-600 hover:text-gray-900"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </Link>
        }
      />

      <div className="admin-page space-y-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <span
            className={cn(
              "rounded-full px-3 py-1 text-sm font-medium capitalize",
              statusStyles[request.status],
            )}
          >
            {request.status}
          </span>
          <div className="flex flex-wrap gap-2">
            {request.status === "pending" ? (
              <>
                <Button
                  size="sm"
                  disabled={isSaving || !method?.account_number}
                  onClick={() => setPendingAction("approve")}
                >
                  Approve & send
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={isSaving}
                  className="text-red-700"
                  onClick={() => setPendingAction("reject")}
                >
                  Reject
                </Button>
              </>
            ) : null}
            <Link
              href={`/admin/users/${request.patient_id}`}
              className="inline-flex h-8 items-center rounded-[var(--radius)] border border-gray-200 bg-white px-3 text-sm font-medium text-gray-900 hover:bg-gray-50"
            >
              Mother profile
            </Link>
          </div>
        </div>

        <section className="grid gap-4 sm:grid-cols-2">
          <StatCard
            label="Wallet balance"
            value={formatMoney(wallet?.balance ?? 0, currency)}
            icon={Wallet}
            accent="emerald"
          />
          <StatCard
            label="Requested amount"
            value={formatMoney(Number(request.amount), currency)}
            icon={Wallet}
            accent="amber"
          />
        </section>

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
                <dt className="text-gray-500">Note</dt>
                <dd className="mt-1 text-gray-900">{request.note}</dd>
              </div>
            ) : null}
            {request.admin_note ? (
              <div>
                <dt className="text-gray-500">Admin note</dt>
                <dd className="mt-1 text-gray-900">{request.admin_note}</dd>
              </div>
            ) : null}
            {request.chapa_transfer_reference ? (
              <div className="flex justify-between gap-4">
                <dt className="text-gray-500">Chapa reference</dt>
                <dd className="font-mono text-xs">
                  {request.chapa_transfer_reference}
                </dd>
              </div>
            ) : null}
            {method ? (
              <div className="border-t border-gray-100 pt-3">
                <dt className="mb-2 text-gray-500">Bank details</dt>
                <dd className="space-y-1 text-gray-900">
                  <p>{method.holder_name}</p>
                  <p>{method.bank_name}</p>
                  <p>{method.account_number}</p>
                  {method.bank_code ? (
                    <p className="text-xs text-gray-500">
                      Code: {method.bank_code}
                    </p>
                  ) : null}
                </dd>
              </div>
            ) : (
              <p className="text-amber-700">No payout method on file</p>
            )}
          </dl>
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
        loading={isSaving}
      />
    </>
  );
}
