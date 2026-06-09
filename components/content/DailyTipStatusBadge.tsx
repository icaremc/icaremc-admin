import { cn } from "@/lib/utils";

type DailyTipStatusBadgeProps = {
  active: boolean;
  className?: string;
};

export default function DailyTipStatusBadge({
  active,
  className,
}: DailyTipStatusBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium",
        active
          ? "bg-emerald-100 text-emerald-800"
          : "bg-amber-100 text-amber-800",
        className,
      )}
    >
      <span
        className={cn(
          "h-1.5 w-1.5 rounded-full",
          active ? "bg-emerald-500" : "bg-amber-500",
        )}
      />
      {active ? "Active" : "Inactive"}
    </span>
  );
}
