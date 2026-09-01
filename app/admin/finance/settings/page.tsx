"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { CreditCard, Eye, EyeOff, RefreshCw, Save, Settings2, Wallet } from "lucide-react";
import PageHero from "@/components/PageHero";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  defaultFinanceSettings,
  type FinanceSettings,
} from "@/lib/payment/financeSettings";
import {
  defaultChapaSettings,
  type ChapaPaymentSettings,
} from "@/lib/payment/paymentSettings";
import { cn } from "@/lib/utils";

type Tab = "platform" | "payment";

type FinanceLoadResponse = {
  financeSettings?: FinanceSettings;
  updatedAt?: string | null;
  error?: string;
};

type PaymentLoadResponse = {
  paymentSettings?: { chapa?: ChapaPaymentSettings };
  updatedAt?: string | null;
  error?: string;
};

function isFinanceTab(value: string | null): value is Tab {
  return value === "platform" || value === "payment";
}

export default function FinanceSettingsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const tabParam = searchParams.get("tab");
  const [tab, setTab] = useState<Tab>(isFinanceTab(tabParam) ? tabParam : "platform");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState<FinanceSettings>(defaultFinanceSettings());
  const [chapa, setChapa] = useState<ChapaPaymentSettings>(defaultChapaSettings());
  const [financeUpdatedAt, setFinanceUpdatedAt] = useState<string | null>(null);
  const [paymentUpdatedAt, setPaymentUpdatedAt] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showSecret, setShowSecret] = useState(false);

  useEffect(() => {
    if (isFinanceTab(tabParam)) setTab(tabParam);
  }, [tabParam]);

  function switchTab(next: Tab) {
    setTab(next);
    const params = new URLSearchParams(searchParams.toString());
    if (next === "platform") params.delete("tab");
    else params.set("tab", next);
    const qs = params.toString();
    router.replace(qs ? `/admin/finance/settings?${qs}` : "/admin/finance/settings");
  }

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [financeRes, paymentRes] = await Promise.all([
        fetch("/api/admin/finance-settings"),
        fetch("/api/admin/payment-settings"),
      ]);
      const financeData = (await financeRes.json()) as FinanceLoadResponse;
      const paymentData = (await paymentRes.json()) as PaymentLoadResponse;

      if (!financeRes.ok) {
        throw new Error(financeData.error ?? "Could not load finance settings");
      }
      if (!paymentRes.ok) {
        throw new Error(paymentData.error ?? "Could not load payment settings");
      }

      setSettings(financeData.financeSettings ?? defaultFinanceSettings());
      setFinanceUpdatedAt(financeData.updatedAt ?? null);
      setChapa(paymentData.paymentSettings?.chapa ?? defaultChapaSettings());
      setPaymentUpdatedAt(paymentData.updatedAt ?? null);
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
      if (tab === "platform") {
        const financeRes = await fetch("/api/admin/finance-settings", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ financeSettings: settings }),
        });
        const financeData = (await financeRes.json()) as FinanceLoadResponse;
        if (!financeRes.ok) {
          throw new Error(financeData.error ?? "Could not save finance settings");
        }
        setSettings(financeData.financeSettings ?? settings);
        setFinanceUpdatedAt(financeData.updatedAt ?? null);
      } else {
        const paymentRes = await fetch("/api/admin/payment-settings", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ paymentSettings: { chapa } }),
        });
        const paymentData = (await paymentRes.json()) as PaymentLoadResponse;
        if (!paymentRes.ok) {
          throw new Error(paymentData.error ?? "Could not save payment settings");
        }
        setChapa(paymentData.paymentSettings?.chapa ?? chapa);
        setPaymentUpdatedAt(paymentData.updatedAt ?? null);
      }
      setMessage("Settings saved.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  function updateChapa<K extends keyof ChapaPaymentSettings>(
    key: K,
    value: ChapaPaymentSettings[K],
  ) {
    setChapa((current) => ({ ...current, [key]: value }));
  }

  const preview = useMemo(() => {
    const sample = 1000;
    const net = sample * (1 - settings.platformCommissionPercent / 100);
    return { sample, net };
  }, [settings.platformCommissionPercent]);

  const lastUpdatedLabel = useMemo(() => {
    const updatedAt = tab === "payment" ? paymentUpdatedAt : financeUpdatedAt;
    return updatedAt
      ? `Last updated ${new Date(updatedAt).toLocaleString()}`
      : "Not saved yet";
  }, [financeUpdatedAt, paymentUpdatedAt, tab]);

  return (
    <>
      <PageHero
        title="Finance settings"
        description="Platform payouts, commissions, and Chapa payment gateway"
        icon={Settings2}
        stat={{
          label: tab === "payment" ? "Gateway" : "Min withdraw",
          value: tab === "payment" ? "Chapa" : settings.minimumAmountWithdraw,
        }}
      />

      <div className="admin-page admin-page-settings space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-200 pb-1">
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => switchTab("platform")}
              className={cn(
                "inline-flex items-center gap-2 border-b-2 px-3 py-2 text-sm font-medium transition-colors",
                tab === "platform"
                  ? "border-emerald-600 text-emerald-700"
                  : "border-transparent text-gray-500 hover:text-gray-800",
              )}
            >
              <Wallet className="h-4 w-4" />
              Platform
            </button>
            <button
              type="button"
              onClick={() => switchTab("payment")}
              className={cn(
                "inline-flex items-center gap-2 border-b-2 px-3 py-2 text-sm font-medium transition-colors",
                tab === "payment"
                  ? "border-emerald-600 text-emerald-700"
                  : "border-transparent text-gray-500 hover:text-gray-800",
              )}
            >
              <CreditCard className="h-4 w-4" />
              Payment gateway
            </button>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-gray-500">{lastUpdatedLabel}</p>
          <div className="flex flex-wrap gap-2">
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

        {tab === "platform" ? (
          <>
            <section className="admin-panel space-y-4">
              <div>
                <h2 className="admin-section-title">Platform & payouts</h2>
                <p className="mt-1 text-sm text-gray-500">
                  Doctor wallet credits and minimum withdrawal amount.
                </p>
              </div>
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
            </section>

            <section className="admin-panel space-y-4">
              <div>
                <h2 className="text-base font-semibold text-gray-900">
                  Doctor cancellation penalty
                </h2>
                <p className="mt-1 text-sm text-gray-600">
                  When a doctor cancels a paid booking, the patient is refunded to their wallet.
                  Optionally deduct a fixed penalty from the doctor&apos;s wallet (up to their
                  available balance).
                </p>
              </div>
              <label className="flex items-center gap-2 text-sm text-gray-700">
                <input
                  type="checkbox"
                  checked={settings.doctorCancelPenaltyEnabled}
                  onChange={(event) =>
                    setSettings((current) => ({
                      ...current,
                      doctorCancelPenaltyEnabled: event.target.checked,
                    }))
                  }
                  disabled={loading}
                  className="h-4 w-4 rounded border-gray-300"
                />
                Enable doctor cancellation penalty
              </label>
              <label className="block text-sm">
                <span className="mb-1 block font-medium text-gray-700">
                  Penalty amount (ETB)
                </span>
                <Input
                  type="number"
                  min={0}
                  step={50}
                  value={String(settings.doctorCancelPenaltyAmount)}
                  onChange={(event) =>
                    setSettings((current) => ({
                      ...current,
                      doctorCancelPenaltyAmount:
                        Number.parseFloat(event.target.value) ||
                        current.doctorCancelPenaltyAmount,
                    }))
                  }
                  disabled={loading || !settings.doctorCancelPenaltyEnabled}
                />
              </label>
              <p className="text-xs text-gray-500">
                Applies only when <strong>cancelled_by = doctor</strong> and the booking was paid.
                Patient refunds are unchanged.
              </p>
            </section>
          </>
        ) : (
          <section className="admin-panel space-y-5">
            <div>
              <h2 className="admin-section-title">Chapa</h2>
              <p className="mt-1 text-sm text-gray-500">
                Keys from{" "}
                <a
                  href="https://dashboard.chapa.co"
                  target="_blank"
                  rel="noreferrer"
                  className="text-emerald-700 underline"
                >
                  dashboard.chapa.co
                </a>
                . Enable and mark active before patients can pay online.
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <label className="text-sm">
                <span className="mb-1 block font-medium text-gray-700">Display name</span>
                <Input
                  value={chapa.name}
                  onChange={(event) => updateChapa("name", event.target.value)}
                  disabled={loading}
                />
              </label>

              <label className="text-sm">
                <span className="mb-1 block font-medium text-gray-700">
                  Transaction fee (%)
                </span>
                <Input
                  type="number"
                  min={0}
                  max={100}
                  step={0.1}
                  value={String(chapa.feePercent)}
                  onChange={(event) =>
                    updateChapa(
                      "feePercent",
                      Number.parseFloat(event.target.value) || 0,
                    )
                  }
                  disabled={loading}
                />
              </label>

              <div className="flex flex-wrap items-end gap-6 sm:col-span-2">
                <label className="flex items-center gap-2 text-sm text-gray-700">
                  <input
                    type="checkbox"
                    checked={chapa.enable}
                    onChange={(event) => updateChapa("enable", event.target.checked)}
                    disabled={loading}
                  />
                  Enable
                </label>
                <label className="flex items-center gap-2 text-sm text-gray-700">
                  <input
                    type="checkbox"
                    checked={chapa.isActive}
                    onChange={(event) => updateChapa("isActive", event.target.checked)}
                    disabled={loading}
                  />
                  Active
                </label>
                <label className="flex items-center gap-2 text-sm text-gray-700">
                  <input
                    type="checkbox"
                    checked={chapa.isSandbox}
                    onChange={(event) => updateChapa("isSandbox", event.target.checked)}
                    disabled={loading}
                  />
                  Sandbox
                </label>
              </div>

              <label className="text-sm">
                <span className="mb-1 block font-medium text-gray-700">Public key</span>
                <Input
                  value={chapa.publicKey}
                  onChange={(event) => updateChapa("publicKey", event.target.value)}
                  placeholder="CHAPUBK-..."
                  disabled={loading}
                />
              </label>

              <label className="text-sm">
                <span className="mb-1 block font-medium text-gray-700">Secret key</span>
                <div className="relative">
                  <Input
                    type={showSecret ? "text" : "password"}
                    value={chapa.secretKey}
                    onChange={(event) => updateChapa("secretKey", event.target.value)}
                    placeholder="CHASECK-..."
                    disabled={loading}
                    className="pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowSecret((value) => !value)}
                    className="absolute inset-y-0 right-2 inline-flex items-center text-gray-500 hover:text-gray-700"
                    aria-label={showSecret ? "Hide secret key" : "Show secret key"}
                  >
                    {showSecret ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </label>
            </div>

            <p className="text-xs text-gray-500">
              Restricted to <span className="font-medium">super admins</span>. Secret keys are
              stored in Supabase and used for signed-in checkout.
            </p>
          </section>
        )}
      </div>
    </>
  );
}
