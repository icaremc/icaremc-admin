"use client";

import { useEffect, useMemo, useState } from "react";
import { RotateCcw, ZoomIn, ZoomOut } from "lucide-react";
import {
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  measurementAgeMonths,
} from "@/lib/children/childGrowthUi";
import { formatDate } from "@/lib/format";
import type { Child, ChildGrowthMeasurement } from "@/lib/types/database";
import {
  GROWTH_STATUS_LABELS,
  growthStatusTone,
  headCircumferenceForAge,
  heightForAge,
  weightForAge,
  type GrowthMetricResult,
} from "@/lib/who/growthStatus";
import {
  ensureWhoLmsLoaded,
  whoReferenceSeries,
  whoTable,
  type WhoIndicator,
} from "@/lib/who/whoZScore";
import { cn } from "@/lib/utils";

type MetricKey = "weight" | "height" | "hc";
type AgePreset = "fit" | "12" | "24" | "60" | "full";

const METRICS: {
  key: MetricKey;
  label: string;
  unit: string;
  indicator: WhoIndicator;
}[] = [
  { key: "weight", label: "Weight for age", unit: "kg", indicator: "wfa" },
  { key: "height", label: "Height for age", unit: "cm", indicator: "hfa" },
  {
    key: "hc",
    label: "Head circumference",
    unit: "cm",
    indicator: "hca",
  },
];

function clampRange(
  lo: number,
  hi: number,
  tableMax: number,
): [number, number] {
  const minSpan = 3;
  let start = Math.max(0, lo);
  let end = Math.min(tableMax, hi);
  if (end - start < minSpan) {
    end = Math.min(tableMax, start + minSpan);
    start = Math.max(0, end - minSpan);
  }
  return [start, end];
}

function StatusChip({ result }: { result: GrowthMetricResult }) {
  const tone = growthStatusTone(result.level);
  return (
    <span
      className={cn(
        "inline-flex rounded-md px-2.5 py-1 text-xs font-medium",
        tone === "ok" && "bg-emerald-50 text-emerald-800",
        tone === "warn" && "bg-amber-50 text-amber-800",
        tone === "bad" && "bg-red-50 text-red-800",
        tone === "muted" && "bg-gray-100 text-gray-600",
      )}
    >
      {GROWTH_STATUS_LABELS[result.level]}
      {result.zScore != null ? ` · Z ${result.zScore.toFixed(1)}` : ""}
    </span>
  );
}

function measurementValue(
  measurement: ChildGrowthMeasurement,
  metric: MetricKey,
): number | null {
  if (metric === "weight") return measurement.weight_kg;
  if (metric === "height") return measurement.height_cm;
  return measurement.head_circumference_cm;
}

function statusForMeasurement(
  child: Child,
  measurement: ChildGrowthMeasurement,
  metric: MetricKey,
): GrowthMetricResult {
  const age = measurementAgeMonths(child, measurement);
  if (metric === "weight") {
    return weightForAge({
      sex: child.gender,
      ageMonths: age,
      weightKg: measurement.weight_kg,
    });
  }
  if (metric === "height") {
    return heightForAge({
      sex: child.gender,
      ageMonths: age,
      heightCm: measurement.height_cm,
    });
  }
  return headCircumferenceForAge({
    sex: child.gender,
    ageMonths: age,
    value: measurement.head_circumference_cm,
  });
}

type ChildGrowthPanelProps = {
  child: Child;
  measurements: ChildGrowthMeasurement[];
};

