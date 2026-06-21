"use client";

import { useState } from "react";
import Image from "next/image";
import { Stethoscope } from "lucide-react";
import { cn } from "@/lib/utils";
import { doctorHasServiceImage } from "@/lib/doctors/display";

type DoctorServiceThumbnailProps = {
  imageUrl?: string | null;
  name: string;
  className?: string;
};

export default function DoctorServiceThumbnail({
  imageUrl,
  name,
  className,
}: DoctorServiceThumbnailProps) {
  const [failed, setFailed] = useState(false);
  const showImage = doctorHasServiceImage(imageUrl) && !failed;

  return (
    <div
      className={cn(
        "relative h-14 w-14 shrink-0 overflow-hidden rounded-xl bg-emerald-50 ring-1 ring-emerald-100",
        className,
      )}
    >
      {showImage ? (
        <Image
          src={imageUrl!.trim()}
          alt={name.trim() || "Service"}
          fill
          className="object-cover"
          unoptimized
          onError={() => setFailed(true)}
        />
      ) : (
        <div className="flex h-full w-full items-center justify-center">
          <Stethoscope className="h-6 w-6 text-emerald-600" aria-hidden />
        </div>
      )}
    </div>
  );
}
