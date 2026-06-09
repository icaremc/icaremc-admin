import { dailyTipTranslationTitles } from "@/lib/content/contentLabels";
import type { DailyTip } from "@/lib/types/database";

const LOCALE_LABELS: Record<string, string> = {
  en: "EN",
  am: "AM",
  om: "OM",
  ti: "TI",
};

function localeBadge(code: string): string {
  return LOCALE_LABELS[code] ?? code.toUpperCase();
}

type DailyTipLanguageTitlesProps = {
  tip: DailyTip;
  /** compact = inline chips; stacked = one row per language */
  layout?: "compact" | "stacked";
  maxTitleLength?: number;
};

export default function DailyTipLanguageTitles({
  tip,
  layout = "compact",
  maxTitleLength = 56,
}: DailyTipLanguageTitlesProps) {
  const titles = dailyTipTranslationTitles(tip);

  if (titles.length === 0) {
    return <span className="text-sm text-gray-400">No titles yet</span>;
  }

  if (layout === "stacked") {
    return (
      <ul className="space-y-1.5">
        {titles.map((row) => (
          <li key={row.language_code} className="flex items-start gap-2 text-sm">
            <span className="mt-0.5 shrink-0 rounded bg-emerald-100 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-emerald-800">
              {localeBadge(row.language_code)}
            </span>
            <span className="text-gray-800">
              {row.title.length > maxTitleLength
                ? `${row.title.slice(0, maxTitleLength)}…`
                : row.title}
            </span>
          </li>
        ))}
      </ul>
    );
  }

  return (
    <div className="flex flex-wrap gap-1.5">
      {titles.map((row) => (
        <span
          key={row.language_code}
          className="inline-flex max-w-full items-center gap-1 rounded-full border border-emerald-200/80 bg-white px-2.5 py-1 text-xs text-gray-800 shadow-sm"
          title={row.title}
        >
          <span className="shrink-0 font-bold uppercase text-emerald-700">
            {localeBadge(row.language_code)}
          </span>
          <span className="truncate">
            {row.title.length > maxTitleLength
              ? `${row.title.slice(0, maxTitleLength)}…`
              : row.title}
          </span>
        </span>
      ))}
    </div>
  );
}
