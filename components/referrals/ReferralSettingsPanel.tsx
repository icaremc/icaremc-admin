"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { RefreshCw, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { ReferralSettingsData } from "@/lib/referrals/settings";
import { DEFAULT_REFERRAL_SETTINGS } from "@/lib/referrals/settings";
import { formatDateTime } from "@/lib/format";
import { useAdminCanManage } from "@/lib/useAdminPermissions";

type LoadResponse = {
  referralSettings?: ReferralSettingsData;
  updatedAt?: string | null;
  error?: string;
};

export default function ReferralSettingsPanel() {
  const canManage = useAdminCanManage("manage_finance");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState<ReferralSettingsData>({
    ...DEFAULT_REFERRAL_SETTINGS,
  });
  const [updatedAt, setUpdatedAt] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/admin/referral-settings");
      const data = (await response.json()) as LoadResponse;
      if (!response.ok) {
        throw new Error(data.error ?? "Could not load referral settings");
      }
      setSettings(data.referralSettings ?? { ...DEFAULT_REFERRAL_SETTINGS });
      setUpdatedAt(data.updatedAt ?? null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Load failed");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function handleSave() {
    if (!canManage) return;

    setSaving(true);
    setMessage(null);
    setError(null);
    try {
      const response = await fetch("/api/admin/referral-settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ referralSettings: settings }),
      });
      const data = (await response.json()) as LoadResponse;
      if (!response.ok) {
        throw new Error(data.error ?? "Could not save referral settings");
      }
      setSettings(data.referralSettings ?? settings);
      setUpdatedAt(data.updatedAt ?? null);
      setMessage("Referral settings saved.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  const preview = useMemo(() => {
    const sample = 1000;
    return Math.round(sample * (settings.commissionPercent / 100));
  }, [settings.commissionPercent]);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="admin-section-title">Commission settings</h2>
          <p className="mt-1 text-sm text-gray-500">
            Paid to doctors when a referred patient buys the yearly ICare MC plan.
          </p>
        </div>
        <Button type="button" variant="outline" onClick={() => void load()} disabled={loading}>
          <RefreshCw className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </Button>
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

      <div className="admin-panel max-w-xl space-y-5">
        <div>
          <Label htmlFor="referral_commission_percent">Commission percent</Label>
          <Input
            id="referral_commission_percent"
            type="number"
            min={0}
            max={100}
            step={1}
            value={settings.commissionPercent}
            onChange={(event) =>
              setSettings((current) => ({
                ...current,
                commissionPercent: Number.parseInt(event.target.value, 10) || 0,
              }))
            }
            className="mt-1.5 max-w-40"
            disabled={loading || !canManage}
          />
          <p className="mt-2 text-sm text-gray-500">
            Applies to future subscription payments only. Existing commission rows are unchanged.
          </p>
          {!canManage ? (
            <p className="mt-2 text-sm text-amber-700">
              View only. Finance access is required to change the commission percent.
            </p>
          ) : null}
        </div>

        <div className="rounded-lg border border-gray-100 bg-gray-50/80 p-4 text-sm text-gray-700">
          Example: on a 1,000 ETB yearly plan, the referring doctor earns{" "}
          <span className="font-semibold text-gray-900">{preview} ETB</span>.
        </div>

        {updatedAt ? (
          <p className="text-xs text-gray-500">Last saved {formatDateTime(updatedAt)}</p>
        ) : null}

        {canManage ? (
          <Button type="button" onClick={() => void handleSave()} disabled={saving || loading}>
            <Save className="mr-2 h-4 w-4" />
            {saving ? "Saving…" : "Save settings"}
          </Button>
        ) : null}
      </div>
    </div>
  );
}
