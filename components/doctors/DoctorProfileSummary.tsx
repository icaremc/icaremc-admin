import {
  Award,
  Building2,
  Calendar,
  Phone,
  Stethoscope,
  Star,
} from "lucide-react";
import DoctorProfileAvatar from "@/components/doctors/DoctorProfileAvatar";
import {
  doctorCategoryLabel,
  doctorDisplayName,
  doctorHasProfilePhoto,
} from "@/lib/doctors/display";
import { formatDate } from "@/lib/format";
import type { DoctorProfile } from "@/lib/types/doctors";

type DoctorProfileSummaryProps = {
  doctor: DoctorProfile;
};

export default function DoctorProfileSummary({ doctor }: DoctorProfileSummaryProps) {
  const name = doctorDisplayName(doctor.first_name, doctor.last_name);

  return (
    <div className="admin-panel overflow-hidden p-0">
      <div className="bg-gradient-to-br from-emerald-50 via-white to-emerald-50/40 px-6 py-6">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-start">
          <DoctorProfileAvatar
            firstName={doctor.first_name}
            lastName={doctor.last_name}
            photoUrl={doctor.profile_photo_url}
            size="xl"
          />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-2xl font-semibold text-gray-900">{name}</h2>
            </div>
            <p className="mt-1 flex items-center gap-2 text-sm font-medium text-emerald-700">
              <Stethoscope className="h-4 w-4" />
              {doctorCategoryLabel(doctor)}
            </p>
            {doctor.hospital ? (
              <p className="mt-2 flex items-center gap-2 text-sm text-gray-600">
                <Building2 className="h-4 w-4 text-emerald-600" />
                {doctor.hospital}
              </p>
            ) : null}
            {doctor.phone ? (
              <p className="mt-1 flex items-center gap-2 text-sm text-gray-600">
                <Phone className="h-4 w-4 text-emerald-600" />
                {doctor.phone}
              </p>
            ) : null}
            <div className="mt-4 flex flex-wrap gap-2">
              <span className="inline-flex items-center gap-1 rounded-full bg-white px-3 py-1 text-xs font-medium text-gray-700 shadow-sm ring-1 ring-gray-200">
                <Award className="h-3.5 w-3.5 text-emerald-600" />
                {doctor.experience_years} yrs experience
              </span>
              <span className="inline-flex items-center gap-1 rounded-full bg-white px-3 py-1 text-xs font-medium text-gray-700 shadow-sm ring-1 ring-gray-200">
                <Star className="h-3.5 w-3.5 text-amber-500" />
                {doctor.rating > 0 ? `${doctor.rating.toFixed(1)} / 5` : "No ratings"}
              </span>
              <span className="inline-flex items-center gap-1 rounded-full bg-white px-3 py-1 text-xs font-medium text-gray-700 shadow-sm ring-1 ring-gray-200">
                <Calendar className="h-3.5 w-3.5 text-emerald-600" />
                Joined {formatDate(doctor.created_at)}
              </span>
              {!doctorHasProfilePhoto(doctor.profile_photo_url) ? (
                <span className="inline-flex rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-600">
                  No profile photo
                </span>
              ) : null}
            </div>
          </div>
        </div>
        {doctor.bio ? (
          <div className="mt-5 rounded-xl border border-emerald-100 bg-white/80 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
              Bio
            </p>
            <p className="mt-2 text-sm leading-relaxed text-gray-800">{doctor.bio}</p>
          </div>
        ) : null}
      </div>
    </div>
  );
}
