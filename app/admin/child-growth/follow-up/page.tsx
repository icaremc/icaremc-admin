"use client";

import Link from "next/link";
import { useEffect } from "react";
import { TrendingUp } from "lucide-react";
import ChildMilestonesTabs from "@/components/childGrowth/ChildMilestonesTabs";
import FollowupVisitsTable from "@/components/followup/FollowupVisitsTable";
import PageHero from "@/components/PageHero";
import { Button } from "@/components/ui/button";
import { useAppDispatch, useAppSelector } from "@/app/store/hooks";
import { fetchFollowupVisitTemplates } from "@/features/followupVisits/followupVisitsSlice";
import { useAdminCanManage } from "@/lib/useAdminPermissions";

export default function ChildGrowthFollowUpPage() {
  const dispatch = useAppDispatch();
  const { templates, loading, error } = useAppSelector(
    (state) => state.followupVisits,
  );
  const canManageContent = useAdminCanManage("manage_content");

  useEffect(() => {
    dispatch(fetchFollowupVisitTemplates());
  }, [dispatch]);

  return (
    <>
      <PageHero
        title="Visit schedule"
        description="When each well-child visit is due, push reminders, and which vaccines are given."
        icon={TrendingUp}
        stat={{ label: "Visits", value: templates.length }}
      />

      <ChildMilestonesTabs />

      <div className="mx-auto max-w-[1200px] px-6 py-8 lg:px-8">
        {canManageContent ? (
          <div className="mb-6 flex justify-end">
            <Link href="/admin/followup-visits/new">
              <Button>Add visit</Button>
            </Link>
          </div>
        ) : null}

        {error ? (
          <div className="mb-4 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-600">
            {error}
          </div>
        ) : null}

        <FollowupVisitsTable
          templates={templates}
          loading={loading}
          canManageContent={canManageContent}
        />
      </div>
    </>
  );
}
