"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { CalendarCheck } from "lucide-react";
import PageHero from "@/components/PageHero";
import FollowupVisitTemplateForm from "@/components/followup/FollowupVisitTemplateForm";
import { useAppDispatch, useAppSelector } from "@/app/store/hooks";
import { fetchChildGrowthPeriods } from "@/features/childGrowth/childGrowthSlice";
import {
  deleteFollowupVisitTemplate,
  emptyFollowupTemplateForm,
  fetchFollowupVisitTemplate,
  followupVisitsActions,
  templateToForm,
  updateFollowupVisitTemplate,
  type FollowupVisitTemplateFormState,
} from "@/features/followupVisits/followupVisitsSlice";

export default function EditFollowupVisitTemplatePage() {
  const params = useParams<{ id: string }>();
  const id = params.id;
  const router = useRouter();
  const dispatch = useAppDispatch();
  const { selected, saving, error, success, loading } = useAppSelector(
    (state) => state.followupVisits,
  );
  const { periods } = useAppSelector((state) => state.childGrowth);
  const [form, setForm] = useState<FollowupVisitTemplateFormState>(
    emptyFollowupTemplateForm(),
  );
  const [ready, setReady] = useState(false);

  useEffect(() => {
    dispatch(fetchChildGrowthPeriods());
    if (id) dispatch(fetchFollowupVisitTemplate(id));
    return () => {
      dispatch(followupVisitsActions.clearFollowupVisitMessages());
      dispatch(followupVisitsActions.clearFollowupVisitSelected());
    };
  }, [dispatch, id]);

  useEffect(() => {
    if (selected?.id === id) {
      setForm(templateToForm(selected));
      setReady(true);
    }
  }, [selected, id]);

  const onSave = async () => {
    await dispatch(updateFollowupVisitTemplate({ id, form }));
  };

  const onDelete = async () => {
    if (!window.confirm("Delete this visit? Parents may already have it on their schedule.")) {
      return;
    }
    const result = await dispatch(deleteFollowupVisitTemplate(id));
    if (deleteFollowupVisitTemplate.fulfilled.match(result)) {
      router.replace("/admin/child-growth/follow-up");
    }
  };

  return (
    <>
      <PageHero
        title="Edit visit"
        description={form.label || "Update schedule and what parents see"}
        icon={CalendarCheck}
      />
      <div className="mx-auto max-w-[900px] px-6 py-8 lg:px-8">
        <div className="mb-4 flex flex-wrap gap-4">
          <Link
            href={`/admin/followup-visits/${id}`}
            className="text-sm text-emerald-700 hover:underline"
          >
            ← Back to detail
          </Link>
          <Link href="/admin/child-growth/follow-up" className="text-sm text-gray-500 hover:underline">
            All visits
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
        {loading && !ready ? (
          <p className="text-sm text-gray-500">Loading…</p>
        ) : (
          <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
            <FollowupVisitTemplateForm
              value={form}
              onChange={setForm}
              periods={periods}
              onSave={onSave}
              onDelete={onDelete}
              saving={saving}
              saveLabel="Save changes"
            />
          </div>
        )}
      </div>
    </>
  );
}
