"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Stethoscope } from "lucide-react";
import PageHero from "@/components/PageHero";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useAppDispatch, useAppSelector } from "@/app/store/hooks";
import {
  adviceToForm,
  emptyClinicalAdviceForm,
  fetchGrowthClinicalAdviceById,
  saveGrowthClinicalAdvice,
  type ClinicalAdviceFormState,
} from "@/features/growthClinicalAdvice/growthClinicalAdviceSlice";
import {
  growthClinicalCodeLabel,
  growthClinicalConditionLabel,
  growthClinicalMetricLabel,
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

export default function EditGrowthClinicalAdvicePage() {
  const params = useParams();
  const router = useRouter();
  const adviceId = typeof params.id === "string" ? params.id : "";
  const dispatch = useAppDispatch();
  const { selected, loading, saving, error, success } = useAppSelector(
    (state) => state.growthClinicalAdvice,
  );
  const [form, setForm] = useState<ClinicalAdviceFormState>(emptyClinicalAdviceForm());
  const [activeLocale, setActiveLocale] = useState<Locale>("en");

  useEffect(() => {
    if (adviceId) dispatch(fetchGrowthClinicalAdviceById(adviceId));
  }, [adviceId, dispatch]);

  useEffect(() => {
    if (selected && selected.id === adviceId) {
      setForm(adviceToForm(selected));
    }
  }, [selected, adviceId]);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const result = await dispatch(saveGrowthClinicalAdvice(form));
    if (saveGrowthClinicalAdvice.fulfilled.match(result)) {
      router.push("/admin/child-growth/clinical-advice");
    }
  }

  const translation = form.translations[activeLocale];
  const interpretationTitle = form.code
    ? growthClinicalCodeLabel(form.code, form.metric, form.condition)
    : "Edit clinical advice";

  return (
    <>
      <PageHero
        title={interpretationTitle}
        description="Update age range, active status, and parent-facing copy in each language."
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

        {loading && !form.id ? (
          <p className="text-sm text-gray-600">Loading…</p>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="admin-panel grid gap-4 sm:grid-cols-2">
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
                  Interpretation
                </p>
                <p className="mt-1 text-sm font-semibold text-gray-900">
                  {interpretationTitle}
                </p>
                <p className="mt-0.5 font-mono text-[11px] text-gray-400">
                  {form.code || "—"}
                </p>
              </div>
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
                  Metric · condition
                </p>
                <p className="mt-1 text-sm text-gray-900">
                  {growthClinicalMetricLabel(form.metric)} ·{" "}
                  {growthClinicalConditionLabel(form.condition)}
                </p>
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
              <div className="flex items-end">
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
                {saving ? "Saving…" : "Save advice"}
              </Button>
            </div>
          </form>
        )}
      </div>
    </>
  );
}
