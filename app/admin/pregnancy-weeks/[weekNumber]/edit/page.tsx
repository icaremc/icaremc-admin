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
import {
  removePregnancyWeekImage,
  uploadPregnancyWeekImage,
} from "@/lib/pregnancyWeeks/imageApi";

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
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [removeImage, setRemoveImage] = useState(false);

  useEffect(() => {
    dispatch(pregnancyWeeksActions.clearPregnancyWeekMessages());
    if (!Number.isNaN(weekNumber)) {
      dispatch(fetchPregnancyWeek(weekNumber));
    }
  }, [dispatch, weekNumber]);

  useEffect(() => {
    if (selected) {
      setForm(weekToForm(selected));
      setImageFile(null);
      setRemoveImage(false);
      setImagePreview(selected.image_url?.trim() || null);
    }
  }, [selected]);

  useEffect(() => {
    return () => {
      if (imagePreview?.startsWith("blob:")) {
        URL.revokeObjectURL(imagePreview);
      }
    };
  }, [imagePreview]);

  const handleImageChange = (file: File | null) => {
    setImageFile(file);
    setRemoveImage(false);
    if (imagePreview?.startsWith("blob:")) {
      URL.revokeObjectURL(imagePreview);
    }
    if (file) {
      setImagePreview(URL.createObjectURL(file));
    } else {
      setImagePreview(selected?.image_url?.trim() || null);
    }
  };

  const handleRemoveImageChange = (remove: boolean) => {
    setRemoveImage(remove);
    if (remove) {
      setImageFile(null);
      if (imagePreview?.startsWith("blob:")) {
        URL.revokeObjectURL(imagePreview);
      }
      setImagePreview(null);
    } else {
      setImagePreview(selected?.image_url?.trim() || null);
    }
  };

  const syncWeekImage = async (weekId: string) => {
    if (removeImage) {
      await removePregnancyWeekImage(weekId);
      return;
    }
    if (imageFile) {
      await uploadPregnancyWeekImage(weekId, imageFile);
    }
  };

  const handleSave = async () => {
    if (!form) return;
    setFormError(null);
    if (!form.week_number || form.week_number < 1) {
      setFormError("Week number is required.");
      return;
    }

    const result = await dispatch(savePregnancyWeek(form));
    if (savePregnancyWeek.fulfilled.match(result)) {
      try {
        if (removeImage || imageFile) {
          await syncWeekImage(result.payload.id);
        }
      } catch (imageError) {
        setFormError(
          imageError instanceof Error
            ? imageError.message
            : "Week saved but image upload failed.",
        );
        return;
      }
      router.replace(`/admin/pregnancy-weeks/${result.payload.week_number}`);
    }
    if (savePregnancyWeek.rejected.match(result)) {
      setFormError(result.payload as string);
    }
  };

  const handleDelete = async () => {
    if (!selected?.id) return;
    if (!window.confirm("Delete this pregnancy week?")) return;
    try {
      await removePregnancyWeekImage(selected.id);
    } catch {
      // Continue deleting the week even if storage cleanup fails.
    }
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

      <div className="admin-page admin-page-form">
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
              Published
            </label>

            <PregnancyWeekForm
              value={form}
              onChange={setForm}
              imagePreview={imagePreview}
              onImageChange={handleImageChange}
              removeImage={removeImage}
              onRemoveImageChange={handleRemoveImageChange}
            />

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
