"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
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
  deleteDailyTip,
  fetchDailyTip,
  saveDailyTip,
  tipToForm,
  type DailyTipFormState,
} from "@/features/dailyTips/dailyTipsSlice";
import { dailyTipBackPath, dailyTipPath } from "@/lib/content/contentLabels";

export default function DailyTipEditPage() {
  const params = useParams<{ entityId: string }>();
  const router = useRouter();
  const dispatch = useAppDispatch();
  const { selected, loading, saving, error, success } = useAppSelector(
    (state) => state.dailyTips,
  );

  const tipId = decodeURIComponent(params.entityId);
  const [form, setForm] = useState<DailyTipFormState>(() => createEmptyDailyTipForm());
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    dispatch(dailyTipsActions.clearDailyTipMessages());
    dispatch(fetchDailyTip(tipId));
  }, [dispatch, tipId]);

  useEffect(() => {
    if (selected) {
      setForm(tipToForm(selected));
    }
  }, [selected]);

  const handleSave = async () => {
    setFormError(null);

    const result = await dispatch(
      saveDailyTip({
        id: selected?.id,
        form,
      }),
    );

    if (saveDailyTip.fulfilled.match(result)) {
      router.replace(dailyTipPath(result.payload.id));
    }
    if (saveDailyTip.rejected.match(result)) {
      setFormError(result.payload as string);
    }
  };

  const handleDelete = async () => {
    if (!selected?.id) return;
    if (!window.confirm("Delete this daily tip?")) return;

    const result = await dispatch(deleteDailyTip(selected.id));
    if (deleteDailyTip.fulfilled.match(result)) {
      router.replace(dailyTipBackPath(selected));
    }
  };

  return (
    <>
      <PageHero
        title="Edit daily tip"
        description="Daily tips · daily_tips"
        icon={FileText}
      />

      <div className="mx-auto max-w-4xl px-6 py-8 lg:px-8">
        <div className="mb-6 flex flex-wrap items-center gap-4">
          <Link
            href={dailyTipPath(tipId)}
            className="text-sm font-medium text-emerald-600 hover:underline"
          >
            ← Back to details
          </Link>
          <Link
            href={dailyTipBackPath(selected)}
            className="text-sm font-medium text-gray-500 hover:text-gray-700 hover:underline"
          >
            Week tips
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

        {loading || !selected ? (
          <p className="text-sm text-gray-600">Loading…</p>
        ) : (
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

            <DailyTipForm value={form} onChange={setForm} />

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
