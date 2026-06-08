"use client";

import { useEffect } from "react";
import { Baby } from "lucide-react";
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
import { fetchChildProfiles } from "@/features/children/childrenSlice";
import { formatDate } from "@/lib/format";

export default function ChildrenPage() {
  const dispatch = useAppDispatch();
  const { children, loading, error } = useAppSelector((state) => state.children);

  useEffect(() => {
    dispatch(fetchChildProfiles());
  }, [dispatch]);

  return (
    <>
      <PageHero
        title="Child profiles"
        description="Baby birth date and sex records"
        icon={Baby}
        stat={{ label: "Total", value: children.length }}
      />

      <div className="mx-auto max-w-[1200px] px-6 py-8 lg:px-8">
        {error ? (
          <div className="mb-4 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-600">
            {error}
          </div>
        ) : null}

        <div className="admin-table-wrap">
          <Table>
            <TableHeader>
              <TableRow className="border-b border-white/20 bg-gradient-to-r from-emerald-50/50 to-teal-50/50">
                <TableHead className="font-semibold text-gray-700">User ID</TableHead>
                <TableHead className="font-semibold text-gray-700">Birth date</TableHead>
                <TableHead className="font-semibold text-gray-700">Sex</TableHead>
                <TableHead className="font-semibold text-gray-700">Updated</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={4} className="py-8 text-center text-gray-500">
                    Loading child profiles…
                  </TableCell>
                </TableRow>
              ) : children.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="py-8 text-center text-gray-500">
                    No child profiles found.
                  </TableCell>
                </TableRow>
              ) : (
                children.map((child) => (
                  <TableRow key={child.id}>
                    <TableCell className="font-mono text-xs text-gray-600">
                      {child.user_id.slice(0, 8)}…
                    </TableCell>
                    <TableCell>{formatDate(child.birth_date)}</TableCell>
                    <TableCell className="capitalize">{child.sex}</TableCell>
                    <TableCell className="text-gray-600">
                      {formatDate(child.updated_at)}
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
