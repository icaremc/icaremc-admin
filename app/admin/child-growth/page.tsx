"use client";

import Link from "next/link";
import { useEffect } from "react";
import { TrendingUp } from "lucide-react";
import ChildGrowthPeriodsList from "@/components/childGrowth/ChildGrowthPeriodsList";
import ChildMilestonesTabs from "@/components/childGrowth/ChildMilestonesTabs";
import PageHero from "@/components/PageHero";
import { Button } from "@/components/ui/button";
import { useAppDispatch, useAppSelector } from "@/app/store/hooks";
import { fetchChildGrowthPeriods } from "@/features/childGrowth/childGrowthSlice";
import { useAdminCanManage } from "@/lib/useAdminPermissions";

export default function ChildGrowthPage() {
  const dispatch = useAppDispatch();
  const { periods, loading, error } = useAppSelector((state) => state.childGrowth);

  const canManageContent = useAdminCanManage("manage_content");

  useEffect(() => {
    dispatch(fetchChildGrowthPeriods());
  }, [dispatch]);

  return (
    <>
      <PageHero
        title="Child milestones"
        description="Development content parents see at each age: checklist, growth ranges, red flags, and nutrition."
        icon={TrendingUp}
        stat={{ label: "Ages", value: periods.length }}
      />

      <ChildMilestonesTabs />

      <div className="mx-auto max-w-[1200px] px-6 py-8 lg:px-8">
        {canManageContent ? (
          <div className="mb-6 flex justify-end">
            <Link href="/admin/child-growth/new">
              <Button>Add period</Button>
            </Link>
          </div>
        ) : null}

        {error ? (
          <div className="mb-4 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-600">
            {error}
          </div>
        ) : null}

        <ChildGrowthPeriodsList
          periods={periods}
          loading={loading}
          canManageContent={canManageContent}
        />
      </div>
    </>
  );
}
