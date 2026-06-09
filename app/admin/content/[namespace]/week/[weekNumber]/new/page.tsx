"use client";

import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { FileText } from "lucide-react";
import DailyTipForm from "@/components/content/DailyTipForm";
import PageHero from "@/components/PageHero";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useAppDispatch, useAppSelector } from "@/app/store/hooks";
import {
  createEmptyDailyTipForm,
  dailyTipsActions,
  saveDailyTip,
  type DailyTipFormState,
} from "@/features/dailyTips/dailyTipsSlice";
import { PREGNANCY_WEEK_NUMBERS } from "@/lib/constants";
import {
  dailyTipPath,
  dailyTipWeekPath,
} from "@/lib/content/contentLabels";

function parseWeekNumber(raw: string): number | null {
  const parsed = Number(raw);
  if (!Number.isInteger(parsed) || !PREGNANCY_WEEK_NUMBERS.includes(parsed)) {
    return null;
  }
  return parsed;
}

function parseDayNumber(raw: string | null): number | null {
  if (!raw) return null;
  const parsed = Number(raw);
  if (!Number.isInteger(parsed) || parsed < 1 || parsed > 7) return null;
  return parsed;
}

export default function NewDailyTipForWeekPage() {
  const params = useParams<{ weekNumber: string }>();
  const searchParams = useSearchParams();
  const router = useRouter();
  const dispatch = useAppDispatch();
  const { saving, error, success } = useAppSelector((state) => state.dailyTips);

  const weekNumber = parseWeekNumber(params.weekNumber);
  const dayNumber = parseDayNumber(searchParams.get("day"));
  const isValidWeek = weekNumber !== null;

  const [form, setForm] = useState<DailyTipFormState>(() =>
    createEmptyDailyTipForm(weekNumber ?? 1, dayNumber),
  );
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    if (!isValidWeek || weekNumber === null) return;

    dispatch(dailyTipsActions.clearDailyTipMessages());
    setForm(createEmptyDailyTipForm(weekNumber, dayNumber));
  }, [dayNumber, dispatch, isValidWeek, weekNumber]);

  const handleSave = async () => {
    if (!isValidWeek || weekNumber === null) return;

    setFormError(null);

    const result = await dispatch(
      saveDailyTip({
        form: {
          ...form,
          week_number: weekNumber,
          day_number: dayNumber ?? form.day_number,
        },
      }),
    );

    if (saveDailyTip.fulfilled.match(result)) {
      router.replace(dailyTipPath(result.payload.id));
    }
    if (saveDailyTip.rejected.match(result)) {
      setFormError(result.payload as string);
    }
  };

  if (!isValidWeek || weekNumber === null) {
    return (
      <>
        <PageHero
          title="Invalid week"
          description="Choose a pregnancy week between 1 and 42"
          icon={FileText}
        />
        <div className="mx-auto max-w-4xl px-6 py-8 lg:px-8">
          <Link
            href="/admin/content/daily_tip"
            className="text-sm font-medium text-emerald-600 hover:underline"
          >
            ← Back to all weeks
          </Link>
        </div>
      </>
    );
  }

  return (
    <>
      <PageHero
        title={`New tip for week ${weekNumber}, day ${dayNumber ?? form.day_number}`}
        description="Daily tips · daily_tips"
        icon={FileText}
      />

      <div className="mx-auto max-w-4xl px-6 py-8 lg:px-8">
        <div className="mb-6">
          <Link
            href={dailyTipWeekPath(weekNumber)}
            className="text-sm font-medium text-emerald-600 hover:underline"
          >
            ← Back to week {weekNumber}
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
          <div className="flex items-center gap-2">
            <input
              id="active"
              type="checkbox"
              checked={form.is_active}
              onChange={(e) => setForm({ ...form, is_active: e.target.checked })}
            />
            <Label htmlFor="active">Active (visible in mobile app)</Label>
          </div>

          <DailyTipForm
            value={form}
            onChange={setForm}
            lockWeek
            lockDay={dayNumber !== null}
          />

          <div className="flex flex-wrap gap-3 border-t border-gray-200 pt-4">
            <Button onClick={handleSave} disabled={saving}>
              {saving ? "Saving…" : "Create tip"}
            </Button>
          </div>
        </div>
      </div>
    </>
  );
}
