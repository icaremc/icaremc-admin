"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  ArrowRight,
  BookOpen,
  Heart,
  Lightbulb,
  Plus,
  TrendingUp,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import PageHero from "@/components/PageHero";
import StatCard from "@/components/StatCard";
import { Button } from "@/components/ui/button";
import { CONTENT_SECTIONS } from "@/lib/constants";
import { supabase } from "@/lib/supabaseClient";
import { cn } from "@/lib/utils";

type SectionStats = {
  total: number;
  active: number;
  detail?: string;
};

type ContentOverviewStats = {
  pregnancyWeeks: SectionStats;
  dailyTips: SectionStats;
  childGrowth: SectionStats;
};

const emptyStats: ContentOverviewStats = {
  pregnancyWeeks: { total: 0, active: 0 },
  dailyTips: { total: 0, active: 0 },
  childGrowth: { total: 0, active: 0 },
};

const sectionMeta: Record<
  (typeof CONTENT_SECTIONS)[number]["key"],
  { icon: LucideIcon; accent: "emerald" | "teal" | "violet" }
> = {
  pregnancy_weeks: { icon: Heart, accent: "emerald" },
  child_growth: { icon: TrendingUp, accent: "emerald" },
  daily_tips: { icon: Lightbulb, accent: "teal" },
};

async function countRows(
  table: string,
  filters?: { column: string; value: string | boolean }[],
): Promise<number> {
  let query = supabase.from(table).select("*", { count: "exact", head: true });
  for (const filter of filters ?? []) {
    query = query.eq(filter.column, filter.value);
  }
  const { count, error } = await query;
  if (error) throw error;
  return count ?? 0;
}

async function fetchContentStats(): Promise<ContentOverviewStats> {
  const [
    pregnancyWeeksTotal,
    pregnancyWeeksPublished,
    childGrowthTotal,
    childGrowthPublished,
    dailyTipsTotal,
    dailyTipsActive,
    dailyTipsRows,
  ] = await Promise.all([
    countRows("pregnancy_weeks"),
    countRows("pregnancy_weeks", [{ column: "is_published", value: true }]),
    countRows("child_growth_periods"),
    countRows("child_growth_periods", [{ column: "is_published", value: true }]),
    countRows("daily_tips"),
    countRows("daily_tips", [{ column: "is_active", value: true }]),
    supabase.from("daily_tips").select("week_number").eq("is_active", true),
  ]);

  const weeksWithTips = new Set(
    (dailyTipsRows.data ?? []).map((row) => row.week_number),
  ).size;

  return {
    pregnancyWeeks: {
      total: pregnancyWeeksTotal,
      active: pregnancyWeeksPublished,
      detail: `${pregnancyWeeksPublished} published of 42 weeks`,
    },
    childGrowth: {
      total: childGrowthTotal,
      active: childGrowthPublished,
      detail: `${childGrowthPublished} published checkpoints`,
    },
    dailyTips: {
      total: dailyTipsTotal,
      active: dailyTipsActive,
      detail: `${weeksWithTips} week${weeksWithTips === 1 ? "" : "s"} with tips`,
    },
  };
}

function statsForSection(
  key: (typeof CONTENT_SECTIONS)[number]["key"],
  stats: ContentOverviewStats,
): SectionStats {
  switch (key) {
    case "pregnancy_weeks":
      return stats.pregnancyWeeks;
    case "child_growth":
      return stats.childGrowth;
    case "daily_tips":
      return stats.dailyTips;
  }
}

export default function ContentIndexPage() {
  const [stats, setStats] = useState<ContentOverviewStats>(emptyStats);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);
      try {
        const next = await fetchContentStats();
        if (!cancelled) setStats(next);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to load content stats.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  const totalItems = useMemo(
    () =>
      stats.pregnancyWeeks.total +
      stats.childGrowth.total +
      stats.dailyTips.total,
    [stats],
  );

  return (
    <>
      <PageHero
        title="Content"
        icon={BookOpen}
        stat={{
          label: "Total items",
          value: loading ? "…" : totalItems.toLocaleString(),
        }}
      />

      <div className="mx-auto max-w-[1200px] space-y-8 px-6 py-8 lg:px-8">
        {error ? (
          <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-600">
            {error}
          </div>
        ) : null}

        <section>
          <h2 className="text-lg font-semibold text-gray-900">At a glance</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {CONTENT_SECTIONS.map((section) => {
              const meta = sectionMeta[section.key];
              const sectionStats = statsForSection(section.key, stats);
              return (
                <StatCard
                  key={section.key}
                  label={section.label}
                  value={sectionStats.total}
                  href={section.href}
                  icon={meta.icon}
                  loading={loading}
                  description={loading ? undefined : sectionStats.detail}
                  accent={meta.accent}
                />
              );
            })}
          </div>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-gray-900">
            Content libraries
          </h2>

          <div className="mt-4 grid gap-4 lg:grid-cols-3">
            {CONTENT_SECTIONS.map((section) => {
              const meta = sectionMeta[section.key];
              const Icon = meta.icon;
              const sectionStats = statsForSection(section.key, stats);

              return (
                <article
                  key={section.key}
                  className="group flex flex-col admin-table-wrap transition-colors hover:border-emerald-200 hover:shadow-md"
                >
                  <div className="border-b border-gray-100 bg-gray-50/50 px-6 py-5">
                    <div className="flex items-start justify-between gap-4">
                      <div
                        className={cn(
                          "flex h-10 w-10 items-center justify-center rounded-[var(--radius)] ring-1 ring-inset",
                          meta.accent === "emerald" &&
                            "bg-emerald-50 text-emerald-600 ring-emerald-100",
                          meta.accent === "teal" &&
                            "bg-teal-50 text-teal-600 ring-teal-100",
                          meta.accent === "violet" &&
                            "bg-violet-50 text-violet-600 ring-violet-100",
                        )}
                      >
                        <Icon className="h-5 w-5" />
                      </div>
                      <div className="text-right">
                        <p className="font-heading text-2xl font-bold tabular-nums tracking-normal text-gray-900">
                          {loading ? "—" : sectionStats.total}
                        </p>
                        <p className="text-xs text-gray-500">
                          {loading
                            ? "Loading…"
                            : `${sectionStats.active} live in app`}
                        </p>
                      </div>
                    </div>
                    <h3 className="mt-4 font-heading text-lg font-semibold tracking-normal text-gray-900">
                      {section.label}
                    </h3>
                    <p className="mt-1 text-sm leading-relaxed text-gray-600">
                      {section.description}
                    </p>
                  </div>

                  <div className="mt-auto flex flex-wrap gap-2 px-6 py-4">
                    <Link href={section.href} className="flex-1 min-w-[120px]">
                      <Button variant="outline" className="w-full">
                        Manage
                        <ArrowRight className="ml-2 h-4 w-4 opacity-60 transition-transform group-hover:translate-x-0.5" />
                      </Button>
                    </Link>
                    <Link href={section.addHref}>
                      <Button>
                        <Plus className="mr-2 h-4 w-4" />
                        {section.addLabel}
                      </Button>
                    </Link>
                  </div>
                </article>
              );
            })}
          </div>
        </section>
      </div>
    </>
  );
}
