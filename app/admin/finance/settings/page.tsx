"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { RefreshCw, Save, Settings2 } from "lucide-react";
import PageHero from "@/components/PageHero";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  defaultFinanceSettings,
  type FinanceSettings,
} from "@/lib/payment/financeSettings";

type LoadResponse = {
  financeSettings?: FinanceSettings;
  updatedAt?: string | null;
  error?: string;
};

export default function FinanceSettingsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState<FinanceSettings>(defaultFinanceSettings());
  const [updatedAt, setUpdatedAt] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/admin/finance-settings");
      const data = (await response.json()) as LoadResponse;
      if (!response.ok) {
        throw new Error(data.error ?? "Could not load finance settings");
      }
      setSettings(data.financeSettings ?? defaultFinanceSettings());
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
    setSaving(true);
    setMessage(null);
    setError(null);
    try {
      const response = await fetch("/api/admin/finance-settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ financeSettings: settings }),
      });
      const data = (await response.json()) as LoadResponse;
      if (!response.ok) {
        throw new Error(data.error ?? "Could not save finance settings");
      }
      setSettings(data.financeSettings ?? settings);
      setUpdatedAt(data.updatedAt ?? null);
      setMessage("Finance settings saved.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  const preview = useMemo(() => {
    const sample = 1000;
    const net = sample * (1 - settings.platformCommissionPercent / 100);
    return { sample, net };
  }, [settings.platformCommissionPercent]);

  return (
    <>
      <PageHero
        title="Finance settings"
        description="Platform commission and minimum doctor withdrawal amount"
        icon={Settings2}
        stat={{ label: "Min withdraw", value: settings.minimumAmountWithdraw }}
      />

      <div className="mx-auto max-w-[720px] space-y-6 px-6 py-8 lg:px-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-gray-500">
            {updatedAt
              ? `Last updated ${new Date(updatedAt).toLocaleString()}`
              : "Not saved yet"}
          </p>
          <div className="flex gap-2">
            <Button type="button" variant="outline" onClick={() => void load()} disabled={loading}>
              <RefreshCw className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} />
              Refresh
            </Button>
            <Button type="button" onClick={() => void handleSave()} disabled={saving || loading}>
              <Save className="mr-2 h-4 w-4" />
              {saving ? "Saving…" : "Save settings"}
            </Button>
          </div>
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

        <section className="admin-panel space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="text-sm">
              <span className="mb-1 block font-medium text-gray-700">
                Minimum withdrawal (ETB)
              </span>
              <Input
                type="number"
                min={1}
                value={String(settings.minimumAmountWithdraw)}
                onChange={(event) =>
                  setSettings((current) => ({
                    ...current,
                    minimumAmountWithdraw:
                      Number.parseFloat(event.target.value) ||
                      current.minimumAmountWithdraw,
                  }))
                }
                disabled={loading}
              />
            </label>
            <label className="text-sm">
              <span className="mb-1 block font-medium text-gray-700">
                Platform commission (%)
              </span>
              <Input
                type="number"
                min={0}
                max={100}
                step={0.5}
                value={String(settings.platformCommissionPercent)}
                onChange={(event) =>
                  setSettings((current) => ({
                    ...current,
                    platformCommissionPercent:
                      Number.parseFloat(event.target.value) ||
                      current.platformCommissionPercent,
                  }))
                }
                disabled={loading}
              />
            </label>
          </div>
          <p className="text-sm text-gray-600">
            When an appointment is marked <strong>completed</strong>, the doctor wallet is
            credited with the paid amount minus commission. Example: ETB {preview.sample}{" "}
            collected → ETB {preview.net.toFixed(0)} credited to doctor.
          </p>
          <p className="text-xs text-gray-500">
            Restricted to <span className="font-medium">super admins</span>.
          </p>
        </section>
      </div>
    </>
  );
}
