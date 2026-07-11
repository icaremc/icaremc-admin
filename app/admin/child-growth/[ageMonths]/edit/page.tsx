"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { TrendingUp } from "lucide-react";
import ChildGrowthPeriodForm from "@/components/content/ChildGrowthPeriodForm";
import PageHero from "@/components/PageHero";
import SavedToast from "@/components/SavedToast";
import { useAppDispatch, useAppSelector } from "@/app/store/hooks";
import {
  childGrowthActions,
  fetchChildGrowthPeriod,
  periodToForm,
  saveChildGrowthPeriod,
  type ChildGrowthPeriodFormState,
} from "@/features/childGrowth/childGrowthSlice";

export default function ChildGrowthPeriodEditPage() {
  const params = useParams<{ ageMonths: string }>();
  const dispatch = useAppDispatch();
  const { selected, loading, saving, error } = useAppSelector(
    (state) => state.childGrowth,
  );

  const ageMonths = Number(params.ageMonths);
  const [form, setForm] = useState<ChildGrowthPeriodFormState | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [showSavedToast, setShowSavedToast] = useState(false);

  useEffect(() => {
    dispatch(childGrowthActions.clearChildGrowthMessages());
    if (!Number.isNaN(ageMonths)) {
      dispatch(fetchChildGrowthPeriod(ageMonths));
    }
  }, [dispatch, ageMonths]);

  useEffect(() => {
    if (selected) {
      setForm(periodToForm(selected));
    }
  }, [selected]);

  useEffect(() => {
    if (!showSavedToast) return;
    const timeout = window.setTimeout(() => setShowSavedToast(false), 2500);
    return () => window.clearTimeout(timeout);
  }, [showSavedToast]);

  const handleSave = async () => {
    if (!form) return;
    setFormError(null);
    if (!form.age_label.trim()) {
      setFormError("Age label is required.");
      return;
    }

    // Stay on the page after saving so the admin can keep filling other tabs.
    const result = await dispatch(saveChildGrowthPeriod(form));
    if (saveChildGrowthPeriod.rejected.match(result)) {
      setFormError(result.payload as string);
    } else {
      setShowSavedToast(true);
    }
  };

  return (
    <>
      <PageHero
        title={`Edit ${selected?.age_label ?? `${ageMonths} months`}`}
        description="Update translations and publish settings"
        icon={TrendingUp}
      />

      <div className="mx-auto max-w-4xl px-6 py-8 lg:px-8">
        <div className="mb-6 flex flex-wrap items-center gap-4">
          <Link
            href={`/admin/child-growth/${ageMonths}`}
            className="text-sm font-medium text-emerald-600 hover:underline"
          >
            ← Back to period details
          </Link>
          <Link
            href="/admin/child-growth"
            className="text-sm font-medium text-gray-500 hover:text-gray-700 hover:underline"
          >
            All periods
          </Link>
        </div>

        {error ? (
          <div className="mb-4 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-600">
            {error}
          </div>
        ) : null}
        {formError ? (
          <div className="mb-4 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-600">
            {formError}
          </div>
        ) : null}

        {loading || !form ? (
          <p className="text-sm text-gray-600">Loading…</p>
        ) : (
          <div className="admin-panel">
            <ChildGrowthPeriodForm
              value={form}
              onChange={setForm}
              onSave={handleSave}
              saving={saving}
              saveLabel="Save changes"
            />
          </div>
        )}
      </div>

      <SavedToast open={showSavedToast} message="Saved" />
    </>
  );
}
