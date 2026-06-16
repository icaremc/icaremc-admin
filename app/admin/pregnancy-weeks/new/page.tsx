"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { CalendarDays } from "lucide-react";
import PregnancyWeekForm from "@/components/content/PregnancyWeekForm";
import PageHero from "@/components/PageHero";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useAppDispatch, useAppSelector } from "@/app/store/hooks";
import {
  pregnancyWeeksActions,
  savePregnancyWeek,
  trimesterForWeek,
  type PregnancyWeekFormState,
} from "@/features/pregnancyWeeks/pregnancyWeeksSlice";
import { EMPTY_PREGNANCY_SECTION } from "@/lib/content/formTypes";

function createEmptyForm(weekNumber: number): PregnancyWeekFormState {
  const emptyTranslation = {
    title: "",
    subtitle: "",
    baby_development: "",
    mother_changes: "",
    recommendations: "",
    warning_signs: "",
    sections: [{ ...EMPTY_PREGNANCY_SECTION }],
  };

  return {
    week_number: weekNumber,
    trimester: trimesterForWeek(weekNumber),
    image_note: "",
    is_published: true,
    translations: {
      en: { ...emptyTranslation },
      am: { ...emptyTranslation },
      om: { ...emptyTranslation },
    },
  };
}

export default function NewPregnancyWeekPage() {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const { saving, error, success } = useAppSelector(
    (state) => state.pregnancyWeeks,
  );

  const [form, setForm] = useState<PregnancyWeekFormState>(() =>
    createEmptyForm(1),
  );
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    dispatch(pregnancyWeeksActions.clearPregnancyWeekMessages());
  }, [dispatch]);

  const handleSave = async () => {
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

  return (
    <>
      <PageHero
        title="New pregnancy week"
        description="Add content in English, Amharic, and Oromo"
        icon={CalendarDays}
      />

      <div className="mx-auto max-w-4xl px-6 py-8 lg:px-8">
        <div className="mb-6">
          <Link
            href="/admin/pregnancy-weeks"
            className="text-sm font-medium text-emerald-600 hover:underline"
          >
            ← Back to pregnancy weeks
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
          <div>
            <Label htmlFor="new_week_number">Week number</Label>
            <input
              id="new_week_number"
              type="number"
              min={1}
              max={42}
              value={form.week_number || ""}
              onChange={(e) =>
                setForm(createEmptyForm(Number(e.target.value)))
              }
              className="mt-1.5 w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm"
            />
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

          <PregnancyWeekForm value={form} onChange={setForm} isNew />

          <div className="flex flex-wrap gap-3 border-t border-gray-200 pt-4">
            <Button onClick={handleSave} disabled={saving}>
              {saving ? "Saving…" : "Create week"}
            </Button>
          </div>
        </div>
      </div>
    </>
  );
}
