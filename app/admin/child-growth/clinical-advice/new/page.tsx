"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Stethoscope } from "lucide-react";
import PageHero from "@/components/PageHero";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useAppDispatch, useAppSelector } from "@/app/store/hooks";
import {
  emptyClinicalAdviceForm,
  growthClinicalAdviceActions,
  saveGrowthClinicalAdvice,
  type ClinicalAdviceFormState,
} from "@/features/growthClinicalAdvice/growthClinicalAdviceSlice";
import {
  GROWTH_CLINICAL_CONDITION_OPTIONS,
  GROWTH_CLINICAL_METRIC_OPTIONS,
  growthClinicalCodeLabel,
  suggestGrowthClinicalCode,
} from "@/lib/childGrowth/clinicalAdviceLabels";
import { LOCALES } from "@/lib/constants";
import type { Locale } from "@/lib/types/database";
import { cn } from "@/lib/utils";

const LOCALE_LABELS: Record<Locale, string> = {
  en: "English",
  am: "Amharic",
  om: "Oromo",
};

function localeComplete(
  form: ClinicalAdviceFormState,
  locale: Locale,
): boolean {
  const slice = form.translations[locale];
  return (
    slice.explain_text.trim().length > 0 &&
    slice.causes.trim().length > 0 &&
    slice.recommendations.trim().length > 0
  );
}

