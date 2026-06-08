"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect } from "react";
import { FileText, Pencil } from "lucide-react";
import ContentTranslationDetailView from "@/components/content/ContentTranslationDetailView";
import PageHero from "@/components/PageHero";
import { Button } from "@/components/ui/button";
import { useAppDispatch, useAppSelector } from "@/app/store/hooks";
import {
  contentActions,
  fetchContentItem,
} from "@/features/content/contentSlice";
import { namespaceLabel } from "@/lib/constants";
import {
  contentEditPath,
  contentHeroTitle,
} from "@/lib/content/contentLabels";
import { formatDateTime } from "@/lib/format";
import type { ContentNamespace } from "@/lib/types/database";
import DailyTipDetailPage from "./DailyTipDetailPage";

export default function ContentDetailPage() {
  const params = useParams<{ namespace: ContentNamespace; entityId: string }>();
  const namespace = params.namespace;

  if (namespace === "daily_tip") {
    return <DailyTipDetailPage />;
  }
  const entityId = decodeURIComponent(params.entityId);
  const dispatch = useAppDispatch();
  const { selected, loading, error } = useAppSelector((state) => state.content);

  useEffect(() => {
    dispatch(contentActions.clearContentMessages());
    dispatch(fetchContentItem({ namespace, entityId }));
  }, [dispatch, namespace, entityId]);

  const heroTitle = selected
    ? contentHeroTitle(namespace, selected)
    : entityId;

  return (
    <>
      <PageHero
        title={heroTitle}
        description={
          selected
            ? `${namespaceLabel(namespace)} · Updated ${formatDateTime(selected.updated_at)}`
            : `${namespaceLabel(namespace)} · ${namespace}`
        }
        icon={FileText}
        stat={
          selected
            ? {
                label: "Version",
                value: `v${selected.version}`,
              }
            : undefined
        }
      />

      <div className="mx-auto max-w-4xl px-6 py-8 lg:px-8">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <Link
            href={`/admin/content/${namespace}`}
            className="text-sm font-medium text-emerald-600 hover:underline"
          >
            ← Back to list
          </Link>
          {!loading && selected ? (
            <Link href={contentEditPath(namespace, entityId)}>
              <Button>
                <Pencil className="mr-2 h-4 w-4" />
                Edit item
              </Button>
            </Link>
          ) : null}
        </div>

        {error ? (
          <div className="mb-4 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-600">
            {error}
          </div>
        ) : null}

        {loading ? (
          <p className="text-sm text-gray-600">Loading content…</p>
        ) : selected ? (
          <ContentTranslationDetailView namespace={namespace} item={selected} />
        ) : null}
      </div>
    </>
  );
}
