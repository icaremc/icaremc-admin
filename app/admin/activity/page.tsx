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
import { fetchActivityLogs } from "@/features/activity/activityLogsSlice";
import { ACTIVITY_EVENT_LABELS } from "@/lib/activity/events";
import { adminRoleLabel } from "@/lib/adminRoles";
import { formatDateTime } from "@/lib/format";

const SOURCE_OPTIONS = [
  { value: "all", label: "All activity" },
  { value: "admin", label: "Admin portal" },
  { value: "platform", label: "Mobile app" },
] as const;

const ACTOR_TYPE_OPTIONS = [
  { value: "", label: "All users" },
  { value: "mother", label: "Parents" },
  { value: "doctor", label: "Doctors" },
  { value: "admin", label: "Admins" },
];

export default function ActivityLogPage() {
  const dispatch = useAppDispatch();
  const { logs, loading, error, source, eventType, actorType } = useAppSelector(
    (state) => state.activityLogs,
  );

  useEffect(() => {
    dispatch(
      fetchActivityLogs({
        source,
        event_type: eventType || undefined,
        actor_type: actorType || undefined,
      }),
    );
  }, [dispatch, source, eventType, actorType]);

  const applyFilters = (next: {
    source?: "all" | "admin" | "platform";
    event_type?: string;
    actor_type?: string;
  }) => {
    dispatch(
      fetchActivityLogs({
        source: next.source ?? source,
        event_type:
          next.event_type !== undefined ? next.event_type : eventType || undefined,
        actor_type:
          next.actor_type !== undefined ? next.actor_type : actorType || undefined,
      }),
    );
  };

  return (
    <>
      <PageHero
        title="Activity log"
        description="Admin portal actions and mobile app events — logins, appointments, and more"
        icon={Activity}
        stat={{ label: "Recent events", value: logs.length }}
      />

      <div className="mx-auto max-w-[1400px] px-6 py-8 lg:px-8">
        <div className="mb-6 flex flex-wrap items-end gap-4">
          <div className="space-y-1">
            <label className="text-xs font-medium text-gray-600">Source</label>
            <select
              value={source}
              onChange={(e) =>
                applyFilters({
                  source: e.target.value as "all" | "admin" | "platform",
                })
              }
              className="flex h-10 rounded-[var(--radius)] border border-gray-200 bg-white px-3 text-sm"
            >
              {SOURCE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-medium text-gray-600">User type</label>
            <select
              value={actorType}
              onChange={(e) => applyFilters({ actor_type: e.target.value })}
              disabled={source === "admin"}
              className="flex h-10 rounded-[var(--radius)] border border-gray-200 bg-white px-3 text-sm disabled:opacity-50"
            >
              {ACTOR_TYPE_OPTIONS.map((option) => (
                <option key={option.value || "all"} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-medium text-gray-600">Event</label>
            <select
              value={eventType}
              onChange={(e) => applyFilters({ event_type: e.target.value })}
              className="flex h-10 min-w-[200px] rounded-[var(--radius)] border border-gray-200 bg-white px-3 text-sm"
            >
              <option value="">All events</option>
              {Object.entries(ACTIVITY_EVENT_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {loading ? (
          <div className="mb-4 flex items-center gap-2 text-sm text-gray-600">
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-emerald-600 border-t-transparent" />
            Loading activity…
          </div>
        ) : null}

        {error ? (
          <div className="mb-4 rounded-[var(--radius)] border border-red-200 bg-red-50 p-4 text-sm text-red-600">
            {error}
          </div>
        ) : null}

        <div className="admin-table-wrap">
          <Table>
            <TableHeader>
              <TableRow className="border-b border-gray-200 bg-gray-50">
                <TableHead className="font-semibold text-gray-700">When</TableHead>
                <TableHead className="font-semibold text-gray-700">Source</TableHead>
                <TableHead className="font-semibold text-gray-700">Event</TableHead>
                <TableHead className="font-semibold text-gray-700">Actor</TableHead>
                <TableHead className="font-semibold text-gray-700">Resource</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {logs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="py-10 text-center text-gray-500">
                    No activity recorded yet. Events appear here after admins sign
                    in, change appointments, or mobile users log activity.
                  </TableCell>
                </TableRow>
              ) : (
                logs.map((log) => (
                  <TableRow key={`${log.source}-${log.id}`}>
                    <TableCell className="whitespace-nowrap text-gray-600">
                      {formatDateTime(log.created_at)}
                    </TableCell>
                    <TableCell>
                      <span
                        className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                          log.source === "admin"
                            ? "bg-violet-50 text-violet-700"
                            : "bg-sky-50 text-sky-700"
                        }`}
                      >
                        {log.source === "admin" ? "Portal" : "Mobile"}
                      </span>
                    </TableCell>
                    <TableCell>
                      <p className="font-medium text-gray-900">{log.event_label}</p>
                      <p className="text-xs text-gray-500">{log.event_type}</p>
                    </TableCell>
                    <TableCell>
                      <p className="text-gray-900">
                        {log.actor_name || log.actor_email || "—"}
                      </p>
                      <p className="text-xs text-gray-500">
                        {log.actor_type === "admin" && log.actor_role
                          ? adminRoleLabel(log.actor_role)
                          : log.actor_type ?? "—"}
                      </p>
                    </TableCell>
                    <TableCell className="text-sm text-gray-600">
                      {log.resource_type ? (
                        <>
                          {log.resource_type}
                          {log.resource_id ? (
                            <span className="block truncate text-xs text-gray-400">
                              {log.resource_id}
                            </span>
                          ) : null}
                        </>
                      ) : (
                        "—"
                      )}
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