export default function NewGrowthClinicalAdvicePage() {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const { saving, error, success } = useAppSelector(
    (state) => state.growthClinicalAdvice,
  );
  const [form, setForm] = useState<ClinicalAdviceFormState>(
    emptyClinicalAdviceForm,
  );
  const [activeLocale, setActiveLocale] = useState<Locale>("en");
  const [codeManual, setCodeManual] = useState(false);

  useEffect(() => {
    dispatch(growthClinicalAdviceActions.clearGrowthClinicalAdviceMessages());
    dispatch(growthClinicalAdviceActions.clearSelectedGrowthClinicalAdvice());
  }, [dispatch]);

  function setMetric(metric: string) {
    setForm((prev) => {
      const next = { ...prev, metric };
      if (!codeManual) {
        next.code = suggestGrowthClinicalCode(metric, prev.condition);
      }
      return next;
    });
  }

  function setCondition(condition: string) {
    setForm((prev) => {
      const next = { ...prev, condition };
      if (!codeManual) {
        next.code = suggestGrowthClinicalCode(prev.metric, condition);
      }
      return next;
    });
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const result = await dispatch(saveGrowthClinicalAdvice(form));
    if (saveGrowthClinicalAdvice.fulfilled.match(result)) {
      router.push("/admin/child-growth/clinical-advice");
    }
  }

  const translation = form.translations[activeLocale];
  const previewTitle = growthClinicalCodeLabel(
    form.code,
    form.metric,
    form.condition,
  );

  return (
    <>
      <PageHero
        title="New growth interpretation"
        description="Create a parent-facing rule for a growth Z-score flag."
        icon={Stethoscope}
      />

      <div className="admin-page space-y-6">
        <Link
          href="/admin/child-growth/clinical-advice"
          className="inline-flex items-center gap-2 text-sm text-emerald-700 hover:underline"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to growth interpretation
        </Link>

        {error ? (
          <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-600">
            {error}
          </div>
        ) : null}
        {success ? (
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
            {success}
          </div>
        ) : null}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="admin-panel grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
                Preview
              </p>
              <p className="mt-1 text-sm font-semibold text-gray-900">
                {previewTitle}
              </p>
            </div>

            <div>
              <Label htmlFor="metric">Metric</Label>
              <select
                id="metric"
                className="mt-1 flex h-10 w-full rounded-md border border-gray-200 bg-white px-3 text-sm text-gray-900 outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                value={form.metric}
                onChange={(event) => setMetric(event.target.value)}
                required
              >
                {GROWTH_CLINICAL_METRIC_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <Label htmlFor="condition">Condition</Label>
              <select
                id="condition"
                className="mt-1 flex h-10 w-full rounded-md border border-gray-200 bg-white px-3 text-sm text-gray-900 outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                value={form.condition}
                onChange={(event) => setCondition(event.target.value)}
                required
              >
                {GROWTH_CLINICAL_CONDITION_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <Label htmlFor="code">Code</Label>
              <Input
                id="code"
                className="mt-1 font-mono text-sm"
                value={form.code}
                onChange={(event) => {
                  setCodeManual(true);
                  setForm({ ...form, code: event.target.value });
                }}
                placeholder="wfa_low"
                required
              />
              <p className="mt-1 text-xs text-gray-500">
                Stable key used by the app. Auto-filled from metric + condition;
                edit only if you need a custom code.
              </p>
            </div>

            <div>
              <Label htmlFor="sort-order">Sort order</Label>
              <Input
                id="sort-order"
                type="number"
                className="mt-1"
                value={form.sort_order}
                onChange={(event) =>
                  setForm({
                    ...form,
                    sort_order: Number.parseInt(event.target.value, 10) || 0,
                  })
                }
              />
            </div>

            <div>
              <Label htmlFor="min-age">Min age (months)</Label>
              <Input
                id="min-age"
                type="number"
                min={0}
                className="mt-1"
                value={form.min_age_months}
                onChange={(event) =>
                  setForm({
                    ...form,
                    min_age_months: Number.parseInt(event.target.value, 10) || 0,
                  })
                }
              />
            </div>

            <div>
              <Label htmlFor="max-age">Max age (months)</Label>
              <Input
                id="max-age"
                type="number"
                min={0}
                className="mt-1"
                value={form.max_age_months}
                onChange={(event) =>
                  setForm({
                    ...form,
                    max_age_months: Number.parseInt(event.target.value, 10) || 0,
                  })
                }
              />
            </div>

            <div className="flex items-end sm:col-span-2">
              <label className="flex items-center gap-2 text-sm text-gray-800">
                <input
                  type="checkbox"
                  checked={form.is_active}
                  onChange={(event) =>
                    setForm({ ...form, is_active: event.target.checked })
                  }
                  className="h-4 w-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                />
                Active (shown in app)
              </label>
            </div>
          </div>

          <div className="admin-panel space-y-4">
            <div className="flex flex-wrap gap-2">
              {LOCALES.map((locale) => {
                const done = localeComplete(form, locale);
                return (
                  <button
                    key={locale}
                    type="button"
                    onClick={() => setActiveLocale(locale)}
                    className={cn(
                      "inline-flex items-center gap-2 rounded-full border px-3.5 py-1.5 text-sm font-medium transition-colors",
                      activeLocale === locale
                        ? "border-emerald-600 bg-emerald-600 text-white shadow-sm"
                        : "border-gray-200 bg-white text-gray-700 hover:border-emerald-200 hover:bg-emerald-50",
                    )}
                  >
                    <span>{LOCALE_LABELS[locale]}</span>
                    <span
                      className={cn(
                        "h-2 w-2 rounded-full",
                        activeLocale === locale
                          ? done
                            ? "bg-white"
                            : "bg-white/50"
                          : done
                            ? "bg-emerald-500"
                            : "bg-gray-300",
                      )}
                    />
                  </button>
                );
              })}
            </div>

            <div>
              <Label htmlFor="explain">
                Explanation {activeLocale === "en" ? "*" : ""}
              </Label>
              <Textarea
                id="explain"
                className="mt-1"
                rows={4}
                value={translation.explain_text}
                onChange={(event) =>
                  setForm({
                    ...form,
                    translations: {
                      ...form.translations,
                      [activeLocale]: {
                        ...translation,
                        explain_text: event.target.value,
                      },
                    },
                  })
                }
                required={activeLocale === "en"}
              />
            </div>
            <div>
              <Label htmlFor="causes">Causes</Label>
              <Textarea
                id="causes"
                className="mt-1"
                rows={3}
                value={translation.causes}
                onChange={(event) =>
                  setForm({
                    ...form,
                    translations: {
                      ...form.translations,
                      [activeLocale]: {
                        ...translation,
                        causes: event.target.value,
                      },
                    },
                  })
                }
              />
            </div>
            <div>
              <Label htmlFor="recommendations">Recommendations</Label>
              <Textarea
                id="recommendations"
                className="mt-1"
                rows={3}
                value={translation.recommendations}
                onChange={(event) =>
                  setForm({
                    ...form,
                    translations: {
                      ...form.translations,
                      [activeLocale]: {
                        ...translation,
                        recommendations: event.target.value,
                      },
                    },
                  })
                }
              />
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <Link href="/admin/child-growth/clinical-advice">
              <Button type="button" variant="outline" disabled={saving}>
                Cancel
              </Button>
            </Link>
            <Button type="submit" disabled={saving}>
              {saving ? "Creating…" : "Create interpretation"}
            </Button>
          </div>
        </form>
      </div>
    </>
  );
}
