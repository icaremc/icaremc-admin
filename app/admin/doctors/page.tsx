"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronRight, Stethoscope } from "lucide-react";
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
  fetchDoctors,
  updateDoctorVerification,
} from "@/features/doctors/doctorsSlice";
import {
  activeSlotCount,
  hasSlotsToday,
  summarizeAvailabilitySlots,
} from "@/lib/availability";
import { doctorCategoryLabel, doctorDisplayName } from "@/lib/doctors/display";
import { formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";

type Filter = "all" | "pending" | "verified";

const filters: { value: Filter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "pending", label: "Pending" },
  { value: "verified", label: "Verified" },
];

export default function DoctorsPage() {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const { doctors, loading, error, saving } = useAppSelector(
    (state) => state.doctors,
  );
  const [filter, setFilter] = useState<Filter>("all");

  useEffect(() => {
    dispatch(fetchDoctors());
  }, [dispatch]);

  const verifiedCount = doctors.filter((d) => d.is_verified).length;
  const pendingCount = doctors.length - verifiedCount;

  const filteredDoctors = useMemo(() => {
    if (filter === "pending") return doctors.filter((d) => !d.is_verified);
    if (filter === "verified") return doctors.filter((d) => d.is_verified);
    return doctors;
  }, [doctors, filter]);

  return (
    <>
      <PageHero
        title="Doctors"
        description="Review ICare Doctors sign-ups, approve profiles, and manage specialties"
        icon={Stethoscope}
        stat={{ label: "Pending approval", value: pendingCount }}
      />

      <div className="mx-auto max-w-[1200px] px-6 py-8 lg:px-8">
        <div className="mb-4 flex flex-wrap items-center gap-2">
          {filters.map(({ value, label }) => {
            const count =
              value === "all"
                ? doctors.length
                : value === "pending"
                  ? pendingCount
                  : verifiedCount;
            return (
              <button
                key={value}
                type="button"
                onClick={() => setFilter(value)}
                className={cn(
                  "rounded-full px-3 py-1.5 text-sm font-medium transition-colors",
                  filter === value
                    ? "bg-emerald-100 text-emerald-800"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200",
                )}
              >
                {label} ({count})
              </button>
            );
          })}
        </div>

        {error ? (
          <p className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </p>
        ) : null}

        <div className="admin-table-wrap">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Doctor</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Hospital</TableHead>
                <TableHead>Experience</TableHead>
                <TableHead>Availability</TableHead>
                <TableHead>Verified</TableHead>
                <TableHead>Joined</TableHead>
                <TableHead className="w-10" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={8} className="py-10 text-center text-gray-500">
                    Loading doctors…
                  </TableCell>
                </TableRow>
              ) : filteredDoctors.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="py-10 text-center text-gray-500">
                    {filter === "pending"
                      ? "No doctors awaiting approval."
                      : filter === "verified"
                        ? "No verified doctors yet."
                        : "No doctors yet. Doctors appear here after sign-up in ICare Doctors."}
                  </TableCell>
                </TableRow>
              ) : (
                filteredDoctors.map((doctor) => (
                  <TableRow
                    key={doctor.id}
                    className="cursor-pointer hover:bg-emerald-50/60"
                    onClick={() => router.push(`/admin/doctors/${doctor.id}`)}
                  >
                    <TableCell className="font-medium">
                      {doctorDisplayName(doctor.first_name, doctor.last_name)}
                      <div className="text-xs text-gray-500">{doctor.phone ?? "—"}</div>
                    </TableCell>
                    <TableCell>{doctorCategoryLabel(doctor)}</TableCell>
                    <TableCell>{doctor.hospital}</TableCell>
                    <TableCell>{doctor.experience_years} yrs</TableCell>
                    <TableCell className="max-w-[220px]">
                      <div className="truncate text-sm">
                        {summarizeAvailabilitySlots(doctor.doctor_availability_slots)}
                      </div>
                      <div className="mt-0.5 flex flex-wrap items-center gap-1.5 text-xs text-gray-500">
                        <span>
                          {activeSlotCount(doctor.doctor_availability_slots)} window
                          {activeSlotCount(doctor.doctor_availability_slots) === 1
                            ? ""
                            : "s"}
                        </span>
                        {hasSlotsToday(doctor.doctor_availability_slots) ? (
                          <span className="rounded-full bg-emerald-100 px-2 py-0.5 font-medium text-emerald-800">
                            Open today
                          </span>
                        ) : null}
                      </div>
                    </TableCell>
                    <TableCell>
                      <button
                        type="button"
                        disabled={saving}
                        onClick={(event) => {
                          event.stopPropagation();
                          dispatch(
                            updateDoctorVerification({
                              id: doctor.id,
                              is_verified: !doctor.is_verified,
                            }),
                          );
                        }}
                        className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                          doctor.is_verified
                            ? "bg-emerald-100 text-emerald-800"
                            : "bg-amber-100 text-amber-800"
                        }`}
                      >
                        {doctor.is_verified ? "Verified" : "Pending"}
                      </button>
                    </TableCell>
                    <TableCell>{formatDate(doctor.created_at)}</TableCell>
                    <TableCell>
                      <Link
                        href={`/admin/doctors/${doctor.id}`}
                        className="inline-flex text-gray-400 hover:text-gray-700"
                        onClick={(event) => event.stopPropagation()}
                      >
                        <ChevronRight className="h-4 w-4" />
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