export default function ChildGrowthPanel({
  child,
  measurements,
}: ChildGrowthPanelProps) {
  const [metric, setMetric] = useState<MetricKey>("weight");
  /** null = auto fit to child age */
  const [xRange, setXRange] = useState<[number, number] | null>(null);
  const [ready, setReady] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    ensureWhoLmsLoaded()
      .then(() => {
        if (!cancelled) setReady(true);
      })
      .catch((error: unknown) => {
        if (!cancelled) {
          setLoadError(
            error instanceof Error ? error.message : "Failed to load WHO data",
          );
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const sorted = useMemo(
    () =>
      [...measurements].sort(
        (a, b) =>
          new Date(a.measured_on).getTime() - new Date(b.measured_on).getTime(),
      ),
    [measurements],
  );

  const latest = sorted.length > 0 ? sorted[sorted.length - 1]! : null;
  const activeMetric = METRICS.find((item) => item.key === metric)!;

  const latestByMetric = useMemo(() => {
    function latestWith(key: MetricKey) {
      for (let i = sorted.length - 1; i >= 0; i--) {
        const row = sorted[i]!;
        if (measurementValue(row, key) != null) return row;
      }
      return null;
    }
    return {
      weight: latestWith("weight"),
      height: latestWith("height"),
      hc: latestWith("hc"),
    };
  }, [sorted]);

  const latestStatuses = useMemo(() => {
    if (!ready) return null;
    const { weight, height, hc } = latestByMetric;
    if (!weight && !height && !hc) return null;
    return {
      weight: weight
        ? statusForMeasurement(child, weight, "weight")
        : null,
      height: height
        ? statusForMeasurement(child, height, "height")
        : null,
      hc: hc ? statusForMeasurement(child, hc, "hc") : null,
    };
  }, [child, latestByMetric, ready]);

  const tableMax = useMemo(() => {
    if (!ready) return 60;
    return whoTable(activeMetric.indicator, child.gender).at(-1)?.given ?? 60;
  }, [activeMetric.indicator, child.gender, ready]);

  const childMaxAge = useMemo(() => {
    const ages = sorted.map((row) => measurementAgeMonths(child, row));
    if (latest) ages.push(measurementAgeMonths(child, latest));
    return Math.max(0, ...ages);
  }, [child, latest, sorted]);

  const fitRange = useMemo(
    (): [number, number] =>
      clampRange(0, Math.max(12, Math.ceil(childMaxAge + 2)), tableMax),
    [childMaxAge, tableMax],
  );

  const viewRange = xRange ?? fitRange;

  const { chartData, yDomain } = useMemo(() => {
    type ChartRow = {
      ageMonths: number;
      low: number | null;
      median: number | null;
      high: number | null;
      child: number | null;
    };

    const empty = {
      chartData: [] as ChartRow[],
      yDomain: [0, 1] as [number, number],
    };
    if (!ready) return empty;

    const [x0, x1] = viewRange;
    const step = x1 - x0 > 120 ? 2 : 1;
    const reference = whoReferenceSeries({
      indicator: activeMetric.indicator,
      sex: child.gender,
      maxAgeMonths: Math.ceil(x1),
      stepMonths: step,
    }).filter((row) => row.ageMonths >= x0 && row.ageMonths <= x1);

    const rows: ChartRow[] = reference.map((row) => ({
      ageMonths: row.ageMonths,
      low: row.low,
      median: row.median,
      high: row.high,
      child: null,
    }));

    const childValues: number[] = [];
    for (const row of sorted) {
      const age = measurementAgeMonths(child, row);
      const value = measurementValue(row, metric);
      if (value == null || age < x0 || age > x1) continue;
      childValues.push(value);
      rows.push({
        ageMonths: age,
        low: null,
        median: null,
        high: null,
        child: value,
      });
    }
    rows.sort((a, b) => a.ageMonths - b.ageMonths);

    const refTop = reference.length > 0 ? Math.max(...reference.map((r) => r.high)) : 1;
    const dataTop = childValues.length > 0 ? Math.max(...childValues) : refTop;
    const top = Math.max(refTop, dataTop);
    const pad = Math.max(top * 0.08, 1);

    return {
      chartData: rows,
      yDomain: [0, Math.max(1, Math.ceil(top + pad))] as [number, number],
    };
  }, [activeMetric.indicator, child, metric, ready, sorted, viewRange]);

  function applyPreset(preset: AgePreset) {
    if (preset === "fit") {
      setXRange(null);
      return;
    }
    if (preset === "full") {
      setXRange([0, tableMax]);
      return;
    }
    setXRange(clampRange(0, Number(preset), tableMax));
  }

  function zoomBy(factor: number) {
    const [lo, hi] = viewRange;
    const mid = (lo + hi) / 2;
    const half = ((hi - lo) / 2) * factor;
    setXRange(clampRange(mid - half, mid + half, tableMax));
  }

  if (loadError) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
        {loadError}
      </div>
    );
  }

  if (!ready) {
    return (
      <div className="admin-panel py-10 text-center text-sm text-gray-500">
        Loading WHO growth references…
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <section className="admin-panel">
        <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="admin-section-title">Growth status</h2>
            <p className="mt-1 text-sm text-gray-500">
              WHO Child Growth Standards (−2 to +2 SD).
              {latest
                ? ` Latest measurement ${formatDate(latest.measured_on)}.`
                : " No measurements recorded yet."}
            </p>
          </div>
        </div>

        {latestStatuses ? (
          <div className="grid gap-3 sm:grid-cols-3">
            {(
              [
                [
                  "Weight",
                  latestByMetric.weight?.weight_kg ?? null,
                  "kg",
                  latestStatuses.weight,
                ],
                [
                  "Height",
                  latestByMetric.height?.height_cm ?? null,
                  "cm",
                  latestStatuses.height,
                ],
                [
                  "Head",
                  latestByMetric.hc?.head_circumference_cm ?? null,
                  "cm",
                  latestStatuses.hc,
                ],
              ] as const
            ).map(([label, value, unit, result]) => (
              <div
                key={label}
                className="rounded-xl border border-gray-100 bg-gray-50/80 p-4"
              >
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                  {label}
                </p>
                <p className="mt-1 text-xl font-semibold text-gray-900">
                  {value != null ? `${value} ${unit}` : "—"}
                </p>
                <div className="mt-2">
                  {result ? (
                    <StatusChip result={result} />
                  ) : (
                    <span className="inline-flex rounded-md bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-600">
                      No reference
                    </span>
                  )}
                </div>
                {result?.median != null ? (
                  <p className="mt-2 text-xs text-gray-500">
                    WHO median {result.median.toFixed(1)} {unit}
                    {result.min != null && result.max != null
                      ? ` · range ${result.min.toFixed(1)}-${result.max.toFixed(1)}`
                      : ""}
                  </p>
                ) : null}
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-gray-500">
            Parents record weight, height, and head circumference over time.
            Those points will appear here with WHO status.
          </p>
        )}
      </section>

      <section className="admin-panel">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h2 className="admin-section-title">Growth chart</h2>
          <div className="flex flex-wrap items-center gap-2">
            <div className="inline-flex rounded-lg border border-gray-200 bg-white p-0.5">
              {METRICS.map((item) => (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => setMetric(item.key)}
                  className={cn(
                    "rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
                    metric === item.key
                      ? "bg-emerald-50 text-emerald-700"
                      : "text-gray-500 hover:text-gray-800",
                  )}
                >
                  {item.label}
                </button>
              ))}
            </div>
            <label className="flex items-center gap-1.5 text-xs text-gray-500">
              <span className="sr-only">Age range</span>
              <select
                className="h-8 rounded-md border border-gray-200 bg-white px-2 text-xs font-medium text-gray-700"
                value={
                  xRange == null
                    ? "fit"
                    : xRange[0] === 0 && xRange[1] === tableMax
                      ? "full"
                      : xRange[0] === 0 && xRange[1] === 12
                        ? "12"
                        : xRange[0] === 0 && xRange[1] === 24
                          ? "24"
                          : xRange[0] === 0 && xRange[1] === 60
                            ? "60"
                            : "custom"
                }
                onChange={(e) => {
                  const value = e.target.value as AgePreset | "custom";
                  if (value === "custom") return;
                  applyPreset(value);
                }}
              >
                <option value="fit">Fit child</option>
                <option value="12">0–12 months</option>
                <option value="24">0–24 months</option>
                <option value="60">0–5 years</option>
                <option value="full">Full table</option>
                {xRange != null &&
                !(
                  (xRange[0] === 0 && xRange[1] === tableMax) ||
                  (xRange[0] === 0 &&
                    [12, 24, 60].includes(xRange[1]))
                ) ? (
                  <option value="custom">
                    {viewRange[0].toFixed(0)}–{viewRange[1].toFixed(0)} mo
                  </option>
                ) : null}
              </select>
            </label>
            <div className="inline-flex overflow-hidden rounded-md border border-gray-200 bg-white">
              <button
                type="button"
                aria-label="Zoom out"
                onClick={() => zoomBy(2)}
                className="flex h-8 w-8 items-center justify-center text-gray-600 hover:bg-gray-50"
              >
                <ZoomOut className="h-4 w-4" />
              </button>
              <button
                type="button"
                aria-label="Zoom in"
                onClick={() => zoomBy(0.5)}
                className="flex h-8 w-8 items-center justify-center border-l border-gray-200 text-gray-600 hover:bg-gray-50"
              >
                <ZoomIn className="h-4 w-4" />
              </button>
              <button
                type="button"
                aria-label="Reset view"
                onClick={() => setXRange(null)}
                className="flex h-8 w-8 items-center justify-center border-l border-gray-200 text-gray-600 hover:bg-gray-50"
              >
                <RotateCcw className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        </div>

        <div className="h-[340px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart
              data={chartData}
              margin={{ top: 12, right: 16, bottom: 8, left: 8 }}
            >
              <CartesianGrid strokeDasharray="4 4" stroke="#e5e7eb" />
              <XAxis
                dataKey="ageMonths"
                type="number"
                domain={viewRange}
                allowDataOverflow
                tickLine={false}
                axisLine={false}
                tick={{ fill: "#6b7280", fontSize: 12 }}
                label={{
                  value: "Age (months)",
                  position: "insideBottom",
                  offset: -2,
                  fill: "#9ca3af",
                  fontSize: 11,
                }}
              />
              <YAxis
                domain={yDomain}
                allowDataOverflow
                tickCount={6}
                width={36}
                tickLine={false}
                axisLine={false}
                tick={{ fill: "#6b7280", fontSize: 12 }}
                tickFormatter={(value) =>
                  typeof value === "number" ? String(Math.round(value)) : ""
                }
                label={{
                  value: activeMetric.unit,
                  angle: -90,
                  position: "insideLeft",
                  fill: "#9ca3af",
                  fontSize: 11,
                }}
              />
              <Tooltip
                formatter={(value, name) => {
                  if (value == null || typeof value !== "number") {
                    return ["—", String(name)];
                  }
                  const labels: Record<string, string> = {
                    low: "−2 SD",
                    median: "Median",
                    high: "+2 SD",
                    child: "Child",
                  };
                  return [
                    `${value.toFixed(1)} ${activeMetric.unit}`,
                    labels[String(name)] ?? String(name),
                  ];
                }}
                labelFormatter={(label) => `Age ${label} months`}
              />
              <Legend />
              <Line
                type="monotone"
                dataKey="low"
                stroke="#6ee7b7"
                strokeDasharray="4 4"
                strokeWidth={1.5}
                dot={false}
                name="−2 SD"
                connectNulls
                isAnimationActive={false}
              />
              <Line
                type="monotone"
                dataKey="median"
                stroke="#059669"
                strokeWidth={2}
                dot={false}
                name="WHO median"
                connectNulls
                isAnimationActive={false}
              />
              <Line
                type="monotone"
                dataKey="high"
                stroke="#6ee7b7"
                strokeDasharray="4 4"
                strokeWidth={1.5}
                dot={false}
                name="+2 SD"
                connectNulls
                isAnimationActive={false}
              />
              <Line
                type="monotone"
                dataKey="child"
                stroke="#0f766e"
                strokeWidth={2.5}
                dot={{ r: 4, fill: "#0f766e" }}
                name="Child"
                connectNulls
                isAnimationActive={false}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </section>

      <section>
        <h2 className="admin-section-title mb-3">Measurements</h2>
        {sorted.length === 0 ? (
          <div className="admin-panel py-8 text-center text-sm text-gray-500">
            No growth measurements yet.
          </div>
        ) : (
          <div className="admin-table-wrap overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-emerald-50/50 text-left text-xs font-semibold uppercase tracking-wide text-gray-600">
                <tr>
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3">Age</th>
                  <th className="px-4 py-3">Weight</th>
                  <th className="px-4 py-3">Height</th>
                  <th className="px-4 py-3">Head</th>
                  <th className="px-4 py-3">Status</th>
                </tr>
              </thead>
              <tbody>
                {[...sorted].reverse().map((row) => {
                  const age = measurementAgeMonths(child, row);
                  const wfa = statusForMeasurement(child, row, "weight");
                  return (
                    <tr key={row.id} className="border-t border-gray-100">
                      <td className="px-4 py-3 text-gray-900">
                        {formatDate(row.measured_on)}
                      </td>
                      <td className="px-4 py-3 text-gray-600">
                        {age.toFixed(1)} mo
                      </td>
                      <td className="px-4 py-3">
                        {row.weight_kg != null ? `${row.weight_kg} kg` : "—"}
                      </td>
                      <td className="px-4 py-3">
                        {row.height_cm != null ? `${row.height_cm} cm` : "—"}
                      </td>
                      <td className="px-4 py-3">
                        {row.head_circumference_cm != null
                          ? `${row.head_circumference_cm} cm`
                          : "—"}
                      </td>
                      <td className="px-4 py-3">
                        <StatusChip result={wfa} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
