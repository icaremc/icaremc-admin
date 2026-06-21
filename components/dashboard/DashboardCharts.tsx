"use client";

import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

type ChartBucket = {
  label: string;
  value: number;
};

function formatAxisValue(value: number, isCurrency: boolean): string {
  if (!isCurrency) return value.toLocaleString("en-US");
  if (Math.abs(value) >= 1000) {
    return `${(value / 1000).toLocaleString("en-US", { maximumFractionDigits: 1 })}k`;
  }
  return value.toLocaleString("en-US", { maximumFractionDigits: 0 });
}

function formatTooltipValue(value: number, isCurrency: boolean): string {
  if (!isCurrency) return value.toLocaleString("en-US");
  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency: "ETB",
    maximumFractionDigits: 0,
  }).format(value);
}

type DashboardBarChartProps = {
  buckets: ChartBucket[];
  emptyLabel: string;
  valueLabel: string;
  isCurrency?: boolean;
};

export function DashboardBarChart({
  buckets,
  emptyLabel,
  valueLabel,
  isCurrency = false,
}: DashboardBarChartProps) {
  const hasData = buckets.some((bucket) => bucket.value > 0);
  const chartData = buckets.map((bucket) => ({
    period: bucket.label,
    value: bucket.value,
  }));

  if (!hasData) {
    return (
      <div className="flex h-[260px] items-center justify-center rounded-xl border border-dashed border-gray-200 bg-gray-50 px-4 text-center text-sm text-gray-500">
        {emptyLabel}
      </div>
    );
  }

  return (
    <div className="h-[260px] w-full rounded-xl border border-gray-200 bg-gray-50/60 p-2">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={chartData} margin={{ top: 12, right: 12, bottom: 4, left: 0 }}>
          <CartesianGrid vertical={false} strokeDasharray="4 4" stroke="#e5e7eb" />
          <XAxis
            dataKey="period"
            tickLine={false}
            axisLine={false}
            tickMargin={10}
            minTickGap={20}
            interval="preserveStartEnd"
            tick={{ fill: "#6b7280", fontSize: 12 }}
          />
          <YAxis
            tickLine={false}
            axisLine={false}
            tickMargin={8}
            width={isCurrency ? 52 : 44}
            allowDecimals={isCurrency}
            tickFormatter={(value) => formatAxisValue(Number(value), isCurrency)}
            tick={{ fill: "#6b7280", fontSize: 12 }}
          />
          <Tooltip
            cursor={{ fill: "rgba(16, 185, 129, 0.08)" }}
            formatter={(value) => [formatTooltipValue(Number(value), isCurrency), valueLabel]}
            labelFormatter={(label) => String(label)}
            contentStyle={{
              borderRadius: 12,
              border: "1px solid #e5e7eb",
              fontSize: 12,
            }}
          />
          <Bar dataKey="value" fill="#10b981" radius={[8, 8, 2, 2]} maxBarSize={56} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

type DashboardAreaChartProps = {
  buckets: ChartBucket[];
  emptyLabel: string;
  valueLabel: string;
};

export function DashboardAreaChart({
  buckets,
  emptyLabel,
  valueLabel,
}: DashboardAreaChartProps) {
  const hasData = buckets.some((bucket) => bucket.value > 0);
  const chartData = buckets.map((bucket) => ({
    period: bucket.label,
    value: bucket.value,
  }));

  if (!hasData) {
    return (
      <div className="flex h-[260px] items-center justify-center rounded-xl border border-dashed border-gray-200 bg-gray-50 px-4 text-center text-sm text-gray-500">
        {emptyLabel}
      </div>
    );
  }

  return (
    <div className="h-[260px] w-full rounded-xl border border-gray-200 bg-gray-50/60 p-2">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={chartData} margin={{ top: 12, right: 12, bottom: 4, left: 0 }}>
          <defs>
            <linearGradient id="commissionFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.35} />
              <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <CartesianGrid vertical={false} strokeDasharray="4 4" stroke="#e5e7eb" />
          <XAxis
            dataKey="period"
            tickLine={false}
            axisLine={false}
            tickMargin={10}
            minTickGap={20}
            interval="preserveStartEnd"
            tick={{ fill: "#6b7280", fontSize: 12 }}
          />
          <YAxis
            tickLine={false}
            axisLine={false}
            tickMargin={8}
            width={52}
            tickFormatter={(value) => formatAxisValue(Number(value), true)}
            tick={{ fill: "#6b7280", fontSize: 12 }}
          />
          <Tooltip
            formatter={(value) => [formatTooltipValue(Number(value), true), valueLabel]}
            labelFormatter={(label) => String(label)}
            contentStyle={{
              borderRadius: 12,
              border: "1px solid #e5e7eb",
              fontSize: 12,
            }}
          />
          <Area
            type="monotone"
            dataKey="value"
            stroke="#7c3aed"
            strokeWidth={2.5}
            fill="url(#commissionFill)"
            dot={{ r: 3, fill: "#7c3aed", strokeWidth: 0 }}
            activeDot={{ r: 5, fill: "#6d28d9" }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
