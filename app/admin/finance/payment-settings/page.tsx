"use client";

import { useCallback, useEffect, useState } from "react";
import { CreditCard, Eye, EyeOff, RefreshCw, Save } from "lucide-react";
import PageHero from "@/components/PageHero";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  defaultChapaSettings,
  type ChapaPaymentSettings,
} from "@/lib/payment/paymentSettings";

type LoadResponse = {
  paymentSettings?: { chapa?: ChapaPaymentSettings };
  updatedAt?: string | null;
  error?: string;
};

export default function PaymentSettingsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [chapa, setChapa] = useState<ChapaPaymentSettings>(defaultChapaSettings());
  const [updatedAt, setUpdatedAt] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showSecret, setShowSecret] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/admin/payment-settings");
      const data = (await response.json()) as LoadResponse;
      if (!response.ok) {
        throw new Error(data.error ?? "Could not load payment settings");
      }
      setChapa(data.paymentSettings?.chapa ?? defaultChapaSettings());
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
      const response = await fetch("/api/admin/payment-settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ paymentSettings: { chapa } }),
      });
      const data = (await response.json()) as LoadResponse;
      if (!response.ok) {
        throw new Error(data.error ?? "Could not save payment settings");
      }
      setChapa(data.paymentSettings?.chapa ?? chapa);
      setUpdatedAt(data.updatedAt ?? null);
      setMessage("Payment settings saved. The mobile app will use these keys on next launch.");
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

  return (
    <>
      <PageHero
        title="Payment settings"
        description="Configure Chapa checkout keys for appointment prepayments in the patient app."
        icon={CreditCard}
        stat={{ label: "Gateway", value: "Chapa" }}
      />

      <div className="mx-auto max-w-[960px] space-y-6 px-6 py-8 lg:px-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-gray-500">
            {updatedAt
              ? `Last updated ${new Date(updatedAt).toLocaleString()}`
              : "Not saved yet"}
          </p>
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
            stored in Supabase and fetched by the signed-in patient app.
          </p>
        </section>
      </div>
    </>
  );
}
