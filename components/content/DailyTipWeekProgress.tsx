import { cn } from "@/lib/utils";

type DailyTipWeekProgressProps = {
  daysFilled: number;
  total?: number;
  showLabel?: boolean;
  size?: "sm" | "md";
};

export default function DailyTipWeekProgress({
  daysFilled,
  total = 7,
  showLabel = true,
  size = "md",
}: DailyTipWeekProgressProps) {
  const pct = Math.min(100, Math.round((daysFilled / total) * 100));

  return (
    <div className="w-full">
      {showLabel ? (
        <div className="mb-1 flex items-center justify-between text-xs text-gray-500">
          <span>Days filled</span>
          <span className="font-medium text-gray-700">
            {daysFilled}/{total}
          </span>
        </div>
      ) : null}
      <div
        className={cn(
          "overflow-hidden rounded-full bg-gray-100",
          size === "sm" ? "h-1.5" : "h-2",
        )}
      >
        <div
          className={cn(
            "h-full rounded-full transition-all",
            pct === 100
              ? "bg-emerald-500"
              : pct > 0
                ? "bg-teal-500"
                : "bg-gray-200",
          )}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
