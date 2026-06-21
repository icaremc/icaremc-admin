"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { TrendingUp } from "lucide-react";
import ChildGrowthPeriodForm from "@/components/content/ChildGrowthPeriodForm";
import PageHero from "@/components/PageHero";
import { Button } from "@/components/ui/button";
import { useAppDispatch, useAppSelector } from "@/app/store/hooks";
import {
  childGrowthActions,
  deleteChildGrowthPeriod,
  fetchChildGrowthPeriod,
  periodToForm,
  saveChildGrowthPeriod,
  type ChildGrowthPeriodFormState,
} from "@/features/childGrowth/childGrowthSlice";

export default function ChildGrowthPeriodEditPage() {
  const params = useParams<{ ageMonths: string }>();
  const router = useRouter();
  const dispatch = useAppDispatch();
  const { selected, loading, saving, error, success } = useAppSelector(
    (state) => state.childGrowth,
  );

  const ageMonths = Number(params.ageMonths);
  const [form, setForm] = useState<ChildGrowthPeriodFormState | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

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

  const handleSave = async () => {
    if (!form) return;
    setFormError(null);
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

  const handleDelete = async () => {
    if (!selected?.id) return;
    if (!window.confirm("Delete this growth period?")) return;
    const result = await dispatch(deleteChildGrowthPeriod(selected.id));
    if (deleteChildGrowthPeriod.fulfilled.match(result)) {
      router.replace("/admin/child-growth");
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

        {loading || !form ? (
          <p className="text-sm text-gray-600">Loading…</p>
        ) : (
          <div className="admin-panel space-y-6">
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

            <ChildGrowthPeriodForm value={form} onChange={setForm} />

            <div className="flex flex-wrap gap-3 border-t border-gray-200 pt-4">
              <Button onClick={handleSave} disabled={saving}>
                {saving ? "Saving…" : "Save changes"}
              </Button>
              <Button variant="destructive" onClick={handleDelete}>
                Delete
              </Button>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
