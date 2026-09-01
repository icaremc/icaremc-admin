"use client";

import Link from "next/link";
import { FormEvent, useCallback, useEffect, useState } from "react";
import { Gift, Stethoscope } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { UserReferralInfo } from "@/lib/referrals/types";
import { formatDateTime } from "@/lib/format";
import { useAdminCanManage } from "@/lib/useAdminPermissions";

interface UserReferralPanelProps {
  userId: string;
}

export default function UserReferralPanel({ userId }: UserReferralPanelProps) {
  const canManage = useAdminCanManage("manage_users");
  const [referral, setReferral] = useState<UserReferralInfo | null>(null);
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const loadReferral = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/users/${userId}/referral`);
      const payload = (await res.json()) as {
        error?: string;
        referral?: UserReferralInfo;
      };
      if (!res.ok) throw new Error(payload.error ?? "Failed to load referral info");
      setReferral(payload.referral ?? null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load referral info");
      setReferral(null);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    void loadReferral();
  }, [loadReferral]);

  async function handleApply(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canManage || !code.trim()) return;

    setSaving(true);
    setError(null);
    setMessage(null);
    try {
      const res = await fetch(`/api/admin/users/${userId}/referral`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: code.trim() }),
      });
      const payload = (await res.json()) as { error?: string; referral?: UserReferralInfo };
      if (!res.ok) throw new Error(payload.error ?? "Could not apply referral code");

      setReferral(payload.referral ?? null);
      setCode("");
      setMessage("Referral code applied.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not apply referral code");
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="admin-panel space-y-4">
      <div>
        <h2 className="admin-section-title flex items-center gap-2">
          <Gift className="h-4 w-4 text-emerald-600" />
          Referral
        </h2>
        <p className="mt-1 text-sm text-gray-500">
          Code entered at ICare MC sign-up. One doctor per patient, forever.
        </p>
      </div>

      {error ? (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      ) : null}
      {message ? (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          {message}
        </div>
      ) : null}

      {loading ? (
        <p className="text-sm text-gray-500">Loading referral info…</p>
      ) : referral?.referredByDoctorId ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div>
            <p className="text-xs font-medium uppercase text-gray-500">Code used</p>
            <p className="mt-1 font-mono text-sm font-medium text-gray-900">
              {referral.referralCodeUsed ?? "—"}
            </p>
          </div>
          <div>
            <p className="text-xs font-medium uppercase text-gray-500">Referred by</p>
            <Link
              href={`/admin/doctors/${referral.referredByDoctorId}`}
              className="mt-1 inline-flex items-center gap-1.5 text-sm font-medium text-emerald-700 hover:underline"
            >
              <Stethoscope className="h-3.5 w-3.5" />
              {referral.referredByDoctorName ?? "View doctor"}
            </Link>
          </div>
          <div>
            <p className="text-xs font-medium uppercase text-gray-500">Linked at</p>
            <p className="mt-1 text-sm text-gray-900">
              {referral.referredAt ? formatDateTime(referral.referredAt) : "—"}
            </p>
          </div>
        </div>
      ) : (
        <>
          <p className="text-sm text-gray-600">Signed up without a referral code.</p>
          {canManage && referral?.canApplyCode ? (
            <form onSubmit={(event) => void handleApply(event)} className="max-w-md space-y-3">
              <div>
                <Label htmlFor="patient_referral_code">Apply code (one time)</Label>
                <Input
                  id="patient_referral_code"
                  value={code}
                  onChange={(event) => setCode(event.target.value.toUpperCase())}
                  placeholder="MCK7P2QX"
                  className="mt-1.5 font-mono uppercase"
                  maxLength={8}
                  required
                />
              </div>
              <Button type="submit" disabled={saving || !code.trim()}>
                {saving ? "Applying…" : "Apply referral code"}
              </Button>
            </form>
          ) : null}
        </>
      )}
    </section>
  );
}
