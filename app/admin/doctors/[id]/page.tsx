"use client";

import { useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import {
  ArrowLeft,
  Award,
  Building2,
  Calendar,
  CheckCircle2,
  Clock,
  FileText,
  Phone,
  Star,
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
import DoctorCredentialDocuments from "@/components/doctors/DoctorCredentialDocuments";
import DoctorDetailTabs, {
  DOCTOR_DETAIL_TABS,
  type DoctorDetailTab,
} from "@/components/doctors/DoctorDetailTabs";
import DoctorProfileAvatar from "@/components/doctors/DoctorProfileAvatar";
import { useAppDispatch, useAppSelector } from "@/app/store/hooks";
import {
  approveDoctor,
  fetchDoctorDetail,
  revokeDoctorApproval,
} from "@/features/doctors/doctorDetailSlice";
import { updateDoctorVerification } from "@/features/doctors/doctorsSlice";
import { summarizeAvailabilitySlots } from "@/lib/availability";
import {
  doctorCategoryLabel,
  doctorDisplayName,
} from "@/lib/doctors/display";
import { formatDate, formatDateTime } from "@/lib/format";
import type { DoctorAvailabilitySlot, DoctorProfile } from "@/lib/types/doctors";

const DAY_NAMES = [
  "",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
];

function isDoctorDetailTab(value: string | null): value is DoctorDetailTab {
  return DOCTOR_DETAIL_TABS.some((tab) => tab.id === value);
}

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

function DetailField({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: ReactNode;
  icon?: typeof FileText;
}) {
  return (
    <div>
      <p className="text-xs font-medium uppercase tracking-wide text-gray-500">{label}</p>
      <p className="mt-1 flex items-center gap-2 text-sm text-gray-900">
        {Icon ? <Icon className="h-4 w-4 shrink-0 text-emerald-600" /> : null}
        <span>{value}</span>
      </p>
    </div>
  );
}

function DoctorPersonalDetails({ doctor }: { doctor: DoctorProfile }) {
  return (
    <div className="space-y-6">
      <div className="admin-panel">
        <h2 className="admin-section-title">Profile</h2>
        <div className="mt-4 flex flex-col gap-5 sm:flex-row sm:items-start">
          <DoctorProfileAvatar
            firstName={doctor.first_name}
            lastName={doctor.last_name}
            photoUrl={doctor.profile_photo_url}
            size="lg"
          />
          <div className="grid flex-1 gap-4 sm:grid-cols-2">
            <DetailField label="Full name" value={doctorDisplayName(doctor.first_name, doctor.last_name)} />
            <DetailField
              label="Speciality"
              value={doctorCategoryLabel(doctor)}
              icon={Stethoscope}
            />
            <DetailField
              label="Hospital"
              value={doctor.hospital || "—"}
              icon={Building2}
            />
            <DetailField label="Phone" value={doctor.phone || "—"} icon={Phone} />
            <DetailField
              label="Experience"
              value={`${doctor.experience_years} years`}
              icon={Award}
            />
            <DetailField
              label="Rating"
              value={doctor.rating > 0 ? `${doctor.rating.toFixed(1)} / 5` : "No ratings yet"}
              icon={Star}
            />
          </div>
        </div>
        {doctor.bio ? (
          <div className="mt-5 rounded-[var(--radius)] border border-gray-100 bg-gray-50/80 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Bio</p>
            <p className="mt-2 text-sm leading-relaxed text-gray-800">{doctor.bio}</p>
          </div>
        ) : (
          <p className="mt-4 text-sm text-gray-500">No bio provided.</p>
        )}
      </div>

      <div className="admin-panel space-y-4">
        <h2 className="admin-section-title">Credentials & records</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <DetailField
            label="License number"
            value={doctor.license_number ?? "—"}
            icon={FileText}
          />
          <DetailField
            label="Speciality"
            value={doctor.doctor_categories?.name ?? doctor.specialty ?? "—"}
          />
          <DetailField label="Joined" value={formatDate(doctor.created_at)} icon={Calendar} />
          <DetailField label="Last updated" value={formatDateTime(doctor.updated_at)} />
        </div>
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
    </div>
  );
}

export default function DoctorDetailPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const doctorId = typeof params.id === "string" ? params.id : "";
  const dispatch = useAppDispatch();
  const { doctor, loading, saving, error } = useAppSelector((state) => state.doctorDetail);
  const [approvalNotice, setApprovalNotice] = useState<string | null>(null);

  const tabParam = searchParams.get("tab");
  const [activeTab, setActiveTab] = useState<DoctorDetailTab>(
    isDoctorDetailTab(tabParam) ? tabParam : "personal",
  );

  useEffect(() => {
    if (doctorId) dispatch(fetchDoctorDetail(doctorId));
  }, [dispatch, doctorId]);

  useEffect(() => {
    if (isDoctorDetailTab(tabParam)) {
      setActiveTab(tabParam);
    }
  }, [tabParam]);

  const handleTabChange = (tab: DoctorDetailTab) => {
    setActiveTab(tab);
    const url = new URL(window.location.href);
    url.searchParams.set("tab", tab);
    window.history.replaceState(null, "", url);
  };

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
        description="Review credentials, services, and verification status"
        icon={Stethoscope}
        stat={doctor ? undefined : { label: "Status", value: "—" }}
        actions={
          doctor ? (
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
          ) : null
        }
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
            <DoctorDetailTabs active={activeTab} onChange={handleTabChange} />

            {activeTab === "personal" ? <DoctorPersonalDetails doctor={doctor} /> : null}

            {activeTab === "documents" ? <DoctorCredentialDocuments doctor={doctor} /> : null}

            {activeTab === "services" ? (
              <DoctorBookingPricingPanel
                doctor={doctor}
                onSaved={() => dispatch(fetchDoctorDetail(doctorId))}
              />
            ) : null}
          </>
        ) : null}
      </div>
    </>
  );
}
