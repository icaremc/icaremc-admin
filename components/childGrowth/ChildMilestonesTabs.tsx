"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const TABS = [
  {
    href: "/admin/child-growth",
    label: "Content by age",
    description: "Checklist, growth, red flags",
    isActive: (pathname: string) => {
      if (pathname === "/admin/child-growth") return true;
      if (pathname.startsWith("/admin/child-growth/follow-up")) return false;
      if (pathname.startsWith("/admin/child-growth/clinical-advice")) return false;
      if (pathname.startsWith("/admin/followup-visits")) return false;
      return pathname.startsWith("/admin/child-growth/");
    },
  },
  {
    href: "/admin/child-growth/clinical-advice",
    label: "Growth interpretation",
    description: "Z-score clinical advice",
    isActive: (pathname: string) =>
      pathname.startsWith("/admin/child-growth/clinical-advice"),
  },
  {
    href: "/admin/child-growth/follow-up",
    label: "Visit schedule",
    description: "Reminders & vaccines",
    isActive: (pathname: string) =>
      pathname.startsWith("/admin/child-growth/follow-up") ||
      pathname.startsWith("/admin/followup-visits"),
  },
] as const;

export default function ChildMilestonesTabs() {
  const pathname = usePathname() ?? "";

  return (
    <div className="border-b border-gray-200 bg-white">
      <div className="admin-tabs-bar">
        {TABS.map((tab) => {
          const active = tab.isActive(pathname);
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={cn(
                "whitespace-nowrap border-b-2 px-4 py-3 transition-colors",
                active
                  ? "border-emerald-600 text-emerald-700"
                  : "border-transparent text-gray-500 hover:border-gray-200 hover:text-gray-800",
              )}
            >
              <span className="block text-sm font-medium">{tab.label}</span>
              <span
                className={cn(
                  "mt-0.5 block text-xs font-normal",
                  active ? "text-emerald-600/80" : "text-gray-400",
                )}
              >
                {tab.description}
              </span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
