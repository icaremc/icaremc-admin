"use client";

import { useEffect, useMemo, useState } from "react";
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
  type WhoIndicator,
} from "@/lib/who/whoZScore";
import { cn } from "@/lib/utils";

type MetricKey = "weight" | "height" | "hc";

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

  const { chartData, yDomain, outsideScaleCount } = useMemo(() => {
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
      outsideScaleCount: 0,
    };
    if (!ready) return empty;

    const childPoints = sorted
      .map((row) => {
        const age = measurementAgeMonths(child, row);
        const value = measurementValue(row, metric);
        if (value == null) return null;
        return { ageMonths: age, child: value };
      })
      .filter((row): row is { ageMonths: number; child: number } => row != null);

    const childMaxAge = Math.max(
      0,
      ...childPoints.map((point) => point.ageMonths),
      latest ? measurementAgeMonths(child, latest) : 0,
    );
    // Keep infant charts readable: at least 12 mo, pad past last point, cap at 60.
    const maxAge = Math.min(60, Math.max(12, Math.ceil(childMaxAge + 2)));

    const reference = whoReferenceSeries({
      indicator: activeMetric.indicator,
      sex: child.gender,
      maxAgeMonths: maxAge,
      stepMonths: 1,
    });

    const refHighs = reference.map((row) => row.high);
    const refLows = reference.map((row) => row.low);
    const refMax = refHighs.length > 0 ? Math.max(...refHighs) : 1;
    const refMin = refLows.length > 0 ? Math.min(...refLows) : 0;
    const pad = Math.max((refMax - refMin) * 0.12, refMax * 0.05, 0.5);
    // ponytail: outliers (e.g. 65 kg at 1 mo) stay in the table only so WHO bands remain readable
    const inlierCap = refMax * 2.5;

    const rows: ChartRow[] = reference.map((row) => ({
      ageMonths: row.ageMonths,
      low: row.low,
      median: row.median,
      high: row.high,
      child: null,
    }));

    let yMax = refMax + pad;
    let yMin = Math.max(0, refMin - pad);
    let outsideScaleCount = 0;
    for (const point of childPoints) {
      if (point.child > inlierCap) {
        outsideScaleCount += 1;
        continue;
      }
      yMax = Math.max(yMax, point.child + pad);
      yMin = Math.min(yMin, Math.max(0, point.child - pad));
      rows.push({
        ageMonths: point.ageMonths,
        low: null,
        median: null,
        high: null,
        child: point.child,
      });
    }
    rows.sort((a, b) => a.ageMonths - b.ageMonths);

    return {
      chartData: rows,
      yDomain: [yMin, yMax] as [number, number],
      outsideScaleCount,
    };
  }, [activeMetric.indicator, child, latest, metric, ready, sorted]);

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
        </div>

        {outsideScaleCount > 0 ? (
          <p className="mb-3 text-xs text-amber-700">
            {outsideScaleCount === 1
              ? "1 measurement is outside the chart scale"
              : `${outsideScaleCount} measurements are outside the chart scale`}{" "}
            (kept in the table so WHO bands stay readable).
          </p>
        ) : null}

        <div className="h-[320px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart
              data={chartData}
              margin={{ top: 12, right: 16, bottom: 8, left: 0 }}
            >
              <CartesianGrid strokeDasharray="4 4" stroke="#e5e7eb" />
              <XAxis
                dataKey="ageMonths"
                type="number"
                domain={["dataMin", "dataMax"]}
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
                tickLine={false}
                axisLine={false}
                tick={{ fill: "#6b7280", fontSize: 12 }}
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
