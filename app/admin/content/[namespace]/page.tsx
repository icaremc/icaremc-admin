"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import {
  ChevronRight,
  FileText,
  Lightbulb,
  Plus,
  Search,
} from "lucide-react";
import PageHero from "@/components/PageHero";
import DailyTipLanguageTitles from "@/components/content/DailyTipLanguageTitles";
import DailyTipStatusBadge from "@/components/content/DailyTipStatusBadge";
import DailyTipWeekProgress from "@/components/content/DailyTipWeekProgress";
import { Button } from "@/components/ui/button";
import { useAppDispatch, useAppSelector } from "@/app/store/hooks";
import { fetchDailyTips } from "@/features/dailyTips/dailyTipsSlice";
import { fetchContentByNamespace } from "@/features/content/contentSlice";
import {
  CONTENT_NAMESPACES,
  contentEntityIdLabel,
  namespaceDescription,
  namespaceLabel,
} from "@/lib/constants";
import {
  contentEditPath,
  contentEntityPath,
  contentListLabel,
  dailyTipsForWeek,
  dailyTipPath,
  dailyTipWeekPath,
  summarizeDailyTipsByWeek,
} from "@/lib/content/contentLabels";
import {
  DAILY_TIP_TRIMESTERS,
  dailyTipMatchesSearch,
} from "@/lib/content/dailyTipUi";
import { namespaceUsesUuidEntityId } from "@/lib/content/entityId";
import { formatDateTime } from "@/lib/format";
import type { ContentNamespace } from "@/lib/types/database";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

