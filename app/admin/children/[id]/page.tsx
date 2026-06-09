"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, type ReactNode } from "react";
import { Baby, Flag, User } from "lucide-react";
import PageHero from "@/components/PageHero";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useAppDispatch, useAppSelector } from "@/app/store/hooks";
import {
  childrenActions,
  fetchChildDetail,
} from "@/features/children/childrenSlice";
import {
  childAgeLabel,
  childDisplayName,
  formatMilestoneType,
} from "@/lib/children/childUi";
import { formatDate, formatDateTime } from "@/lib/format";

function MetaItem({
  label,
  value,
}: {
  label: string;
  value: ReactNode;
}) {
  return (
    <div className="rounded-lg border border-gray-100 bg-gray-50/80 px-3 py-2.5">
      <p className="text-[10px] font-bold uppercase tracking-wide text-gray-500">
        {label}
      </p>
      <p className="mt-1 text-sm font-medium text-gray-900">{value}</p>
    </div>
  );
}

export default function ChildDetailPage() {
  const params = useParams<{ id: string }>();
  const childId = params.id;
  const dispatch = useAppDispatch();
  const { selected, detailLoading, error } = useAppSelector(
    (state) => state.children,
  );

  useEffect(() => {
    if (!childId) return;
    dispatch(fetchChildDetail(childId));
    return () => {
      dispatch(childrenActions.clearChildDetail());
    };
  }, [childId, dispatch]);

  const child = selected?.child;
  const milestones = selected?.milestones ?? [];
  const achievedCount = milestones.filter((m) => m.achieved_date).length;

  return (
    <>
      <PageHero
        title={child ? childDisplayName(child) : "Child"}
        description={
          child
            ? `${child.gender === "female" ? "Girl" : "Boy"} · ${childAgeLabel(child.birth_date)}`
            : "Birth record and milestone progress"
        }
        icon={Baby}
        stat={
          child
            ? { label: "Milestones achieved", value: achievedCount }
            : undefined
        }
      />

      <div className="mx-auto max-w-[1200px] px-6 py-8 lg:px-8">
        <div className="mb-6 flex flex-wrap items-center gap-4">
          <Link
            href="/admin/children"
            className="text-sm font-medium text-emerald-600 hover:underline"
          >
            ← All children
          </Link>
          {child ? (
            <Link
              href={`/admin/users/${child.user_id}`}
              className="inline-flex items-center gap-1.5 text-sm font-medium text-gray-600 hover:text-gray-900"
            >
              <User className="h-4 w-4" />
              View mother
            </Link>
          ) : null}
        </div>

        {error ? (
          <div className="mb-4 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-600">
            {error}
          </div>
        ) : null}

        {detailLoading || !child ? (
          <div className="admin-panel py-12 text-center text-sm text-gray-500">
            Loading child…
          </div>
        ) : (
          <div className="space-y-8">
            <section className="admin-panel">
              <h2 className="admin-section-title mb-4">Birth record</h2>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <MetaItem label="Birth date" value={formatDate(child.birth_date)} />
                <MetaItem label="Age" value={childAgeLabel(child.birth_date)} />
                <MetaItem
                  label="Birth weight"
                  value={
                    child.birth_weight != null ? `${child.birth_weight} kg` : "-"
                  }
                />
                <MetaItem
                  label="Birth height"
                  value={
                    child.birth_height != null ? `${child.birth_height} cm` : "-"
                  }
                />
                <MetaItem
                  label="Delivery"
                  value={child.delivery_type || "-"}
                />
                <MetaItem
                  label="Active in app"
                  value={child.is_active ? "Yes" : "No"}
                />
                <MetaItem
                  label="Pregnancy"
                  value={
                    child.pregnancy_id ? (
                      <span className="font-mono text-xs">
                        {child.pregnancy_id.slice(0, 8)}…
                      </span>
                    ) : (
                      "-"
                    )
                  }
                />
                <MetaItem
                  label="Local ID"
                  value={child.local_id || "-"}
                />
              </div>
              <p className="mt-4 text-xs text-gray-500">
                Updated {formatDateTime(child.updated_at)}
              </p>
            </section>

            <section>
              <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                <h2 className="admin-section-title flex items-center gap-2">
                  <Flag className="h-5 w-5 text-violet-600" />
                  Milestone progress ({milestones.length})
                </h2>
                <Link
                  href="/admin/content/milestone"
                  className="text-sm font-medium text-emerald-700 hover:underline"
                >
                  Edit milestone content →
                </Link>
              </div>

              {milestones.length === 0 ? (
                <div className="admin-panel py-8 text-center text-sm text-gray-500">
                  No milestones recorded yet for this child.
                </div>
              ) : (
                <div className="admin-table-wrap">
                  <Table>
                    <TableHeader>
                      <TableRow className="border-b border-white/20 bg-gradient-to-r from-violet-50/50 to-purple-50/50">
                        <TableHead>Milestone</TableHead>
                        <TableHead>Type key</TableHead>
                        <TableHead>Achieved</TableHead>
                        <TableHead>Notes</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {milestones.map((row) => (
                        <TableRow key={row.id}>
                          <TableCell className="font-medium text-gray-900">
                            {formatMilestoneType(row.milestone_type)}
                          </TableCell>
                          <TableCell className="font-mono text-xs text-gray-500">
                            {row.milestone_type}
                          </TableCell>
                          <TableCell>
                            {row.achieved_date ? (
                              <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-medium text-emerald-800">
                                {formatDate(row.achieved_date)}
                              </span>
                            ) : (
                              <span className="text-xs text-gray-400">Not dated</span>
                            )}
                          </TableCell>
                          <TableCell className="text-sm text-gray-600">
                            {row.notes || "-"}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </section>
          </div>
        )}
      </div>
    </>
  );
}
