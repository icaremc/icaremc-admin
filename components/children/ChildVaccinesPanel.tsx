"use client";

import { useMemo } from "react";
import { Syringe } from "lucide-react";
import { childAgeInMonths } from "@/lib/children/childUi";
import { formatDate } from "@/lib/format";
import type {
  Child,
  ChildVaccineRecord,
  VaccineDoseSchedule,
} from "@/lib/types/database";
import { cn } from "@/lib/utils";

type ChildVaccinesPanelProps = {
  child: Child;
  records: ChildVaccineRecord[];
  schedule: VaccineDoseSchedule[];
};

function normalizeKey(value: string) {
  return value.trim().toLowerCase().replace(/[\s-]+/g, "_");
}

function findRecord(
  records: ChildVaccineRecord[],
  code: string,
  displayName: string,
): ChildVaccineRecord | undefined {
  const codeKey = normalizeKey(code);
  const nameKey = normalizeKey(displayName);
  return records.find((row) => {
    const vaccineKey = normalizeKey(row.vaccine_key);
    const vaccineName = normalizeKey(row.vaccine_name);
    return (
      vaccineKey === codeKey ||
      vaccineKey.endsWith(`_${codeKey}`) ||
      vaccineKey.includes(codeKey) ||
      vaccineName === nameKey ||
      vaccineName.includes(nameKey)
    );
  });
}

function daysBetween(birthDate: string, asOf = new Date()) {
  const birth = new Date(`${birthDate}T00:00:00`);
  return Math.floor(
    (asOf.getTime() - birth.getTime()) / (1000 * 60 * 60 * 24),
  );
}

export default function ChildVaccinesPanel({
  child,
  records,
  schedule,
}: ChildVaccinesPanelProps) {
  const ageDays = daysBetween(child.birth_date);
  const ageMonths = childAgeInMonths(child.birth_date);

  const rows = useMemo(() => {
    if (schedule.length === 0) {
      return [...records]
        .sort((a, b) => (a.age_months ?? 0) - (b.age_months ?? 0))
        .map((record) => ({
          id: record.id,
          code: record.vaccine_key,
          name: record.vaccine_name,
          ageMonths: record.age_months,
          received: record.received,
          dateReceived: record.date_received,
          status: record.received
            ? ("given" as const)
            : ("not_given" as const),
        }));
    }

    const usedRecordIds = new Set<string>();
    const fromSchedule = schedule.map((dose) => {
      const record = findRecord(records, dose.code, dose.display_name);
      if (record) usedRecordIds.add(record.id);

      let status: "given" | "due" | "overdue" | "upcoming" | "not_given" =
        "upcoming";
      if (record?.received) {
        status = "given";
      } else if (ageDays < dose.eligible_from_days) {
        status = "upcoming";
      } else if (
        dose.eligible_until_days != null &&
        ageDays > dose.eligible_until_days
      ) {
        status = "overdue";
      } else if (ageDays >= dose.eligible_from_days) {
        status = "due";
      } else {
        status = "not_given";
      }

      return {
        id: dose.id,
        code: dose.code,
        name: dose.display_name,
        ageMonths: Math.round(dose.eligible_from_days / 30.4375),
        received: Boolean(record?.received),
        dateReceived: record?.date_received ?? null,
        status,
      };
    });

    const extras = records
      .filter((record) => !usedRecordIds.has(record.id))
      .map((record) => ({
        id: record.id,
        code: record.vaccine_key,
        name: record.vaccine_name,
        ageMonths: record.age_months,
        received: record.received,
        dateReceived: record.date_received,
        status: record.received
          ? ("given" as const)
          : ("not_given" as const),
      }));

    return [...fromSchedule, ...extras];
  }, [ageDays, records, schedule]);

  const givenCount = rows.filter((row) => row.status === "given").length;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="admin-section-title flex items-center gap-2">
            <Syringe className="h-5 w-5 text-emerald-600" />
            Vaccinations
          </h2>
          <p className="mt-1 text-sm text-gray-500">
            {givenCount} given · child age {ageMonths} months ({ageDays} days)
          </p>
        </div>
      </div>

      {rows.length === 0 ? (
        <div className="admin-panel py-8 text-center text-sm text-gray-500">
          No vaccine schedule or records found for this child.
        </div>
      ) : (
        <div className="admin-table-wrap overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-emerald-50/50 text-left text-xs font-semibold uppercase tracking-wide text-gray-600">
              <tr>
                <th className="px-4 py-3">Vaccine</th>
                <th className="px-4 py-3">Due around</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Date given</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id} className="border-t border-gray-100">
                  <td className="px-4 py-3">
                    <p className="font-medium text-gray-900">{row.name}</p>
                    <p className="text-xs text-gray-500">{row.code}</p>
                  </td>
                  <td className="px-4 py-3 text-gray-600">
                    {row.ageMonths != null ? `${row.ageMonths} mo` : "—"}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={cn(
                        "inline-flex rounded-md px-2.5 py-0.5 text-xs font-medium",
                        row.status === "given" &&
                          "bg-emerald-50 text-emerald-800",
                        row.status === "due" && "bg-sky-50 text-sky-800",
                        row.status === "overdue" && "bg-red-50 text-red-800",
                        row.status === "upcoming" &&
                          "bg-gray-100 text-gray-600",
                        row.status === "not_given" &&
                          "bg-amber-50 text-amber-800",
                      )}
                    >
                      {row.status === "given"
                        ? "Given"
                        : row.status === "due"
                          ? "Due"
                          : row.status === "overdue"
                            ? "Overdue"
                            : row.status === "upcoming"
                              ? "Upcoming"
                              : "Not given"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-600">
                    {row.dateReceived ? formatDate(row.dateReceived) : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
