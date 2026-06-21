import Image from "next/image";
import { ExternalLink, FileImage, GraduationCap } from "lucide-react";
import { doctorHasCredentialImage } from "@/lib/doctors/display";
import type { DoctorProfile } from "@/lib/types/doctors";

type DoctorCredentialDocumentsProps = {
  doctor: DoctorProfile;
};

type DocumentCardProps = {
  title: string;
  description: string;
  imageUrl: string | null;
  icon: typeof FileImage;
};

function DocumentCard({ title, description, imageUrl, icon: Icon }: DocumentCardProps) {
  const hasImage = doctorHasCredentialImage(imageUrl);

  return (
    <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
      <div className="border-b border-gray-100 px-4 py-3">
        <div className="flex items-center gap-2">
          <Icon className="h-4 w-4 text-emerald-600" />
          <p className="text-sm font-semibold text-gray-900">{title}</p>
        </div>
        <p className="mt-1 text-xs text-gray-500">{description}</p>
      </div>
      {hasImage ? (
        <div className="p-4">
          <a
            href={imageUrl!.trim()}
            target="_blank"
            rel="noopener noreferrer"
            className="group block overflow-hidden rounded-lg border border-gray-200 bg-gray-50"
          >
            <div className="relative aspect-[4/3] w-full">
              <Image
                src={imageUrl!.trim()}
                alt={title}
                fill
                className="object-contain p-2 transition-transform group-hover:scale-[1.02]"
                unoptimized
              />
            </div>
            <div className="flex items-center justify-center gap-1.5 border-t border-gray-200 bg-white px-3 py-2 text-xs font-medium text-emerald-700 group-hover:bg-emerald-50">
              <ExternalLink className="h-3.5 w-3.5" />
              Open full size
            </div>
          </a>
        </div>
      ) : (
        <div className="flex aspect-[4/3] flex-col items-center justify-center gap-2 p-6 text-center">
          <FileImage className="h-8 w-8 text-gray-300" />
          <p className="text-sm text-gray-500">Not uploaded yet</p>
        </div>
      )}
    </div>
  );
}

export default function DoctorCredentialDocuments({ doctor }: DoctorCredentialDocumentsProps) {
  const hasLicense = doctorHasCredentialImage(doctor.license_image_url);
  const hasDegree = doctorHasCredentialImage(doctor.degree_image_url);
  const hasAny = hasLicense || hasDegree;

  return (
    <div className="admin-panel space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="admin-section-title">Uploaded documents</h2>
          <p className="mt-1 text-sm text-gray-500">
            Review license and degree images before approving this doctor.
          </p>
        </div>
        {!doctor.is_verified ? (
          <span
            className={`inline-flex rounded-full px-3 py-1 text-xs font-medium ${
              hasAny
                ? "bg-emerald-100 text-emerald-800"
                : "bg-amber-100 text-amber-800"
            }`}
          >
            {hasAny ? "Documents uploaded" : "Awaiting documents"}
          </span>
        ) : null}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <DocumentCard
          title="Medical license"
          description="License certificate or registration card"
          imageUrl={doctor.license_image_url}
          icon={FileImage}
        />
        <DocumentCard
          title="Degree certificate"
          description="Medical degree or qualification document"
          imageUrl={doctor.degree_image_url}
          icon={GraduationCap}
        />
      </div>
    </div>
  );
}
