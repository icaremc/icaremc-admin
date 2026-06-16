"use client";

import { useEffect } from "react";
import Link from "next/link";
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
import { formatDateTime, truncate } from "@/lib/format";

export default function PregnancyLogsPage() {
  const dispatch = useAppDispatch();
  const weekly = useAppSelector((state) => state.pregnancyLogs);

  useEffect(() => {
    dispatch(fetchPregnancyLogs());
  }, [dispatch]);

  return (
    <>
      <PageHero
        title="Weekly health logs"
        description="Weekly weight, height, vitals, and symptoms per gestational week (1-40)"
        icon={Activity}
        stat={{
          label: "Weekly logs",
          value: weekly.logs.length,
        }}
      />

      <div className="mx-auto max-w-[1200px] space-y-8 px-6 py-8 lg:px-8">
        {weekly.error ? (
          <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-600">
            {weekly.error}
          </div>
        ) : null}

        <section>
          <div className="admin-table-wrap">
            <Table>
              <TableHeader>
                <TableRow className="border-b border-white/20 bg-gradient-to-r from-emerald-50/50 to-teal-50/50">
                  <TableHead className="font-semibold text-gray-700">Week</TableHead>
                  <TableHead className="font-semibold text-gray-700">Mother</TableHead>
                  <TableHead className="font-semibold text-gray-700">Weight</TableHead>
                  <TableHead className="font-semibold text-gray-700">Height</TableHead>
                  <TableHead className="font-semibold text-gray-700">Blood pressure</TableHead>
                  <TableHead className="font-semibold text-gray-700">Temp</TableHead>
                  <TableHead className="font-semibold text-gray-700">Symptoms</TableHead>
                  <TableHead className="font-semibold text-gray-700">Notes</TableHead>
                  <TableHead className="font-semibold text-gray-700">Updated</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {weekly.loading ? (
                  <TableRow>
                    <TableCell colSpan={9} className="py-8 text-center text-gray-500">
                      Loading weekly logs…
                    </TableCell>
                  </TableRow>
                ) : weekly.logs.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="py-8 text-center text-gray-500">
                      No weekly pregnancy logs found.
                    </TableCell>
                  </TableRow>
                ) : (
                  weekly.logs.map((log) => {
                    const userId = log.pregnancies?.user_id;
                    const motherName =
                      log.pregnancies?.profiles?.full_name ?? null;

                    return (
                      <TableRow key={log.id}>
                        <TableCell>Week {log.week_number}</TableCell>
                        <TableCell>
                          {userId ? (
                            <Link
                              href={`/admin/users/${userId}`}
                              className="text-emerald-700 hover:underline"
                            >
                              {motherName || "Unknown mother"}
                            </Link>
                          ) : (
                            "-"
                          )}
                        </TableCell>
                        <TableCell>
                          {log.weight != null ? `${log.weight} kg` : "-"}
                        </TableCell>
                        <TableCell>
                          {log.height != null ? `${log.height} cm` : "-"}
                        </TableCell>
                        <TableCell>
                          {log.blood_pressure_systolic != null
                            ? `${log.blood_pressure_systolic}/${log.blood_pressure_diastolic ?? "-"}`
                            : "-"}
                        </TableCell>
                        <TableCell>
                          {log.temperature != null ? `${log.temperature} °C` : "-"}
                        </TableCell>
                        <TableCell>
                          {log.symptoms.length ? log.symptoms.join(", ") : "-"}
                        </TableCell>
                        <TableCell className="text-gray-600">
                          {truncate(log.notes ?? "", 60)}
                        </TableCell>
                        <TableCell className="text-xs text-gray-500">
                          {formatDateTime(log.updated_at)}
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </section>
      </div>
    </>
  );
}
