"use client";

import { useEffect, useState, type KeyboardEvent, Fragment } from "react";
import Link from "next/link";
import { ChevronDown, Plus, Stethoscope } from "lucide-react";
import ChildMilestonesTabs from "@/components/childGrowth/ChildMilestonesTabs";
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
import { fetchGrowthClinicalAdvice } from "@/features/growthClinicalAdvice/growthClinicalAdviceSlice";
import {
  growthClinicalCodeLabel,
  growthClinicalConditionLabel,
  growthClinicalMetricLabel,
} from "@/lib/childGrowth/clinicalAdviceLabels";
import type {
  GrowthClinicalAdvice,
  GrowthClinicalAdviceTranslation,
  Locale,
} from "@/lib/types/database";
import { useAdminCanManage } from "@/lib/useAdminPermissions";
import { cn } from "@/lib/utils";

const LOCALE_LABELS: Record<string, string> = {
  en: "English",
  am: "Amharic",
  om: "Oromo",
};

function pickTranslation(
  item: GrowthClinicalAdvice,
  preferred: Locale = "en",
): GrowthClinicalAdviceTranslation | null {
  const rows = item.growth_clinical_advice_translations ?? [];
  if (rows.length === 0) return null;
  return rows.find((row) => row.language_code === preferred) ?? rows[0];
}

function AdviceField({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  const text = value.trim();
  return (
    <div className="min-w-0">
      <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
        {label}
      </p>
      {text ? (
        <p className="mt-1 whitespace-pre-wrap text-sm leading-relaxed text-gray-800">
          {text}
        </p>
      ) : (
        <p className="mt-1 text-sm text-gray-400">Not set</p>
      )}
    </div>
  );
}

export default function GrowthClinicalAdvicePage() {
  const dispatch = useAppDispatch();
  const { items, loading, error } = useAppSelector(
    (state) => state.growthClinicalAdvice,
  );
  const canManageContent = useAdminCanManage("manage_content");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const colSpan = canManageContent ? 7 : 6;

  useEffect(() => {
    dispatch(fetchGrowthClinicalAdvice());
  }, [dispatch]);

  function toggleRow(id: string) {
    setExpandedId((current) => (current === id ? null : id));
  }

  function onRowKeyDown(event: KeyboardEvent<HTMLTableRowElement>, id: string) {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      toggleRow(id);
    }
  }

  return (
    <>
      <PageHero
        title="Growth interpretation"
        description="Parent-facing clinical advice when a growth Z-score is low, high, rapid, or faltering. Click a row to read the full copy."
        icon={Stethoscope}
        stat={{ label: "Rules", value: items.length }}
        actions={
          canManageContent ? (
            <Link href="/admin/child-growth/clinical-advice/new">
              <Button type="button" className="gap-2">
                <Plus className="h-4 w-4" aria-hidden />
                Add interpretation
              </Button>
            </Link>
          ) : null
        }
      />

      <ChildMilestonesTabs />

      <div className="admin-page">
        {error ? (
          <div className="mb-4 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-600">
            {error}
          </div>
        ) : null}

        <div className="admin-table-wrap">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-8" />
                <TableHead>Interpretation</TableHead>
                <TableHead>Metric</TableHead>
                <TableHead>Condition</TableHead>
                <TableHead>Age (months)</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Languages</TableHead>
                {canManageContent ? (
                  <TableHead className="text-right">Actions</TableHead>
                ) : null}
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell
                    colSpan={colSpan + 1}
                    className="py-10 text-center text-gray-500"
                  >
                    Loading clinical advice…
                  </TableCell>
                </TableRow>
              ) : items.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={colSpan + 1}
                    className="py-10 text-center text-gray-500"
                  >
                    No clinical advice rows found. Seed growth_clinical_advice first.
                  </TableCell>
                </TableRow>
              ) : (
                items.map((item) => {
                  const locales =
                    item.growth_clinical_advice_translations?.map(
                      (row) => row.language_code,
                    ) ?? [];
                  const title = growthClinicalCodeLabel(
                    item.code,
                    item.metric,
                    item.condition,
                  );
                  const isExpanded = expandedId === item.id;
                  const translation = pickTranslation(item);

                  return (
                    <Fragment key={item.id}>
                      <TableRow
                        role="button"
                        tabIndex={0}
                        aria-expanded={isExpanded}
                        onClick={() => toggleRow(item.id)}
                        onKeyDown={(event) => onRowKeyDown(event, item.id)}
                        className={cn(
                          "cursor-pointer transition-colors hover:bg-emerald-50/60",
                          isExpanded && "bg-emerald-50/40",
                        )}
                      >
                        <TableCell className="w-8 pr-0">
                          <ChevronDown
                            className={cn(
                              "h-4 w-4 text-gray-400 transition-transform",
                              isExpanded && "rotate-180 text-emerald-700",
                            )}
                            aria-hidden
                          />
                        </TableCell>
                        <TableCell>
                          <div className="font-medium text-gray-900">{title}</div>
                          <p className="mt-0.5 font-mono text-[11px] text-gray-400">
                            {item.code}
                          </p>
                        </TableCell>
                        <TableCell>
                          {growthClinicalMetricLabel(item.metric)}
                        </TableCell>
                        <TableCell>
                          {growthClinicalConditionLabel(item.condition)}
                        </TableCell>
                        <TableCell className="tabular-nums">
                          {item.min_age_months}–{item.max_age_months}
                        </TableCell>
                        <TableCell>
                          <span
                            className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${
                              item.is_active
                                ? "bg-emerald-100 text-emerald-800"
                                : "bg-gray-100 text-gray-600"
                            }`}
                          >
                            {item.is_active ? "Active" : "Inactive"}
                          </span>
                        </TableCell>
                        <TableCell className="text-sm uppercase text-gray-600">
                          {locales.length > 0 ? locales.join(", ") : "—"}
                        </TableCell>
                        {canManageContent ? (
                          <TableCell
                            className="text-right"
                            onClick={(event) => event.stopPropagation()}
                            onKeyDown={(event) => event.stopPropagation()}
                          >
                            <Link
                              href={`/admin/child-growth/clinical-advice/${item.id}/edit`}
                            >
                              <Button type="button" variant="outline" size="sm">
                                Edit
                              </Button>
                            </Link>
                          </TableCell>
                        ) : null}
                      </TableRow>
                      {isExpanded ? (
                        <TableRow className="hover:bg-transparent">
                          <TableCell
                            colSpan={colSpan + 1}
                            className="border-t-0 bg-gray-50/80 px-6 py-4"
                          >
                            {translation ? (
                              <div className="space-y-4">
                                <p className="text-xs text-gray-500">
                                  Showing{" "}
                                  {LOCALE_LABELS[translation.language_code] ??
                                    translation.language_code}{" "}
                                  parent copy
                                </p>
                                <div className="grid gap-5 md:grid-cols-3">
                                  <AdviceField
                                    label="Explanation"
                                    value={translation.explain_text}
                                  />
                                  <AdviceField
                                    label="Causes"
                                    value={translation.causes}
                                  />
                                  <AdviceField
                                    label="Recommendations"
                                    value={translation.recommendations}
                                  />
                                </div>
                              </div>
                            ) : (
                              <p className="text-sm text-gray-500">
                                No translations yet for this rule.
                              </p>
                            )}
                          </TableCell>
                        </TableRow>
                      ) : null}
                    </Fragment>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </>
  );
}
