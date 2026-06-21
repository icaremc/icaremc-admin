"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { TrendingUp } from "lucide-react";
import ChildGrowthPeriodForm from "@/components/content/ChildGrowthPeriodForm";
import PageHero from "@/components/PageHero";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useAppDispatch, useAppSelector } from "@/app/store/hooks";
import {
  childGrowthActions,
  createEmptyForm,
  saveChildGrowthPeriod,
  type ChildGrowthPeriodFormState,
} from "@/features/childGrowth/childGrowthSlice";
import {
  SUGGESTED_CHILD_GROWTH_PERIODS,
  ageGroupForMonths,
} from "@/lib/childGrowth/periods";

export default function NewChildGrowthPeriodPage() {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const { saving, error, success } = useAppSelector((state) => state.childGrowth);

  const [form, setForm] = useState<ChildGrowthPeriodFormState>(() =>
    createEmptyForm(0, "Newborn (0–28 days)"),
  );
  const [formError, setFormError] = useState<string | null>(null);
  const [preset, setPreset] = useState("0");

  useEffect(() => {
    dispatch(childGrowthActions.clearChildGrowthMessages());
  }, [dispatch]);

  const applyPreset = (value: string) => {
    setPreset(value);
    if (value === "custom") return;

    const months = Number(value);
    const suggested = SUGGESTED_CHILD_GROWTH_PERIODS.find(
      (item) => item.age_months === months,
    );
    setForm(
      createEmptyForm(
        months,
        suggested?.age_label ?? `${months} months`,
      ),
    );
  };

  const handleSave = async () => {
    setFormError(null);
    if (form.age_months < 0 || form.age_months > 216) {
      setFormError("Age must be between 0 and 216 months.");
      return;
    }
    if (!form.age_label.trim()) {
      setFormError("Age label is required.");
      return;
    }

    const result = await dispatch(saveChildGrowthPeriod(form));
    if (saveChildGrowthPeriod.fulfilled.match(result)) {
      router.replace(`/admin/child-growth/${result.payload.age_months}`);
    }
    if (saveChildGrowthPeriod.rejected.match(result)) {
      setFormError(result.payload as string);
    }
  };

  return (
    <>
      <PageHero
        title="New growth period"
        description="WHO-aligned checkpoint: growth, vaccines, milestones, red flags, nutrition, visits"
        icon={TrendingUp}
      />

      <div className="mx-auto max-w-4xl px-6 py-8 lg:px-8">
        <div className="mb-6">
          <Link
            href="/admin/child-growth"
            className="text-sm font-medium text-emerald-600 hover:underline"
          >
            ← Back to child growth timeline
          </Link>
        </div>

        {error ? (
          <div className="mb-4 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-600">
            {error}
          </div>
        ) : null}
        {success ? (
          <div className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-700">
            {success}
          </div>
        ) : null}
        {formError ? (
          <div className="mb-4 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-600">
            {formError}
          </div>
        ) : null}

        <div className="admin-panel space-y-6">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="preset">Suggested checkpoint</Label>
              <select
                id="preset"
                value={preset}
                onChange={(e) => applyPreset(e.target.value)}
                className="mt-1.5 w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm"
              >
                {SUGGESTED_CHILD_GROWTH_PERIODS.map((item) => (
                  <option key={item.age_months} value={item.age_months}>
                    {item.age_label} ({item.age_months} mo)
                  </option>
                ))}
                <option value="custom">Custom age…</option>
              </select>
            </div>
            {preset === "custom" ? (
              <div>
                <Label htmlFor="custom_age_months">Custom age (months)</Label>
                <input
                  id="custom_age_months"
                  type="number"
                  min={0}
                  max={216}
                  value={form.age_months}
                  onChange={(e) => {
                    const ageMonths = Number(e.target.value);
                    setForm({
                      ...createEmptyForm(ageMonths, form.age_label),
                      age_label: form.age_label,
                      age_group: ageGroupForMonths(ageMonths),
                      is_published: form.is_published,
                    });
                  }}
                  className="mt-1.5 w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm"
                />
              </div>
            ) : null}
          </div>

          <label className="flex items-center gap-2 text-sm text-gray-700">
            <input
              type="checkbox"
              checked={form.is_published}
              onChange={(e) =>
                setForm({ ...form, is_published: e.target.checked })
              }
            />
            Published (visible in mobile app)
          </label>

          <ChildGrowthPeriodForm value={form} onChange={setForm} isNew />

          <div className="flex flex-wrap gap-3 border-t border-gray-200 pt-4">
            <Button onClick={handleSave} disabled={saving}>
              {saving ? "Saving…" : "Create period"}
            </Button>
          </div>
        </div>
      </div>
    </>
  );
}
