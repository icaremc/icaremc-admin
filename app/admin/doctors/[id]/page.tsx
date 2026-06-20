"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  ArrowLeft,
  Calendar,
  CheckCircle2,
  Clock,
  FileText,
  Stethoscope,
  XCircle,
} from "lucide-react";
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
import SendDoctorPushForm from "@/components/doctors/SendDoctorPushForm";
import DoctorBookingPricingPanel from "@/components/doctors/DoctorBookingPricingPanel";
import DoctorProfileSummary from "@/components/doctors/DoctorProfileSummary";
import { useAppDispatch, useAppSelector } from "@/app/store/hooks";
import {
  approveDoctor,
  fetchDoctorDetail,
  revokeDoctorApproval,
} from "@/features/doctors/doctorDetailSlice";
import { updateDoctorVerification } from "@/features/doctors/doctorsSlice";
import { summarizeAvailabilitySlots } from "@/lib/availability";
import { doctorDisplayName } from "@/lib/doctors/display";
import { formatDate, formatDateTime } from "@/lib/format";
import type { DoctorAvailabilitySlot } from "@/lib/types/doctors";

const DAY_NAMES = ["", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

function formatDbTime(raw: string): string {
  const [hourPart, minutePart] = raw.split(":");
  const hour = Number.parseInt(hourPart, 10);
  const minute = Number.parseInt(minutePart, 10);
  if (Number.isNaN(hour) || Number.isNaN(minute)) return raw;

  const period = hour >= 12 ? "PM" : "AM";
  const hour12 = hour % 12 === 0 ? 12 : hour % 12;
  if (minute === 0) return `${hour12} ${period}`;
  return `${hour12}:${minute.toString().padStart(2, "0")} ${period}`;
}

function AvailabilityTable({ slots }: { slots: DoctorAvailabilitySlot[] | undefined }) {
  const active = (slots ?? [])
    .filter((slot) => slot.is_active)
    .sort((a, b) => {
      if (a.day_of_week !== b.day_of_week) return a.day_of_week - b.day_of_week;
      return a.start_time.localeCompare(b.start_time);
    });

  if (!active.length) {
    return <p className="text-sm text-gray-500">No availability windows set.</p>;
  }

  return (
    <div className="admin-table-wrap">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Day</TableHead>
            <TableHead>Hours</TableHead>
            <TableHead>Slot length</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {active.map((slot) => (
            <TableRow key={slot.id}>
              <TableCell className="font-medium">{DAY_NAMES[slot.day_of_week]}</TableCell>
              <TableCell>
                {formatDbTime(slot.start_time)} – {formatDbTime(slot.end_time)}
              </TableCell>
              <TableCell>{slot.slot_duration_minutes} min</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

export default function DoctorDetailPage() {
  const params = useParams();
  const doctorId = typeof params.id === "string" ? params.id : "";
  const dispatch = useAppDispatch();
  const { doctor, loading, saving, error } = useAppSelector((state) => state.doctorDetail);
  const [approvalNotice, setApprovalNotice] = useState<string | null>(null);

  useEffect(() => {
    if (doctorId) dispatch(fetchDoctorDetail(doctorId));
  }, [dispatch, doctorId]);

  const handleApprove = async () => {
    if (!doctorId || !window.confirm("Approve this doctor? They will appear as verified in the MC app.")) {
      return;
    }
    setApprovalNotice(null);
    const result = await dispatch(approveDoctor(doctorId));
    if (approveDoctor.fulfilled.match(result)) {
      dispatch(updateDoctorVerification({ id: doctorId, is_verified: true }));
      const push = result.payload.push;
      if (push?.sent) {
        setApprovalNotice("Doctor approved and notified by push notification.");
      } else if (push && !push.sent && "skipped" in push) {
        setApprovalNotice(`Doctor approved. Push not sent: ${push.skipped}`);
      } else if (push && !push.sent && "error" in push) {
        setApprovalNotice(`Doctor approved, but push failed: ${push.error}`);
      } else {
        setApprovalNotice("Doctor approved.");
      }
    }
  };

  const handleRevoke = async () => {
    if (
      !doctorId ||
      !window.confirm("Revoke verification? This doctor will no longer appear as approved.")
    ) {
      return;
    }
    const result = await dispatch(revokeDoctorApproval(doctorId));
    if (revokeDoctorApproval.fulfilled.match(result)) {
      dispatch(updateDoctorVerification({ id: doctorId, is_verified: false }));
    }
  };

  return (
    <>
      <PageHero
        title={
          doctor
            ? doctorDisplayName(doctor.first_name, doctor.last_name)
            : "Doctor profile"
        }
        description="Review credentials, availability, and verification status"
        icon={Stethoscope}
        stat={{
          label: "Status",
          value: doctor?.is_verified ? "Verified" : "Pending",
        }}
      />

      <div className="mx-auto max-w-[1200px] space-y-6 px-6 py-8 lg:px-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Link
            href="/admin/doctors"
            className="inline-flex items-center gap-2 text-sm text-emerald-700 hover:underline"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to doctors
          </Link>
          {doctor ? <SendDoctorPushForm doctorId={doctor.id} /> : null}
        </div>

        {error ? (
          <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-600">
            {error}
          </div>
        ) : null}

        {approvalNotice ? (
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
            {approvalNotice}
          </div>
        ) : null}

        {loading && !doctor ? (
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-emerald-600 border-t-transparent" />
            Loading doctor…
          </div>
        ) : doctor ? (
          <>
            <div className="flex flex-wrap items-center gap-3">
              <span
                className={`inline-flex rounded-full px-3 py-1 text-sm font-medium ${
                  doctor.is_verified
                    ? "bg-emerald-100 text-emerald-800"
                    : "bg-amber-100 text-amber-800"
                }`}
              >
                {doctor.is_verified ? "Verified" : "Pending approval"}
              </span>
              {doctor.is_verified ? (
                <Button
                  type="button"
                  variant="outline"
                  disabled={saving}
                  onClick={handleRevoke}
                  className="gap-2"
                >
                  <XCircle className="h-4 w-4" />
                  Revoke approval
                </Button>
              ) : (
                <Button
                  type="button"
                  disabled={saving}
                  onClick={handleApprove}
                  className="gap-2"
                >
                  <CheckCircle2 className="h-4 w-4" />
                  Approve doctor
                </Button>
              )}
            </div>

            <div className="admin-panel space-y-6">
              <DoctorProfileSummary doctor={doctor} />

              <h2 className="admin-section-title">Credentials & records</h2>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <div>
                  <p className="text-xs font-medium uppercase text-gray-500">License</p>
                  <p className="mt-1 flex items-center gap-2 text-sm text-gray-900">
                    <FileText className="h-4 w-4 text-emerald-600" />
                    {doctor.license_number ?? "—"}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-medium uppercase text-gray-500">Category slug</p>
                  <p className="mt-1 text-sm text-gray-900">
                    {doctor.doctor_categories?.slug ?? "—"}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-medium uppercase text-gray-500">Joined</p>
                  <p className="mt-1 flex items-center gap-2 text-sm text-gray-900">
                    <Calendar className="h-4 w-4 text-emerald-600" />
                    {formatDate(doctor.created_at)}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-medium uppercase text-gray-500">Last updated</p>
                  <p className="mt-1 text-sm text-gray-900">
                    {formatDateTime(doctor.updated_at)}
                  </p>
                </div>
              </div>

              {doctor.bio ? null : (
                <p className="text-sm text-gray-500">No bio provided.</p>
              )}
            </div>

            <div className="admin-panel space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h2 className="admin-section-title flex items-center gap-2">
                  <Clock className="h-4 w-4 text-emerald-600" />
                  Availability
                </h2>
                <p className="text-sm text-gray-500">
                  {summarizeAvailabilitySlots(doctor.doctor_availability_slots)}
                </p>
              </div>
              <AvailabilityTable slots={doctor.doctor_availability_slots} />
            </div>

            <DoctorBookingPricingPanel
              doctor={doctor}
              onSaved={() => dispatch(fetchDoctorDetail(doctorId))}
            />

          </>
        ) : null}
      </div>
    </>
  );
}
