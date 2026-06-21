"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Baby, ChevronRight, Search } from "lucide-react";
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
import { fetchChildren } from "@/features/children/childrenSlice";
import {
  childAgeLabel,
  childDisplayName,
  childMatchesSearch,
} from "@/lib/children/childUi";
import { formatDate } from "@/lib/format";

function GenderBadge({ gender }: { gender: "male" | "female" }) {
  const styles =
    gender === "female"
      ? "bg-pink-100 text-pink-800"
      : "bg-sky-100 text-sky-800";
  return (
    <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${styles}`}>
      {gender}
    </span>
  );
}

export default function ChildrenPage() {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const { children, loading, error } = useAppSelector((state) => state.children);
  const [query, setQuery] = useState("");

  useEffect(() => {
    dispatch(fetchChildren());
  }, [dispatch]);

  const filtered = useMemo(
    () => children.filter((child) => childMatchesSearch(child, query)),
    [children, query],
  );

  const stats = useMemo(() => {
    const active = children.filter((c) => c.is_active).length;
    const linked = children.filter((c) => c.pregnancy_id).length;
    return { total: children.length, active, linked };
  }, [children]);

  return (
    <>
      <PageHero
        title="Children"
        description="Birth records linked to mothers and pregnancies. Milestone progress is tracked per child"
        icon={Baby}
        stat={{ label: "Active profiles", value: stats.active }}
      />

      <div className="mx-auto max-w-[1200px] px-6 py-8 lg:px-8">
        <div className="mb-6 grid gap-3 sm:grid-cols-3">
          <div className="rounded-xl border border-emerald-100 bg-emerald-50/50 px-4 py-3">
            <p className="text-xs font-medium uppercase tracking-wide text-emerald-700">
              Total children
            </p>
            <p className="mt-1 text-2xl font-bold text-gray-900">{stats.total}</p>
          </div>
          <div className="rounded-xl border border-teal-100 bg-teal-50/50 px-4 py-3">
            <p className="text-xs font-medium uppercase tracking-wide text-teal-700">
              Active in app
            </p>
            <p className="mt-1 text-2xl font-bold text-gray-900">{stats.active}</p>
          </div>
          <div className="rounded-xl border border-cyan-100 bg-cyan-50/50 px-4 py-3">
            <p className="text-xs font-medium uppercase tracking-wide text-cyan-700">
              Linked to pregnancy
            </p>
            <p className="mt-1 text-2xl font-bold text-gray-900">{stats.linked}</p>
          </div>
        </div>

        <div className="mb-6">
          <div className="relative w-full sm:max-w-md">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search name, mother, gender, delivery…"
              className="w-full rounded-[var(--radius)] border border-gray-200 bg-white py-2.5 pl-10 pr-4 text-sm shadow-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-200/50"
            />
          </div>
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
                <TableHead className="font-semibold text-gray-700">Child</TableHead>
                <TableHead className="font-semibold text-gray-700">Mother</TableHead>
                <TableHead className="font-semibold text-gray-700">Age</TableHead>
                <TableHead className="font-semibold text-gray-700">Birth</TableHead>
                <TableHead className="font-semibold text-gray-700">Weight / height</TableHead>
                <TableHead className="font-semibold text-gray-700">Delivery</TableHead>
                <TableHead className="font-semibold text-gray-700">Active</TableHead>
                <TableHead className="w-10" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={8} className="py-8 text-center text-gray-500">
                    Loading children…
                  </TableCell>
                </TableRow>
              ) : filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="py-8 text-center text-gray-500">
                    {children.length === 0
                      ? "No children found."
                      : "No children match your search."}
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((child) => (
                  <TableRow
                    key={child.id}
                    className="cursor-pointer hover:bg-emerald-50/30"
                    onClick={() => router.push(`/admin/children/${child.id}`)}
                  >
                    <TableCell>
                      <div className="font-medium text-gray-900">
                        {childDisplayName(child)}
                      </div>
                      <div className="mt-1">
                        <GenderBadge gender={child.gender} />
                      </div>
                    </TableCell>
                    <TableCell>
                      {child.profiles?.full_name ? (
                        <Link
                          href={`/admin/users/${child.user_id}`}
                          className="font-medium text-emerald-700 hover:underline"
                          onClick={(e) => e.stopPropagation()}
                        >
                          {child.profiles.full_name}
                        </Link>
                      ) : (
                        <span className="text-sm text-gray-500">Unknown mother</span>
                      )}
                      {child.profiles?.phone ? (
                        <p className="text-xs text-gray-500">{child.profiles.phone}</p>
                      ) : null}
                    </TableCell>
                    <TableCell className="text-sm text-gray-700">
                      {childAgeLabel(child.birth_date)}
                    </TableCell>
                    <TableCell className="text-sm text-gray-700">
                      {formatDate(child.birth_date)}
                    </TableCell>
                    <TableCell className="text-sm text-gray-600">
                      {child.birth_weight != null ? `${child.birth_weight} kg` : "-"}
                      <span className="mx-1 text-gray-300">·</span>
                      {child.birth_height != null ? `${child.birth_height} cm` : "-"}
                    </TableCell>
                    <TableCell className="text-sm capitalize text-gray-600">
                      {child.delivery_type || "-"}
                    </TableCell>
                    <TableCell>
                      {child.is_active ? (
                        <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-medium text-emerald-800">
                          Active
                        </span>
                      ) : (
                        <span className="text-xs text-gray-400">No</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <ChevronRight className="h-4 w-4 text-gray-400" />
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        <p className="mt-4 text-xs text-gray-500">
          Milestone checklist content is managed under{" "}
          <Link href="/admin/child-growth" className="text-emerald-700 hover:underline">
            Content → Child milestones
          </Link>
          . Per-child progress appears on each child&apos;s detail page.
        </p>
      </div>
    </>
  );
}