function DailyTipWeeksView() {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const { tips, loading, error } = useAppSelector((state) => state.dailyTips);
  const [query, setQuery] = useState("");
  const [expandedTrimester, setExpandedTrimester] = useState<number | null>(1);

  useEffect(() => {
    dispatch(fetchDailyTips());
  }, [dispatch]);

  const weekSummary = useMemo(() => summarizeDailyTipsByWeek(tips), [tips]);
  const filteredTips = useMemo(() => {
    const dayOnly = tips.filter((tip) => tip.day_number !== null);
    if (!query.trim()) return dayOnly;
    return dayOnly.filter((tip) => dailyTipMatchesSearch(tip, query));
  }, [tips, query]);

  const filteredWeeks = useMemo(() => {
    const weeks = new Set(filteredTips.map((t) => t.week_number));
    return weeks;
  }, [filteredTips]);

  const dayTips = useMemo(
    () => tips.filter((tip) => tip.day_number !== null),
    [tips],
  );

  const stats = useMemo(() => {
    const active = dayTips.filter((t) => t.is_active).length;
    return {
      total: dayTips.length,
      active,
      weeks: weekSummary.size,
    };
  }, [dayTips, weekSummary]);

  return (
    <>
      <PageHero
        title="Daily tips"
        description="Health tips by pregnancy week and day. Mothers see the match for their current week"
        icon={Lightbulb}
        stat={{ label: "Active tips", value: stats.active }}
      />

      <div className="mx-auto max-w-[1200px] px-6 py-8 lg:px-8">
        <div className="mb-6 grid gap-3 sm:grid-cols-3">
          <div className="rounded-xl border border-emerald-100 bg-emerald-50/50 px-4 py-3">
            <p className="text-xs font-medium uppercase tracking-wide text-emerald-700">
              Total tips
            </p>
            <p className="mt-1 text-2xl font-bold text-gray-900">{stats.total}</p>
          </div>
          <div className="rounded-xl border border-teal-100 bg-teal-50/50 px-4 py-3">
            <p className="text-xs font-medium uppercase tracking-wide text-teal-700">
              Weeks covered
            </p>
            <p className="mt-1 text-2xl font-bold text-gray-900">{stats.weeks}</p>
          </div>
          <div className="rounded-xl border border-cyan-100 bg-cyan-50/50 px-4 py-3">
            <p className="text-xs font-medium uppercase tracking-wide text-cyan-700">
              Active in app
            </p>
            <p className="mt-1 text-2xl font-bold text-gray-900">{stats.active}</p>
          </div>
        </div>

        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative w-full sm:max-w-md">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by title, week, or day…"
              className="w-full rounded-[var(--radius)] border border-gray-200 bg-white py-2.5 pl-10 pr-4 text-sm shadow-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-200/50"
            />
          </div>
          <Link href="/admin/content/daily_tip/new">
            <Button className="w-full sm:w-auto">
              <Plus className="mr-2 h-4 w-4" />
              Add tip
            </Button>
          </Link>
        </div>

        {error ? (
          <div className="mb-4 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-600">
            {error}
          </div>
        ) : null}

        {loading ? (
          <div className="admin-panel py-12 text-center text-sm text-gray-500">
            Loading daily tips…
          </div>
        ) : stats.total === 0 ? (
          <div className="admin-panel py-16 text-center">
            <Lightbulb className="mx-auto h-10 w-10 text-emerald-400" />
            <p className="mt-4 text-lg font-medium text-gray-900">No tips yet</p>
            <p className="mt-1 text-sm text-gray-500">
              Create tips for each week and day so mothers get relevant advice.
            </p>
            <Link href="/admin/content/daily_tip/new" className="mt-6 inline-block">
              <Button>Create first tip</Button>
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {DAILY_TIP_TRIMESTERS.map((trimester) => {
              const weeksInTrimester = trimester.weeks.filter(
                (week) => query.trim() === "" || filteredWeeks.has(week),
              );
              if (weeksInTrimester.length === 0) return null;

              const isOpen = expandedTrimester === trimester.id;

              return (
                <section key={trimester.id} className="admin-panel overflow-hidden p-0">
                  <button
                    type="button"
                    className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left hover:bg-gray-50/80"
                    onClick={() =>
                      setExpandedTrimester(isOpen ? null : trimester.id)
                    }
                  >
                    <div>
                      <h2 className="text-base font-semibold text-gray-900">
                        {trimester.label}
                      </h2>
                      <p className="text-sm text-gray-500">{trimester.range}</p>
                    </div>
                    <ChevronRight
                      className={`h-5 w-5 shrink-0 text-gray-400 transition-transform ${
                        isOpen ? "rotate-90" : ""
                      }`}
                    />
                  </button>

                  {isOpen ? (
                    <div className="grid gap-3 border-t border-gray-100 p-4 sm:grid-cols-2 lg:grid-cols-3">
                      {weeksInTrimester.map((week) => {
                        const summary = weekSummary.get(week) ?? {
                          total: 0,
                          published: 0,
                          daysFilled: 0,
                        };
                        const weekTips = dailyTipsForWeek(filteredTips, week);
                        const hasTips = summary.total > 0;

                        return (
                          <article
                            key={week}
                            className={`flex flex-col rounded-xl border p-4 transition ${
                              hasTips
                                ? "border-emerald-100 bg-white hover:border-emerald-300 hover:shadow-md"
                                : "border-dashed border-gray-200 bg-gray-50/50"
                            }`}
                          >
                            <button
                              type="button"
                              className="flex w-full items-start justify-between gap-2 text-left"
                              onClick={() => router.push(dailyTipWeekPath(week))}
                            >
                              <div>
                                <h3 className="font-semibold text-gray-900">
                                  Week {week}
                                </h3>
                                <p className="text-xs text-gray-500">
                                  {summary.published} active
                                </p>
                              </div>
                              <ChevronRight className="h-4 w-4 shrink-0 text-gray-400" />
                            </button>

                            <div className="mt-3">
                              <DailyTipWeekProgress
                                daysFilled={summary.daysFilled}
                                size="sm"
                              />
                            </div>

                            {weekTips.length > 0 ? (
                              <ul className="mt-3 space-y-2">
                                {weekTips.slice(0, 3).map((tip) => (
                                  <li key={tip.id}>
                                    <button
                                      type="button"
                                      className="w-full rounded-lg border border-gray-100 bg-gray-50/80 px-2.5 py-2 text-left transition hover:border-emerald-200 hover:bg-emerald-50/40"
                                      onClick={() => router.push(dailyTipPath(tip.id))}
                                    >
                                      <div className="mb-1.5 flex items-center gap-2">
                                        <span className="text-[10px] font-bold uppercase tracking-wide text-gray-500">
                                          Day {tip.day_number}
                                        </span>
                                        <DailyTipStatusBadge
                                          active={tip.is_active}
                                          className="scale-90"
                                        />
                                      </div>
                                      <DailyTipLanguageTitles
                                        tip={tip}
                                        layout="compact"
                                        maxTitleLength={32}
                                      />
                                    </button>
                                  </li>
                                ))}
                                {weekTips.length > 3 ? (
                                  <li>
                                    <button
                                      type="button"
                                      className="text-xs font-medium text-emerald-700 hover:underline"
                                      onClick={() => router.push(dailyTipWeekPath(week))}
                                    >
                                      +{weekTips.length - 3} more
                                    </button>
                                  </li>
                                ) : null}
                              </ul>
                            ) : (
                              <button
                                type="button"
                                className="mt-3 text-xs font-medium text-emerald-700 hover:underline"
                                onClick={() => router.push(dailyTipWeekPath(week))}
                              >
                                Add tips for this week
                              </button>
                            )}
                          </article>
                        );
                      })}
                    </div>
                  ) : null}
                </section>
              );
            })}
          </div>
        )}
      </div>
    </>
  );
}

