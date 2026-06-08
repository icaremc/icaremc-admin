"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useMemo } from "react";
import { FileText, Plus } from "lucide-react";
import PageHero from "@/components/PageHero";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useAppDispatch, useAppSelector } from "@/app/store/hooks";
import { fetchDailyTips } from "@/features/dailyTips/dailyTipsSlice";
import { fetchContentByNamespace } from "@/features/content/contentSlice";
import { CONTENT_NAMESPACES, namespaceLabel, PREGNANCY_WEEK_NUMBERS } from "@/lib/constants";
import {
  contentEditPath,
  contentEntityPath,
  contentListLabel,
  dailyTipWeekPath,
  summarizeDailyTipsByWeek,
} from "@/lib/content/contentLabels";
import { namespaceUsesUuidEntityId } from "@/lib/content/entityId";
import { formatDateTime } from "@/lib/format";
import type { ContentNamespace } from "@/lib/types/database";

function DailyTipWeeksView() {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const { tips, loading, error } = useAppSelector((state) => state.dailyTips);

  useEffect(() => {
    dispatch(fetchDailyTips());
  }, [dispatch]);

  const weekSummary = useMemo(() => summarizeDailyTipsByWeek(tips), [tips]);
  const weeksWithTips = weekSummary.size;
  const totalTips = tips.length;

  return (
    <>
      <PageHero
        title="Daily tips"
        description="Tips grouped by pregnancy week — open a week to view and edit its tip pool"
        icon={FileText}
        stat={{ label: "Weeks with tips", value: weeksWithTips }}
      />

      <div className="mx-auto max-w-[1200px] px-6 py-8 lg:px-8">
        <div className="mb-6 flex justify-end">
          <Link href="/admin/content/daily_tip/new">
            <Button>
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

        <div className="admin-table-wrap">
          <Table>
            <TableHeader>
              <TableRow className="border-b border-white/20 bg-gradient-to-r from-emerald-50/50 to-teal-50/50">
                <TableHead className="font-semibold text-gray-700">Week</TableHead>
                <TableHead className="font-semibold text-gray-700">Days filled</TableHead>
                <TableHead className="font-semibold text-gray-700">Published</TableHead>
                <TableHead className="text-right font-semibold text-gray-700">
                  Actions
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={4} className="py-8 text-center text-gray-500">
                    Loading weeks…
                  </TableCell>
                </TableRow>
              ) : (
                PREGNANCY_WEEK_NUMBERS.map((week) => {
                  const summary = weekSummary.get(week) ?? {
                    total: 0,
                    published: 0,
                    daysFilled: 0,
                  };

                  return (
                    <TableRow
                      key={week}
                      className="cursor-pointer hover:bg-emerald-50/60"
                      onClick={() => router.push(dailyTipWeekPath(week))}
                    >
                      <TableCell className="font-medium text-gray-900">
                        Week {week}
                      </TableCell>
                      <TableCell className="text-gray-700">
                        {summary.daysFilled}/7
                      </TableCell>
                      <TableCell className="text-gray-700">{summary.published}</TableCell>
                      <TableCell className="text-right">
                        <Link
                          href={dailyTipWeekPath(week)}
                          className="font-medium text-gray-600 hover:text-gray-900 hover:underline"
                          onClick={(e) => e.stopPropagation()}
                        >
                          {summary.total > 0 ? "View tips" : "Add tips"}
                        </Link>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>

        {!loading ? (
          <p className="mt-4 text-sm text-gray-500">
            {totalTips} tip{totalTips === 1 ? "" : "s"} across {weeksWithTips} week
            {weeksWithTips === 1 ? "" : "s"}
          </p>
        ) : null}
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
