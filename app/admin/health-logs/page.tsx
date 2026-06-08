"use client";

import { useEffect } from "react";
import { Activity } from "lucide-react";
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
import { fetchPregnancyLogs } from "@/features/pregnancyLogs/pregnancyLogsSlice";
import { formatDate, truncate } from "@/lib/format";

export default function PregnancyLogsPage() {
  const dispatch = useAppDispatch();
  const { logs, loading, error } = useAppSelector(
    (state) => state.pregnancyLogs,
  );

  useEffect(() => {
    dispatch(fetchPregnancyLogs());
  }, [dispatch]);

  return (
    <>
      <PageHero
        title="Pregnancy logs"
        description="Daily logs linked to mother UUID and optional pregnancy week"
        icon={Activity}
        stat={{ label: "Recent logs", value: logs.length }}
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
                <TableHead className="font-semibold text-gray-700">Date</TableHead>
                <TableHead className="font-semibold text-gray-700">Mother ID</TableHead>
                <TableHead className="font-semibold text-gray-700">Week</TableHead>
                <TableHead className="font-semibold text-gray-700">Mood</TableHead>
                <TableHead className="font-semibold text-gray-700">Symptoms</TableHead>
                <TableHead className="font-semibold text-gray-700">Notes</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={6} className="py-8 text-center text-gray-500">
                    Loading pregnancy logs…
                  </TableCell>
                </TableRow>
              ) : logs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="py-8 text-center text-gray-500">
                    No pregnancy logs found.
                  </TableCell>
                </TableRow>
              ) : (
                logs.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell>{formatDate(log.log_date)}</TableCell>
                    <TableCell className="font-mono text-xs text-gray-600">
                      {log.mother_id.slice(0, 8)}…
                    </TableCell>
                    <TableCell>
                      {log.pregnancy_weeks?.week_number
                        ? `Week ${log.pregnancy_weeks.week_number}`
                        : "—"}
                    </TableCell>
                    <TableCell>{log.mood || "—"}</TableCell>
                    <TableCell>
                      {log.symptoms.length ? log.symptoms.join(", ") : "—"}
                    </TableCell>
                    <TableCell className="text-gray-600">
                      {truncate(log.notes ?? JSON.stringify(log.checklist), 60)}
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
