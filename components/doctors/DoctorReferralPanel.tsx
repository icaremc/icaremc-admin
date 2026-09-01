"use client";

import { useCallback, useEffect, useState } from "react";
import { Copy, Gift, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatMoney } from "@/lib/appointments/display";
import type { DoctorReferralStats } from "@/lib/referrals/types";

interface DoctorReferralPanelProps {
  doctorId: string;
}

export default function DoctorReferralPanel({ doctorId }: DoctorReferralPanelProps) {
  const [stats, setStats] = useState<DoctorReferralStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const loadStats = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/doctors/${doctorId}/referral-stats`);
      const payload = (await res.json()) as {
        error?: string;
        stats?: DoctorReferralStats;
      };
      if (!res.ok) throw new Error(payload.error ?? "Failed to load referral stats");
      setStats(payload.stats ?? null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load referral stats");
      setStats(null);
    } finally {
      setLoading(false);
    }
  }, [doctorId]);

  useEffect(() => {
    void loadStats();
  }, [loadStats]);

  async function copyCode() {
    if (!stats?.referralCode) return;
    await navigator.clipboard.writeText(stats.referralCode);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="admin-panel space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="admin-section-title flex items-center gap-2">
            <Gift className="h-4 w-4 text-emerald-600" />
            Referral program
          </h2>
          <p className="mt-1 text-sm text-gray-500">
            Code is generated in the doctor app. Admin can view stats only.
          </p>
        </div>
      </div>

      {error ? (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      {loading ? (
        <p className="text-sm text-gray-500">Loading referral stats…</p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="rounded-lg border border-gray-100 bg-gray-50/80 p-4">
            <p className="text-xs font-medium uppercase text-gray-500">Referral code</p>
            <div className="mt-2 flex items-center gap-2">
              <p className="font-mono text-lg font-semibold tracking-wide text-gray-900">
                {stats?.referralCode ?? "—"}
              </p>
              {stats?.referralCode ? (
                <Button type="button" size="sm" variant="outline" onClick={() => void copyCode()}>
                  <Copy className="mr-1.5 h-3.5 w-3.5" />
                  {copied ? "Copied" : "Copy"}
                </Button>
              ) : null}
            </div>
          </div>
          <div className="rounded-lg border border-gray-100 bg-gray-50/80 p-4">
            <p className="text-xs font-medium uppercase text-gray-500">Referred patients</p>
            <p className="mt-2 flex items-center gap-2 text-2xl font-semibold text-gray-900">
              <Users className="h-5 w-5 text-emerald-600" />
              {stats?.referredCount ?? 0}
            </p>
          </div>
          <div className="rounded-lg border border-gray-100 bg-gray-50/80 p-4">
            <p className="text-xs font-medium uppercase text-gray-500">Total commission earned</p>
            <p className="mt-2 text-2xl font-semibold text-gray-900">
              {formatMoney(stats?.totalCommission ?? 0, stats?.currency ?? "ETB", 2)}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
