import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

type PageHeroProps = {
  title: string;
  description?: string;
  icon: LucideIcon;
  stat?: { label: string; value: string | number };
  actions?: ReactNode;
};

export default function PageHero({
  title,
  description,
  icon: Icon,
  stat,
  actions,
}: PageHeroProps) {
  return (
    <header className="border-b border-gray-200 bg-white">
      <div className="mx-auto flex max-w-[1200px] flex-col gap-4 px-4 py-4 sm:px-6 sm:py-6 md:flex-row md:items-start md:justify-between lg:px-8">
        <div className="min-w-0">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[var(--radius)] bg-emerald-50 text-emerald-600 ring-1 ring-inset ring-emerald-100">
              <Icon className="h-5 w-5" />
            </div>
            <h1 className="truncate font-heading text-xl font-bold tracking-normal text-gray-900 sm:text-2xl md:text-[1.75rem]">
              {title}
            </h1>
          </div>
          {description ? (
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-gray-600 sm:text-base">
              {description}
            </p>
          ) : null}
        </div>
        <div className="flex flex-col items-stretch gap-3 md:items-end">
          {actions}
          {stat ? (
            <div className="rounded-[var(--radius)] border border-gray-200 bg-gray-50 px-4 py-3 md:text-right">
              <div className="text-sm text-gray-500">{stat.label}</div>
              <div className="font-heading text-2xl font-bold tabular-nums tracking-normal text-gray-900">
                {stat.value}
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </header>
  );
}
