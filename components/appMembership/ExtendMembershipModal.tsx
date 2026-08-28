"use client";

import { useEffect, useMemo, useState } from "react";
import { Loader2, Upload } from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { AppSubscriptionMember } from "@/lib/appMembership/members";
import type { AppMembershipSettingsData } from "@/lib/appMembership/subscriptionSettings";
import { formatMoney } from "@/lib/appointments/display";
import { formatDate } from "@/lib/format";

interface ExtendMembershipModalProps {
  member: AppSubscriptionMember | null;
  settings: AppMembershipSettingsData | null;
  open: boolean;
  loading: boolean;
  onClose: () => void;
  onConfirm: (input: {
    amountPaid: number;
    receipt: File;
  }) => void | Promise<void>;
}

function daysUntil(endsAt: string): number {
  return Math.ceil((new Date(endsAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
}

export function ExtendMembershipModal({
  member,
  settings,
  open,
  loading,
  onClose,
  onConfirm,
}: ExtendMembershipModalProps) {
  const [amountPaid, setAmountPaid] = useState("");
  const [receipt, setReceipt] = useState<File | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);

  const durationDays = settings?.durationDays ?? 365;
  const currency = settings?.currency ?? member?.currency ?? "ETB";

  const summary = useMemo(() => {
    if (!member) return null;
    const stacks =
      member.has_access && new Date(member.ends_at).getTime() > Date.now();
    return {
      stacks,
      periodStart: stacks ? formatDate(member.ends_at) : "Today",
      remaining: member.has_access ? daysUntil(member.ends_at) : null,
    };
  }, [member]);

  useEffect(() => {
    if (!open) return;
    setAmountPaid(String(settings?.yearlyPrice ?? member?.amount_paid ?? 0));
    setReceipt(null);
    setValidationError(null);
  }, [member, open, settings?.yearlyPrice]);

  function handleSubmit() {
    if (!member) return;
    if (!receipt) {
      setValidationError("Upload a payment receipt before confirming.");
      return;
    }
    const parsedAmount = Number.parseFloat(amountPaid);
    if (!Number.isFinite(parsedAmount) || parsedAmount < 0) {
      setValidationError("Enter a valid amount (0 or more).");
      return;
    }
    setValidationError(null);
    void onConfirm({ amountPaid: parsedAmount, receipt });
  }

  return (
    <Modal
      open={open}
      onClose={loading ? () => undefined : onClose}
      title="Extend membership"
      className="max-w-md"
    >
      {member ? (
        <div className="space-y-4">
          <div className="rounded-lg border border-gray-200 bg-gray-50 p-3 text-sm text-gray-700">
            <p className="font-medium text-gray-900">
              {member.patient_name ?? "Unknown parent"}
            </p>
            <p className="text-gray-500">{member.patient_phone ?? member.patient_id}</p>
            {summary ? (
              <ul className="mt-3 space-y-1 text-sm">
                <li>
                  <span className="text-gray-500">Adds</span>{" "}
                  <span className="font-medium">{durationDays} days</span>
                </li>
                <li>
                  <span className="text-gray-500">New period starts</span>{" "}
                  <span className="font-medium">{summary.periodStart}</span>
                  {summary.stacks && summary.remaining !== null ? (
                    <span className="text-gray-500">
                      {" "}
                      (stacks after current access, {summary.remaining}d left)
                    </span>
                  ) : null}
                </li>
              </ul>
            ) : null}
          </div>

          <div>
            <Label htmlFor="extend_amount">Amount recorded</Label>
            <Input
              id="extend_amount"
              type="number"
              min={0}
              step="0.01"
              value={amountPaid}
              onChange={(event) => setAmountPaid(event.target.value)}
              disabled={loading}
              className="mt-1.5"
            />
            <p className="mt-1 text-xs text-gray-500">
              Defaults to yearly price ({formatMoney(settings?.yearlyPrice ?? 0, currency)}).
              Set to 0 for complimentary extensions.
            </p>
          </div>

          <div>
            <Label htmlFor="extend_receipt">Payment receipt</Label>
            <div className="mt-1.5">
              <label
                htmlFor="extend_receipt"
                className="flex cursor-pointer flex-col items-center justify-center rounded-lg border border-dashed border-gray-300 bg-white px-4 py-6 text-center transition-colors hover:border-emerald-400 hover:bg-emerald-50/40"
              >
                <Upload className="mb-2 h-6 w-6 text-gray-400" />
                <span className="text-sm font-medium text-gray-700">
                  {receipt ? receipt.name : "Upload JPG, PNG, WebP, or PDF"}
                </span>
                <span className="mt-1 text-xs text-gray-500">Required before extending</span>
                <input
                  id="extend_receipt"
                  type="file"
                  accept="image/jpeg,image/png,image/webp,application/pdf"
                  className="sr-only"
                  disabled={loading}
                  onChange={(event) => {
                    const file = event.target.files?.[0] ?? null;
                    setReceipt(file);
                    setValidationError(null);
                  }}
                />
              </label>
            </div>
          </div>

          {validationError ? (
            <p className="text-sm text-red-600">{validationError}</p>
          ) : null}

          <div className="flex justify-end gap-2 pt-1">
            <Button variant="outline" onClick={onClose} disabled={loading}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={loading}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Confirm extend"}
            </Button>
          </div>
        </div>
      ) : null}
    </Modal>
  );
}
