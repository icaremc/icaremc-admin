"use client";

import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

type SavedToastProps = {
  open: boolean;
  message?: string;
  className?: string;
};

export default function SavedToast({
  open,
  message = "Saved",
  className,
}: SavedToastProps) {
  if (!open) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className={cn(
        "fixed bottom-6 left-1/2 z-50 flex -translate-x-1/2 items-center gap-2 rounded-xl border border-emerald-200 bg-white px-4 py-3 text-sm font-medium text-emerald-800 shadow-lg",
        className,
      )}
    >
      <span className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-100">
        <Check className="h-3.5 w-3.5 text-emerald-700" strokeWidth={2.5} />
      </span>
      {message}
    </div>
  );
}
