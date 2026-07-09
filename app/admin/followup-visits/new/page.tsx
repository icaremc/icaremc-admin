"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import PageHero from "@/components/PageHero";
import FollowupVisitTemplateForm from "@/components/followup/FollowupVisitTemplateForm";
import { useAppDispatch, useAppSelector } from "@/app/store/hooks";
import { fetchChildGrowthPeriods } from "@/features/childGrowth/childGrowthSlice";
import {
  createFollowupVisitTemplate,
  emptyFollowupTemplateForm,
  followupVisitsActions,
  type FollowupVisitTemplateFormState,
} from "@/features/followupVisits/followupVisitsSlice";
import { CalendarCheck } from "lucide-react";

export default function NewFollowupVisitTemplatePage() {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const { saving, error, success } = useAppSelector((state) => state.followupVisits);
  const { periods } = useAppSelector((state) => state.childGrowth);
  const [form, setForm] = useState<FollowupVisitTemplateFormState>(
    emptyFollowupTemplateForm(),
  );

  useEffect(() => {
    dispatch(fetchChildGrowthPeriods());
    return () => {
      dispatch(followupVisitsActions.clearFollowupVisitMessages());
    };
  }, [dispatch]);

  const onSave = async () => {
    const result = await dispatch(createFollowupVisitTemplate(form));
    if (createFollowupVisitTemplate.fulfilled.match(result)) {
      router.replace(`/admin/followup-visits/${result.payload.id}/edit`);
    }
  };

  return (
    <>
      <PageHero
        title="Add follow-up visit"
        description="Define when this visit is due relative to birth, and which modules it includes."
        icon={CalendarCheck}
      />
      <div className="mx-auto max-w-[900px] px-6 py-8 lg:px-8">
        <div className="mb-4">
          <Link href="/admin/followup-visits" className="text-sm text-emerald-700 hover:underline">
            ← Back to follow-up templates
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
        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
          <FollowupVisitTemplateForm
            value={form}
            onChange={setForm}
            periods={periods}
            isNew
            onSave={onSave}
            saving={saving}
            saveLabel="Create template"
          />
        </div>
      </div>
    </>
  );
}
