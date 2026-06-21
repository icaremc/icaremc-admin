"use client";

import { FileText, Stethoscope, User } from "lucide-react";
import { cn } from "@/lib/utils";

export const DOCTOR_DETAIL_TABS = [
  { id: "personal", label: "Personal details", icon: User },
  { id: "documents", label: "Documents", icon: FileText },
  { id: "services", label: "Services", icon: Stethoscope },
] as const;

export type DoctorDetailTab = (typeof DOCTOR_DETAIL_TABS)[number]["id"];

type DoctorDetailTabsProps = {
  active: DoctorDetailTab;
  onChange: (tab: DoctorDetailTab) => void;
};

export default function DoctorDetailTabs({ active, onChange }: DoctorDetailTabsProps) {
  return (
    <nav
      className="flex gap-1 overflow-x-auto rounded-[var(--radius)] border border-gray-200 bg-gray-50/80 p-1"
      aria-label="Doctor profile sections"
    >
      {DOCTOR_DETAIL_TABS.map((tab) => {
        const Icon = tab.icon;
        const isActive = active === tab.id;

        return (
          <button
            key={tab.id}
            type="button"
            onClick={() => onChange(tab.id)}
            className={cn(
              "inline-flex shrink-0 items-center gap-2 rounded-[calc(var(--radius)-2px)] px-4 py-2.5 text-sm font-medium transition-colors",
              isActive
                ? "bg-white text-emerald-700 shadow-sm ring-1 ring-gray-200"
                : "text-gray-600 hover:bg-white/60 hover:text-gray-900",
            )}
          >
            <Icon className={cn("h-4 w-4", isActive ? "text-emerald-600" : "text-gray-400")} />
            {tab.label}
          </button>
        );
      })}
    </nav>
  );
}
