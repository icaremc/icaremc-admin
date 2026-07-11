"use client";

import { useCallback, useEffect, useState } from "react";
import { Smartphone } from "lucide-react";
import PageHero from "@/components/PageHero";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { AppVersionSettingsData } from "@/lib/appVersion/appVersionSettings";
import {
  APP_VERSION_TARGET_LIST,
  type AppVersionTarget,
} from "@/lib/appVersion/appVersionTargets";

export default function AppVersionSettingsPage() {
  const [app, setApp] = useState<AppVersionTarget>("mc");
  const [form, setForm] = useState<AppVersionSettingsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const loadSettings = useCallback(async (target: AppVersionTarget) => {
    setLoading(true);
    setError(null);
    setSuccess(null);
    try {
      const res = await fetch(`/api/admin/app-version-settings?app=${target}`);
      const payload = (await res.json()) as {
        error?: string;
        appVersionSettings?: AppVersionSettingsData;
      };
      if (!res.ok) throw new Error(payload.error ?? "Failed to load settings");
      setForm(payload.appVersionSettings ?? null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load settings");
      setForm(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadSettings(app);
  }, [app, loadSettings]);

  const handleSave = async () => {
    if (!form) return;
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      const res = await fetch(`/api/admin/app-version-settings?app=${app}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ appVersionSettings: form }),
      });
      const payload = (await res.json()) as {
        error?: string;
        appVersionSettings?: AppVersionSettingsData;
      };
      if (!res.ok) throw new Error(payload.error ?? "Save failed");
      setForm(payload.appVersionSettings ?? form);
      setSuccess("Version policy saved.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const activeApp = APP_VERSION_TARGET_LIST.find((option) => option.id === app)!;

  return (
    <>
      <PageHero
        title="App release"
        description="Set minimum versions and choose mandatory or optional updates for each client"
        icon={Smartphone}
      />

      <div className="mx-auto max-w-3xl px-6 py-8 lg:px-8">
        <div className="mb-6">
          <p className="text-sm text-gray-500">
            Manage release gates for iCare MC and Doctors.
          </p>
        </div>

        <div className="mt-6 flex flex-wrap gap-2">
          {APP_VERSION_TARGET_LIST.map((option) => (
            <button
              key={option.id}
              type="button"
              onClick={() => setApp(option.id)}
              className={`rounded-full px-4 py-2 text-sm font-medium transition ${
                app === option.id
                  ? "bg-emerald-600 text-white"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
        <p className="mt-2 text-sm text-gray-600">{activeApp.description}</p>

        {error ? (
          <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-600">
            {error}
          </div>
        ) : null}
        {success ? (
          <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-700">
            {success}
          </div>
        ) : null}

        {loading || !form ? (
          <p className="mt-6 text-sm text-gray-600">Loading…</p>
        ) : (
          <div className="admin-panel mt-6 space-y-5">
            <div>
              <Label htmlFor="min_version">Minimum version</Label>
              <Input
                id="min_version"
                value={form.min_version}
                onChange={(e) =>
                  setForm({ ...form, min_version: e.target.value })
                }
                placeholder="1.0.1"
                className="mt-1.5"
              />
              <p className="mt-1 text-xs text-gray-500">{activeApp.versionHint}</p>
            </div>

            <fieldset className="space-y-3">
              <legend className="text-sm font-medium text-gray-900">
                Update requirement
              </legend>
              <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-gray-200 p-3 text-sm text-gray-700">
                <input
                  type="radio"
                  name="update_requirement"
                  checked={!form.force_update}
                  onChange={() => setForm({ ...form, force_update: false })}
                  className="mt-0.5"
                />
                <span>
                  <span className="font-medium text-gray-900">Optional</span>
                  <span className="mt-0.5 block text-gray-500">
                    Users can dismiss the update prompt and continue.
                  </span>
                </span>
              </label>
              <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-gray-200 p-3 text-sm text-gray-700">
                <input
                  type="radio"
                  name="update_requirement"
                  checked={form.force_update}
                  onChange={() => setForm({ ...form, force_update: true })}
                  className="mt-0.5"
                />
                <span>
                  <span className="font-medium text-gray-900">Mandatory</span>
                  <span className="mt-0.5 block text-gray-500">
                    Users below the minimum version must update before continuing.
                  </span>
                </span>
              </label>
            </fieldset>

            <div>
              <Label htmlFor="message_en">Message (English)</Label>
              <Textarea
                id="message_en"
                value={form.message_en}
                onChange={(e) =>
                  setForm({ ...form, message_en: e.target.value })
                }
                rows={3}
                className="mt-1.5"
              />
            </div>
            {activeApp.supportsLocalizedMessages ? (
              <>
                <div>
                  <Label htmlFor="message_am">Message (Amharic)</Label>
                  <Textarea
                    id="message_am"
                    value={form.message_am}
                    onChange={(e) =>
                      setForm({ ...form, message_am: e.target.value })
                    }
                    rows={3}
                    className="mt-1.5"
                  />
                </div>
                <div>
                  <Label htmlFor="message_om">Message (Afan Oromo)</Label>
                  <Textarea
                    id="message_om"
                    value={form.message_om}
                    onChange={(e) =>
                      setForm({ ...form, message_om: e.target.value })
                    }
                    rows={3}
                    className="mt-1.5"
                  />
                </div>
              </>
            ) : null}

            <Button onClick={handleSave} disabled={saving}>
              {saving ? "Saving…" : "Save settings"}
            </Button>
          </div>
        )}
      </div>
    </>
  );
}
