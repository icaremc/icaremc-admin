import Image from "next/image";
import { Stethoscope } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  doctorDisplayName,
  doctorHasProfilePhoto,
  doctorInitials,
} from "@/lib/doctors/display";

type DoctorProfileAvatarProps = {
  firstName: string;
  lastName: string;
  photoUrl?: string | null;
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
};

const sizeClasses = {
  sm: "h-9 w-9 text-xs",
  md: "h-11 w-11 text-sm",
  lg: "h-16 w-16 text-base",
  xl: "h-24 w-24 text-xl",
} as const;

const imageSizes = {
  sm: 36,
  md: 44,
  lg: 64,
  xl: 96,
} as const;

export default function DoctorProfileAvatar({
  firstName,
  lastName,
  photoUrl,
  size = "md",
  className,
}: DoctorProfileAvatarProps) {
  const initials = doctorInitials(firstName, lastName);
  const hasPhoto = doctorHasProfilePhoto(photoUrl);
  const label = doctorDisplayName(firstName, lastName);

  return (
    <div
      className={cn(
        "relative shrink-0 overflow-hidden rounded-full border border-emerald-100 bg-emerald-50",
        sizeClasses[size],
        className,
      )}
      aria-label={label}
    >
      {hasPhoto ? (
        <Image
          src={photoUrl!.trim()}
          alt={label}
          width={imageSizes[size]}
          height={imageSizes[size]}
          className="h-full w-full object-cover"
          unoptimized
        />
      ) : (
        <div className="flex h-full w-full items-center justify-center gap-0.5 font-semibold text-emerald-800">
          {initials !== "?" ? (
            initials
          ) : (
            <Stethoscope className="h-4 w-4" aria-hidden />
          )}
        </div>
      )}
    </div>
  );
}
