"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Baby,
  CreditCard,
  Eye,
  EyeOff,
  RefreshCw,
  Save,
  Settings2,
  Wallet,
} from "lucide-react";
import PageHero from "@/components/PageHero";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  defaultFinanceSettings,
  parseFinanceSettings,
  type FinanceSettings,
} from "@/lib/payment/financeSettings";
import {
  defaultChapaSettings,
  type ChapaPaymentSettings,
} from "@/lib/payment/paymentSettings";
import {
  defaultProfilePaymentSettings,
  parseProfilePaymentSettings,
  type ProfilePaymentSettings,
} from "@/lib/payment/profilePaymentSettings";
import { cn } from "@/lib/utils";

type Tab = "platform" | "payment" | "registration";

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

type PregnancyPaymentLoadResponse = {
  pregnancyPaymentSettings?: ProfilePaymentSettings;
  updatedAt?: string | null;
  error?: string;
};

type ChildPaymentLoadResponse = {
  childPaymentSettings?: ProfilePaymentSettings;
  updatedAt?: string | null;
  error?: string;
};

function isFinanceTab(value: string | null): value is Tab {
  return value === "platform" || value === "payment" || value === "registration";
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
  const [pregnancyPayment, setPregnancyPayment] = useState<ProfilePaymentSettings>(
    defaultProfilePaymentSettings("pregnancy_payment"),
  );
  const [childPayment, setChildPayment] = useState<ProfilePaymentSettings>(
    defaultProfilePaymentSettings("child_payment"),
  );
  const [financeUpdatedAt, setFinanceUpdatedAt] = useState<string | null>(null);
  const [paymentUpdatedAt, setPaymentUpdatedAt] = useState<string | null>(null);
  const [pregnancyUpdatedAt, setPregnancyUpdatedAt] = useState<string | null>(null);
  const [childUpdatedAt, setChildUpdatedAt] = useState<string | null>(null);
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
      const [financeRes, paymentRes, pregnancyRes, childRes] = await Promise.all([
        fetch("/api/admin/finance-settings"),
        fetch("/api/admin/payment-settings"),
        fetch("/api/admin/pregnancy-payment-settings"),
        fetch("/api/admin/child-payment-settings"),
      ]);
      const financeData = (await financeRes.json()) as FinanceLoadResponse;
      const paymentData = (await paymentRes.json()) as PaymentLoadResponse;
      const pregnancyData = (await pregnancyRes.json()) as PregnancyPaymentLoadResponse;
      const childData = (await childRes.json()) as ChildPaymentLoadResponse;

      if (!financeRes.ok) {
        throw new Error(financeData.error ?? "Could not load finance settings");
      }
      if (!paymentRes.ok) {
        throw new Error(paymentData.error ?? "Could not load payment settings");
      }
      if (!pregnancyRes.ok) {
        throw new Error(
          pregnancyData.error ?? "Could not load pregnancy payment settings",
        );
      }
      if (!childRes.ok) {
        throw new Error(childData.error ?? "Could not load child payment settings");
      }

      setSettings(parseFinanceSettings(financeData.financeSettings));
      setFinanceUpdatedAt(financeData.updatedAt ?? null);
      setChapa(paymentData.paymentSettings?.chapa ?? defaultChapaSettings());
      setPaymentUpdatedAt(paymentData.updatedAt ?? null);
      setPregnancyPayment(
        parseProfilePaymentSettings(
          pregnancyData.pregnancyPaymentSettings,
          "pregnancy_payment",
        ),
      );
      setPregnancyUpdatedAt(pregnancyData.updatedAt ?? null);
      setChildPayment(
        parseProfilePaymentSettings(childData.childPaymentSettings, "child_payment"),
      );
      setChildUpdatedAt(childData.updatedAt ?? null);
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
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ financeSettings: settings }),
        });
        const financeData = (await financeRes.json()) as FinanceLoadResponse;
        if (!financeRes.ok) {
          throw new Error(financeData.error ?? "Could not save finance settings");
        }
        setSettings(
          parseFinanceSettings(financeData.financeSettings ?? settings),
        );
        setFinanceUpdatedAt(financeData.updatedAt ?? null);
      } else if (tab === "payment") {
        const paymentRes = await fetch("/api/admin/payment-settings", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ paymentSettings: { chapa } }),
        });
        const paymentData = (await paymentRes.json()) as PaymentLoadResponse;
        if (!paymentRes.ok) {
          throw new Error(paymentData.error ?? "Could not save payment settings");
        }
        setChapa(paymentData.paymentSettings?.chapa ?? chapa);
        setPaymentUpdatedAt(paymentData.updatedAt ?? null);
      } else {
        const [pregnancyRes, childRes] = await Promise.all([
          fetch("/api/admin/pregnancy-payment-settings", {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ pregnancyPaymentSettings: pregnancyPayment }),
          }),
          fetch("/api/admin/child-payment-settings", {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ childPaymentSettings: childPayment }),
          }),
        ]);
        const pregnancyData =
          (await pregnancyRes.json()) as PregnancyPaymentLoadResponse;
        const childData = (await childRes.json()) as ChildPaymentLoadResponse;
        if (!pregnancyRes.ok) {
          throw new Error(
            pregnancyData.error ?? "Could not save pregnancy payment settings",
          );
        }
        if (!childRes.ok) {
          throw new Error(childData.error ?? "Could not save child payment settings");
        }
        setPregnancyPayment(
          parseProfilePaymentSettings(
            pregnancyData.pregnancyPaymentSettings ?? pregnancyPayment,
            "pregnancy_payment",
          ),
        );
        setPregnancyUpdatedAt(pregnancyData.updatedAt ?? null);
        setChildPayment(
          parseProfilePaymentSettings(
            childData.childPaymentSettings ?? childPayment,
            "child_payment",
          ),
        );
        setChildUpdatedAt(childData.updatedAt ?? null);
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
    const updatedAt =
      tab === "payment"
        ? paymentUpdatedAt
        : tab === "registration"
          ? pregnancyUpdatedAt ?? childUpdatedAt
          : financeUpdatedAt;
    return updatedAt
      ? `Last updated ${new Date(updatedAt).toLocaleString()}`
      : "Not saved yet";
  }, [
    childUpdatedAt,
    financeUpdatedAt,
    paymentUpdatedAt,
    pregnancyUpdatedAt,
    tab,
  ]);

  return (
    <>
      <PageHero
        title="Finance settings"
        description="Platform payouts, registration fees, and Chapa payment gateway"
        icon={Settings2}
        stat={{
          label:
            tab === "payment"
              ? "Gateway"
              : tab === "registration"
                ? "Pregnancy fee"
                : "Min withdraw",
          value:
            tab === "payment"
              ? "Chapa"
              : tab === "registration"
                ? pregnancyPayment.amount
                : settings.minimumAmountWithdraw,
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
            <button
              type="button"
              onClick={() => switchTab("registration")}
              className={cn(
                "inline-flex items-center gap-2 border-b-2 px-3 py-2 text-sm font-medium transition-colors",
                tab === "registration"
                  ? "border-emerald-600 text-emerald-700"
                  : "border-transparent text-gray-500 hover:text-gray-800",
              )}
            >
              <Baby className="h-4 w-4" />
              Registration fees
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
                  checked={Boolean(settings.doctorCancelPenaltyEnabled)}
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
        ) : tab === "payment" ? (
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
        ) : (
          <div className="grid gap-6 lg:grid-cols-2">
            <section className="admin-panel space-y-4">
              <div>
                <h2 className="admin-section-title">Pregnancy payment</h2>
                <p className="mt-1 text-sm text-gray-500">
                  Fee charged when a pregnancy profile is registered or activated.
                </p>
              </div>
              <label className="flex items-center gap-2 text-sm text-gray-700">
                <input
                  type="checkbox"
                  checked={pregnancyPayment.isActive}
                  onChange={(event) =>
                    setPregnancyPayment((current) => ({
                      ...current,
                      isActive: event.target.checked,
                    }))
                  }
                  disabled={loading}
                  className="h-4 w-4 rounded border-gray-300"
                />
                Active
              </label>
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="text-sm">
                  <span className="mb-1 block font-medium text-gray-700">Amount</span>
                  <Input
                    type="number"
                    min={0}
                    value={String(pregnancyPayment.amount)}
                    onChange={(event) =>
                      setPregnancyPayment((current) => ({
                        ...current,
                        amount:
                          Number.parseFloat(event.target.value) || current.amount,
                      }))
                    }
                    disabled={loading}
                  />
                </label>
                <label className="text-sm">
                  <span className="mb-1 block font-medium text-gray-700">Currency</span>
                  <Input
                    value={pregnancyPayment.currency}
                    onChange={(event) =>
                      setPregnancyPayment((current) => ({
                        ...current,
                        currency: event.target.value,
                      }))
                    }
                    disabled={loading}
                  />
                </label>
              </div>
              <label className="block text-sm">
                <span className="mb-1 block font-medium text-gray-700">Description</span>
                <Input
                  value={pregnancyPayment.description}
                  onChange={(event) =>
                    setPregnancyPayment((current) => ({
                      ...current,
                      description: event.target.value,
                    }))
                  }
                  disabled={loading}
                />
              </label>
            </section>

            <section className="admin-panel space-y-4">
              <div>
                <h2 className="admin-section-title">Child payment</h2>
                <p className="mt-1 text-sm text-gray-500">
                  Fee charged when a child profile is registered or activated.
                </p>
              </div>
              <label className="flex items-center gap-2 text-sm text-gray-700">
                <input
                  type="checkbox"
                  checked={childPayment.isActive}
                  onChange={(event) =>
                    setChildPayment((current) => ({
                      ...current,
                      isActive: event.target.checked,
                    }))
                  }
                  disabled={loading}
                  className="h-4 w-4 rounded border-gray-300"
                />
                Active
              </label>
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="text-sm">
                  <span className="mb-1 block font-medium text-gray-700">Amount</span>
                  <Input
                    type="number"
                    min={0}
                    value={String(childPayment.amount)}
                    onChange={(event) =>
                      setChildPayment((current) => ({
                        ...current,
                        amount:
                          Number.parseFloat(event.target.value) || current.amount,
                      }))
                    }
                    disabled={loading}
                  />
                </label>
                <label className="text-sm">
                  <span className="mb-1 block font-medium text-gray-700">Currency</span>
                  <Input
                    value={childPayment.currency}
                    onChange={(event) =>
                      setChildPayment((current) => ({
                        ...current,
                        currency: event.target.value,
                      }))
                    }
                    disabled={loading}
                  />
                </label>
              </div>
              <label className="block text-sm">
                <span className="mb-1 block font-medium text-gray-700">Description</span>
                <Input
                  value={childPayment.description}
                  onChange={(event) =>
                    setChildPayment((current) => ({
                      ...current,
                      description: event.target.value,
                    }))
                  }
                  disabled={loading}
                />
              </label>
            </section>
          </div>
        )}
      </div>
    </>
  );
}
