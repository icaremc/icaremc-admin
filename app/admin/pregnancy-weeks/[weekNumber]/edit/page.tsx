"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { CalendarDays } from "lucide-react";
import PregnancyWeekForm from "@/components/content/PregnancyWeekForm";
import PageHero from "@/components/PageHero";
import { Button } from "@/components/ui/button";
import { useAppDispatch, useAppSelector } from "@/app/store/hooks";
import {
  deletePregnancyWeek,
  fetchPregnancyWeek,
  pregnancyWeeksActions,
  savePregnancyWeek,
  weekToForm,
  type PregnancyWeekFormState,
} from "@/features/pregnancyWeeks/pregnancyWeeksSlice";

export default function PregnancyWeekEditPage() {
  const params = useParams<{ weekNumber: string }>();
  const router = useRouter();
  const dispatch = useAppDispatch();
  const { selected, loading, saving, error, success } = useAppSelector(
    (state) => state.pregnancyWeeks,
  );

  const weekNumber = Number(params.weekNumber);
  const [form, setForm] = useState<PregnancyWeekFormState | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    dispatch(pregnancyWeeksActions.clearPregnancyWeekMessages());
    if (!Number.isNaN(weekNumber)) {
      dispatch(fetchPregnancyWeek(weekNumber));
    }
  }, [dispatch, weekNumber]);

  useEffect(() => {
    if (selected) {
      setForm(weekToForm(selected));
    }
  }, [selected]);

  const handleSave = async () => {
    if (!form) return;
    setFormError(null);
    if (!form.week_number || form.week_number < 1) {
      setFormError("Week number is required.");
      return;
    }

    const result = await dispatch(savePregnancyWeek(form));
    if (savePregnancyWeek.fulfilled.match(result)) {
      router.replace(`/admin/pregnancy-weeks/${result.payload.week_number}`);
    }
    if (savePregnancyWeek.rejected.match(result)) {
      setFormError(result.payload as string);
    }
  };

  const handleDelete = async () => {
    if (!selected?.id) return;
    if (!window.confirm("Delete this pregnancy week?")) return;
    const result = await dispatch(deletePregnancyWeek(selected.id));
    if (deletePregnancyWeek.fulfilled.match(result)) {
      router.replace("/admin/pregnancy-weeks");
    }
  };

  return (
    <>
      <PageHero
        title={`Edit week ${weekNumber}`}
        description="Update translations and publish settings"
        icon={CalendarDays}
      />

      <div className="mx-auto max-w-4xl px-6 py-8 lg:px-8">
        <div className="mb-6 flex flex-wrap items-center gap-4">
          <Link
            href={`/admin/pregnancy-weeks/${weekNumber}`}
            className="text-sm font-medium text-emerald-600 hover:underline"
          >
            ← Back to week details
          </Link>
          <Link
            href="/admin/pregnancy-weeks"
            className="text-sm font-medium text-gray-500 hover:text-gray-700 hover:underline"
          >
            All weeks
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

            <PregnancyWeekForm value={form} onChange={setForm} />

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
