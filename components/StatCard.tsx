import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

type StatCardProps = {
  label: string;
  value: number | string;
  href?: string;
  icon: LucideIcon;
  loading?: boolean;
  description?: string;
  accent?: "emerald" | "teal" | "cyan" | "amber" | "violet";
};

const accentStyles = {
  emerald: {
    icon: "bg-emerald-50 text-emerald-600 ring-emerald-100",
    value: "text-emerald-700",
  },
  teal: {
    icon: "bg-teal-50 text-teal-600 ring-teal-100",
    value: "text-teal-700",
  },
  cyan: {
    icon: "bg-cyan-50 text-cyan-600 ring-cyan-100",
    value: "text-cyan-700",
  },
  amber: {
    icon: "bg-amber-50 text-amber-600 ring-amber-100",
    value: "text-amber-700",
  },
  violet: {
    icon: "bg-violet-50 text-violet-600 ring-violet-100",
    value: "text-violet-700",
  },
};

export default function StatCard({
  label,
  value,
  href,
  icon: Icon,
  loading = false,
  description,
  accent = "emerald",
}: StatCardProps) {
  const styles = accentStyles[accent];

  const content = (
    <div
      className={cn(
        "group rounded-[var(--radius)] border border-gray-200 bg-white p-5 shadow-sm transition-colors",
        href && "hover:border-emerald-200 hover:shadow-md",
      )}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-gray-600">{label}</p>
          <p
            className={cn(
              "mt-2 font-heading text-3xl font-bold tabular-nums tracking-normal",
              styles.value,
            )}
          >
            {loading ? (
              <span className="inline-block h-8 w-16 animate-pulse rounded-md bg-gray-200" />
            ) : (
              value
            )}
          </p>
          {description ? (
            <p className="mt-1 text-xs leading-relaxed text-gray-500">
              {description}
            </p>
          ) : null}
        </div>
        <div
          className={cn(
            "flex h-10 w-10 shrink-0 items-center justify-center rounded-[var(--radius)] ring-1 ring-inset",
            styles.icon,
          )}
        >
          <Icon className="h-5 w-5" />
        </div>
      </div>
      {href ? (
        <p className="mt-4 text-xs font-medium text-emerald-600 opacity-0 transition-opacity group-hover:opacity-100">
          View details →
        </p>
      ) : null}
    </div>
  );

  if (href) {
    return <Link href={href}>{content}</Link>;
  }

  return content;
}
