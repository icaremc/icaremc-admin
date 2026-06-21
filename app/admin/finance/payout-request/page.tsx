"use client";

import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  CheckCircle2,
  Clock,
  DollarSign,
  Loader2,
  RefreshCw,
  TrendingUp,
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
import {
  fetchPayoutRequests,
  sendPayoutViaChapa,
  updatePayoutRequest,
  verifyPayoutViaChapa,
  type ChapaTransferResult,
} from "@/features/finance/payoutSlice";
import { formatMoney } from "@/lib/appointments/display";
import { formatDateTime } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { DoctorPayoutRequest, PayoutRequestStatus } from "@/lib/types/finance";

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

function isToday(value?: string | null): boolean {
  if (!value) return false;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return false;
  const today = new Date();
  return (
    date.getFullYear() === today.getFullYear() &&
    date.getMonth() === today.getMonth() &&
    date.getDate() === today.getDate()
  );
}

function PayoutRequestContent() {
  const dispatch = useAppDispatch();
  const searchParams = useSearchParams();
  const { requests, loading, savingId, error } = useAppSelector((state) => state.payout);

  const [confirmingRequest, setConfirmingRequest] =
    useState<DoctorPayoutRequest | null>(null);
  const [modalValidationError, setModalValidationError] = useState<string | null>(null);
  const [transferResult, setTransferResult] = useState<ChapaTransferResult | null>(null);

  const autoVerifyInFlightRef = useRef<Set<string>>(new Set());
  const autoVerifyLastAttemptRef = useRef<Record<string, number>>({});

  const segment = (searchParams.get("segment") ?? "").trim().toLowerCase();

  useEffect(() => {
    dispatch(fetchPayoutRequests());
  }, [dispatch]);

  const filteredRequests = useMemo(() => {
    return requests.filter((request) => {
      const status = request.status;
      const note = request.admin_note ?? "";
      const method = request.doctor_payout_methods;

      if (segment === "waiting_confirmation") {
        return status === "approved" && hasChapaReference(note);
      }
      if (segment === "failed_rejected") {
        return status === "rejected";
      }
      if (segment === "missing_payment_method") {
        return ["pending", "approved"].includes(status) && !method;
      }
      if (segment === "completed_today") {
        return status === "completed" && isToday(request.payment_date);
      }
      return true;
    });
  }, [requests, segment]);

  const stats = useMemo(() => {
    const pending = filteredRequests.filter((r) => r.status === "pending");
    const pendingAmount = pending.reduce((sum, r) => sum + Number(r.amount), 0);
    const approvedCount = filteredRequests.filter(
      (r) => r.status === "approved" || r.status === "completed",
    ).length;

    return {
      pendingCount: pending.length,
      pendingAmount,
      approvedCount,
      totalCount: filteredRequests.length,
    };
  }, [filteredRequests]);

  const autoVerifyCandidateIds = useMemo(
    () =>
      requests
        .filter(
          (request) =>
            request.status === "approved" && hasChapaReference(request.admin_note),
        )
        .map((request) => request.id),
    [requests],
  );

  useEffect(() => {
    const intervalMs = 15000;
    const perIdCooldownMs = 45000;
    const maxPerTick = 3;

    async function runAutoVerify() {
      const now = Date.now();
      const candidates = autoVerifyCandidateIds
        .filter((id) => !autoVerifyInFlightRef.current.has(id))
        .filter((id) => now - (autoVerifyLastAttemptRef.current[id] ?? 0) >= perIdCooldownMs)
        .slice(0, maxPerTick);

      await Promise.all(
        candidates.map(async (id) => {
          autoVerifyInFlightRef.current.add(id);
          autoVerifyLastAttemptRef.current[id] = Date.now();
          try {
            const result = await dispatch(verifyPayoutViaChapa({ id }));
            if (verifyPayoutViaChapa.fulfilled.match(result)) {
              dispatch(fetchPayoutRequests());
            }
          } finally {
            autoVerifyInFlightRef.current.delete(id);
          }
        }),
      );
    }

    void runAutoVerify();
    const timerId = window.setInterval(() => void runAutoVerify(), intervalMs);
    return () => window.clearInterval(timerId);
  }, [autoVerifyCandidateIds, dispatch]);

  async function handleAction(
    id: string,
    action: "approve" | "reject" | "complete",
  ) {
    const result = await dispatch(updatePayoutRequest({ id, action }));
    if (updatePayoutRequest.fulfilled.match(result)) {
      dispatch(fetchPayoutRequests());
    }
  }

  async function handleVerify(id: string) {
    const result = await dispatch(verifyPayoutViaChapa({ id }));
    if (verifyPayoutViaChapa.fulfilled.match(result)) {
      dispatch(fetchPayoutRequests());
    }
  }

  function openChapaConfirm(request: DoctorPayoutRequest) {
    setModalValidationError(null);
    setConfirmingRequest(request);
  }

  async function handleConfirmChapa() {
    if (!confirmingRequest) return;
    const method = confirmingRequest.doctor_payout_methods;
    const bankCode = (method?.bank_code ?? method?.swift_code ?? "").trim();
    const missingFields = [
      !method?.holder_name?.trim() ? "Account holder" : "",
      !method?.account_number?.trim() ? "Account number" : "",
      !method?.bank_name?.trim() ? "Bank name" : "",
      !bankCode ? "Bank code (or SWIFT)" : "",
    ].filter(Boolean);

    if (missingFields.length > 0) {
      setModalValidationError(`Missing required fields: ${missingFields.join(", ")}`);
      return;
    }

    const request = confirmingRequest;
    setConfirmingRequest(null);
    setModalValidationError(null);

    const result = await dispatch(sendPayoutViaChapa({ id: request.id }));
    if (sendPayoutViaChapa.fulfilled.match(result)) {
      setTransferResult(result.payload);
      dispatch(fetchPayoutRequests());
    }
  }

  const segmentLabel =
    segment === "waiting_confirmation"
      ? "Waiting confirmation"
      : segment === "failed_rejected"
        ? "Failed / rejected"
        : segment === "missing_payment_method"
          ? "Missing payment method"
          : segment === "completed_today"
            ? "Completed today"
            : "";

  const exportHref = segment
    ? `/api/admin/payout-requests/export-audit?segment=${encodeURIComponent(segment)}`
    : "/api/admin/payout-requests/export-audit";

  return (
    <>
      <PageHero
        title="Payout requests"
        description="Review doctor withdrawals, approve requests, and send payouts via Chapa"
        icon={DollarSign}
        stat={{ label: "Pending", value: stats.pendingCount }}
        actions={
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={loading}
              onClick={() => dispatch(fetchPayoutRequests())}
            >
              <RefreshCw className={cn("mr-2 h-4 w-4", loading && "animate-spin")} />
              Refresh
            </Button>
            <a
              href={exportHref}
              className="inline-flex h-8 items-center justify-center rounded-[var(--radius)] border border-gray-200 bg-white px-3 text-sm font-medium text-gray-900 hover:bg-gray-50"
            >
              Export audit CSV
            </a>
          </div>
        }
      />

      <div className="mx-auto max-w-[1200px] px-6 py-8 lg:px-8">
        {segmentLabel ? (
          <div className="mb-4 flex items-center justify-between rounded-xl border border-violet-200 bg-violet-50 px-4 py-3">
            <p className="text-sm font-semibold text-violet-800">
              Active segment: {segmentLabel}
            </p>
            <Link
              href="/admin/finance/payout-request"
              className="text-sm font-semibold text-violet-700 hover:text-violet-900"
            >
              Clear filter
            </Link>
          </div>
        ) : null}

        <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            label="Pending requests"
            value={stats.pendingCount}
            icon={Clock}
            loading={loading}
            accent="amber"
          />
          <StatCard
            label="Pending amount"
            value={formatMoney(stats.pendingAmount, "ETB")}
            icon={DollarSign}
            loading={loading}
            accent="violet"
          />
          <StatCard
            label="Approved / paid"
            value={stats.approvedCount}
            icon={CheckCircle2}
            loading={loading}
            accent="emerald"
          />
          <StatCard
            label="Total requests"
            value={stats.totalCount}
            icon={TrendingUp}
            loading={loading}
            accent="teal"
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
                <TableHead>Doctor</TableHead>
                <TableHead>Note</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Bank details</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Requested</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={7} className="py-10 text-center text-gray-500">
                    <Loader2 className="mx-auto h-5 w-5 animate-spin" />
                  </TableCell>
                </TableRow>
              ) : filteredRequests.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="py-10 text-center text-gray-500">
                    No payout requests found.
                  </TableCell>
                </TableRow>
              ) : (
                filteredRequests.map((request) => {
                  const doctor = request.doctor_profiles;
                  const method = request.doctor_payout_methods;
                  const doctorName = doctor
                    ? `Dr. ${doctor.first_name} ${doctor.last_name}`
                    : "Doctor";
                  const isSaving = savingId === request.id;
                  const waitingChapa =
                    request.status === "approved" && hasChapaReference(request.admin_note);

                  return (
                    <TableRow key={request.id}>
                      <TableCell>
                        <Link
                          href={`/admin/doctors/${request.doctor_id}`}
                          className="font-medium text-emerald-700 hover:underline"
                        >
                          {doctorName}
                        </Link>
                        {doctor?.phone ? (
                          <p className="text-xs text-gray-500">{doctor.phone}</p>
                        ) : null}
                      </TableCell>
                      <TableCell className="max-w-[180px] text-sm text-gray-600">
                        {request.note?.trim() || "—"}
                      </TableCell>
                      <TableCell>
                        <span
                          className={cn(
                            "rounded-full px-2.5 py-0.5 text-xs font-medium capitalize",
                            statusStyles[request.status],
                          )}
                        >
                          {waitingChapa ? "Waiting Chapa" : request.status}
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
                          <span className="text-amber-700">No payout method</span>
                        )}
                      </TableCell>
                      <TableCell className="font-semibold">
                        <Link
                          href={`/admin/finance/payout-request/${request.id}`}
                          className="text-emerald-700 hover:underline"
                        >
                          {formatMoney(Number(request.amount), method?.currency ?? "ETB")}
                        </Link>
                      </TableCell>
                      <TableCell className="text-sm text-gray-600">
                        {formatDateTime(request.created_at)}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex flex-wrap justify-end gap-2">
                          <Link
                            href={`/admin/finance/payout-request/${request.id}`}
                            className="inline-flex h-8 items-center rounded-[var(--radius)] border border-gray-200 bg-white px-3 text-sm font-medium text-gray-900 hover:bg-gray-50"
                          >
                            Review
                          </Link>
                          {request.status === "pending" ? (
                            <>
                              <Button
                                size="sm"
                                disabled={isSaving}
                                onClick={() => handleAction(request.id, "approve")}
                              >
                                Allow
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                disabled={isSaving}
                                className="text-red-700"
                                onClick={() => handleAction(request.id, "reject")}
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
                                onClick={() => openChapaConfirm(request)}
                              >
                                Send with Chapa
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                disabled={isSaving || !method}
                                onClick={() => handleAction(request.id, "complete")}
                              >
                                Mark paid
                              </Button>
                            </>
                          ) : null}

                          {waitingChapa ? (
                            <>
                              <Button
                                size="sm"
                                variant="outline"
                                disabled={isSaving}
                                onClick={() => handleVerify(request.id)}
                              >
                                Verify status
                              </Button>
                              <span className="self-center text-xs text-gray-500">
                                Waiting confirmation
                              </span>
                            </>
                          ) : null}

                          {request.status === "completed" || request.status === "rejected" ? (
                            <span className="self-center text-xs text-gray-500">Processed</span>
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

      <Modal
        open={confirmingRequest !== null}
        onClose={() => {
          setConfirmingRequest(null);
          setModalValidationError(null);
        }}
        title="Send payout with Chapa"
      >
        {confirmingRequest ? (
          <div className="space-y-4">
            <p className="text-sm text-gray-600">
              Confirm bank transfer to{" "}
              <span className="font-medium text-gray-900">
                {confirmingRequest.doctor_profiles
                  ? `Dr. ${confirmingRequest.doctor_profiles.first_name} ${confirmingRequest.doctor_profiles.last_name}`
                  : "doctor"}
              </span>{" "}
              for{" "}
              <span className="font-medium text-gray-900">
                {formatMoney(
                  Number(confirmingRequest.amount),
                  confirmingRequest.doctor_payout_methods?.currency ?? "ETB",
                )}
              </span>
              .
            </p>
            {confirmingRequest.doctor_payout_methods ? (
              <div className="rounded-lg border border-gray-200 bg-gray-50 p-3 text-sm">
                <p>{confirmingRequest.doctor_payout_methods.holder_name}</p>
                <p>{confirmingRequest.doctor_payout_methods.bank_name}</p>
                <p>{confirmingRequest.doctor_payout_methods.account_number}</p>
                <p className="text-xs text-gray-500">
                  Bank code:{" "}
                  {confirmingRequest.doctor_payout_methods.bank_code ||
                    confirmingRequest.doctor_payout_methods.swift_code ||
                    "—"}
                </p>
              </div>
            ) : null}
            {modalValidationError ? (
              <p className="text-sm text-red-600">{modalValidationError}</p>
            ) : null}
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setConfirmingRequest(null);
                  setModalValidationError(null);
                }}
              >
                Cancel
              </Button>
              <Button onClick={() => void handleConfirmChapa()} disabled={savingId !== null}>
                Confirm transfer
              </Button>
            </div>
          </div>
        ) : null}
      </Modal>

      <Modal open={transferResult !== null} onClose={() => setTransferResult(null)} title="Transfer initiated">
        {transferResult ? (
          <div className="space-y-3 text-sm text-gray-700">
            <p>{transferResult.message}</p>
            <p>
              <span className="font-medium">Reference:</span> {transferResult.txRef}
            </p>
            {transferResult.transferId ? (
              <p>
                <span className="font-medium">Transfer ID:</span> {transferResult.transferId}
              </p>
            ) : null}
            <p>
              <span className="font-medium">Destination:</span> {transferResult.holderName} ·{" "}
              {transferResult.bankName} · {maskAccountNumber(transferResult.accountNumber)}
            </p>
            <p>
              <span className="font-medium">Amount:</span>{" "}
              {formatMoney(Number(transferResult.amount), "ETB")}
            </p>
            <div className="flex justify-end pt-2">
              <Button onClick={() => setTransferResult(null)}>Close</Button>
            </div>
          </div>
        ) : null}
      </Modal>
    </>
  );
}

export default function PayoutRequestPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[40vh] items-center justify-center text-sm text-gray-500">
          Loading payout requests…
        </div>
      }
    >
      <PayoutRequestContent />
    </Suspense>
  );
}
