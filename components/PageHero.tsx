import type { LucideIcon } from "lucide-react";

type PageHeroProps = {
  title: string;
  description?: string;
  icon: LucideIcon;
  stat?: { label: string; value: string | number };
};

export default function PageHero({
  title,
  description,
  icon: Icon,
  stat,
}: PageHeroProps) {
  return (
    <header className="border-b border-gray-200 bg-white">
      <div className="mx-auto flex max-w-[1200px] items-start justify-between gap-6 px-6 py-6 lg:px-8">
        <div className="min-w-0">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[var(--radius)] bg-emerald-50 text-emerald-600 ring-1 ring-inset ring-emerald-100">
              <Icon className="h-5 w-5" />
            </div>
            <h1 className="truncate font-heading text-2xl font-bold tracking-normal text-gray-900 sm:text-[1.75rem]">
              {title}
            </h1>
          </div>
          {description ? (
            <p className="mt-2 max-w-2xl text-base leading-relaxed text-gray-600">
              {description}
            </p>
          ) : null}
        </div>
        {stat ? (
          <div className="shrink-0 rounded-[var(--radius)] border border-gray-200 bg-gray-50 px-4 py-3 text-right">
            <div className="text-sm text-gray-500">{stat.label}</div>
            <div className="font-heading text-2xl font-bold tabular-nums tracking-normal text-gray-900">
              {stat.value}
            </div>
          </div>
        ) : null}
      </div>
    </header>
  );
}