export default function ContentNamespacePage() {
  const params = useParams<{ namespace: ContentNamespace }>();
  const router = useRouter();
  const namespace = params.namespace;
  const dispatch = useAppDispatch();
  const { items, loading, error } = useAppSelector((state) => state.content);

  useEffect(() => {
    if (namespace && namespace !== "daily_tip") {
      dispatch(fetchContentByNamespace(namespace));
    }
  }, [dispatch, namespace]);

  if (namespace === "daily_tip") {
    return <DailyTipWeeksView />;
  }

  const isKnownNamespace = CONTENT_NAMESPACES.some((item) => item.value === namespace);
  if (!isKnownNamespace) {
    return (
      <>
        <PageHero
          title="Unknown content type"
          description={`"${namespace}" is not managed in this admin portal`}
          icon={FileText}
        />
        <div className="mx-auto max-w-[1200px] px-6 py-8 lg:px-8">
          <Link
            href="/admin/content"
            className="text-sm font-medium text-emerald-600 hover:underline"
          >
            ← Back to content
          </Link>
        </div>
      </>
    );
  }

  const colSpan = namespaceUsesUuidEntityId(namespace) ? 5 : 6;

  return (
    <>
      <PageHero
        title={namespaceLabel(namespace)}
        description={`Namespace: ${namespace}`}
        icon={FileText}
        stat={{ label: "Items", value: items.length }}
      />

      <div className="mx-auto max-w-[1200px] px-6 py-8 lg:px-8">
        <div className="mb-6 flex justify-end">
          <Link href={`/admin/content/${namespace}/new`}>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Add item
            </Button>
          </Link>
        </div>

        {error ? (
          <div className="mb-4 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-600">
            {error}
          </div>
        ) : null}

        <div className="admin-table-wrap">
          <Table>
            <TableHeader>
              <TableRow className="border-b border-white/20 bg-gradient-to-r from-emerald-50/50 to-teal-50/50">
                <TableHead className="font-semibold text-gray-700">Item</TableHead>
                {!namespaceUsesUuidEntityId(namespace) ? (
                  <TableHead className="font-semibold text-gray-700">Entity ID</TableHead>
                ) : null}
                <TableHead className="font-semibold text-gray-700">Version</TableHead>
                <TableHead className="font-semibold text-gray-700">Status</TableHead>
                <TableHead className="font-semibold text-gray-700">Updated</TableHead>
                <TableHead className="text-right font-semibold text-gray-700">
                  Actions
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={colSpan} className="py-8 text-center text-gray-500">
                    Loading content…
                  </TableCell>
                </TableRow>
              ) : items.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={colSpan} className="py-8 text-center text-gray-500">
                    No content items yet.
                  </TableCell>
                </TableRow>
              ) : (
                items.map((item) => (
                  <TableRow
                    key={item.id}
                    className="cursor-pointer hover:bg-emerald-50/60"
                    onClick={() =>
                      router.push(contentEntityPath(namespace, item.entity_id))
                    }
                  >
                    <TableCell className="font-medium text-gray-900">
                      {contentListLabel(namespace, item)}
                    </TableCell>
                    {!namespaceUsesUuidEntityId(namespace) ? (
                      <TableCell className="font-medium text-gray-700">
                        {item.entity_id}
                      </TableCell>
                    ) : null}
                    <TableCell>v{item.version}</TableCell>
                    <TableCell>
                      <span
                        className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${
                          item.is_published
                            ? "bg-emerald-50 text-emerald-700"
                            : "bg-amber-50 text-amber-700"
                        }`}
                      >
                        {item.is_published ? "Published" : "Draft"}
                      </span>
                    </TableCell>
                    <TableCell className="text-gray-600">
                      {formatDateTime(item.updated_at)}
                    </TableCell>
                    <TableCell className="text-right">
                      <Link
                        href={contentEditPath(namespace, item.entity_id)}
                        className="font-medium text-gray-600 hover:text-gray-900 hover:underline"
                        onClick={(e) => e.stopPropagation()}
                      >
                        Edit
                      </Link>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </>
  );
}
