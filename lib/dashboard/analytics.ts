import type { Appointment } from "@/lib/types/doctors";
import type { WalletTransaction } from "@/lib/types/finance";

export type DashboardRange = "today" | "7d" | "30d" | "all";

export type ChartBucket = {
  label: string;
  value: number;
};

export type DashboardAnalytics = {
  totalTransactions: number;
  totalPaymentVolume: number;
  totalCommission: number;
  monthlyCommission: number;
  commissionChange: number;
  commissionPercent: number;
  completedPaidBookings: number;
  paymentChart: ChartBucket[];
  commissionChart: ChartBucket[];
};

type AppointmentRow = Pick<
  Appointment,
  | "id"
  | "status"
  | "amount_paid"
  | "payment_status"
  | "total_amount"
  | "created_at"
  | "updated_at"
>;

function startOfDay(date: Date): Date {
  const next = new Date(date);
  next.setHours(0, 0, 0, 0);
  return next;
}

function addDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

const PAYMENT_ALL_RANGE_START_MONTH = 4;

function getAllRangeStart(now: Date): Date {
  const thisYearStart = startOfDay(new Date(now.getFullYear(), PAYMENT_ALL_RANGE_START_MONTH, 1));
  if (now >= thisYearStart) return thisYearStart;
  return startOfDay(new Date(now.getFullYear() - 1, PAYMENT_ALL_RANGE_START_MONTH, 1));
}

export function isDateInRange(
  dateString: string | null | undefined,
  range: DashboardRange,
): boolean {
  if (range === "all") return true;
  if (!dateString) return false;

  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return false;

  const now = new Date();
  if (range === "today") {
    return (
      date.getFullYear() === now.getFullYear() &&
      date.getMonth() === now.getMonth() &&
      date.getDate() === now.getDate()
    );
  }

  const days = range === "7d" ? 7 : 30;
  const from = new Date();
  from.setDate(now.getDate() - days);
  return date >= from;
}

function countItemsInRange<T>(
  items: T[],
  start: Date,
  end: Date,
  resolveDate: (item: T) => Date | null,
): number {
  return items.reduce((count, item) => {
    const createdAt = resolveDate(item);
    if (!createdAt || createdAt < start || createdAt >= end) return count;
    return count + 1;
  }, 0);
}

function sumItemsInRange<T>(
  items: T[],
  start: Date,
  end: Date,
  resolveDate: (item: T) => Date | null,
  resolveValue: (item: T) => number,
): number {
  return items.reduce((sum, item) => {
    const createdAt = resolveDate(item);
    if (!createdAt || createdAt < start || createdAt >= end) return sum;
    return sum + resolveValue(item);
  }, 0);
}

export function buildTimeSeriesChart<T>(
  items: T[],
  range: DashboardRange,
  resolveDate: (item: T) => Date | null,
  resolveValue?: (item: T) => number,
): ChartBucket[] {
  const now = new Date();
  const today = startOfDay(now);
  const aggregate = (start: Date, end: Date) =>
    resolveValue
      ? sumItemsInRange(items, start, end, resolveDate, resolveValue)
      : countItemsInRange(items, start, end, resolveDate);

  if (range === "today") {
    const tomorrow = addDays(today, 1);
    return [{ label: "Today", value: aggregate(today, tomorrow) }];
  }

  if (range === "7d") {
    return Array.from({ length: 7 }, (_, index) => {
      const start = addDays(today, index - 6);
      const end = addDays(start, 1);
      return {
        label: start.toLocaleDateString("en-US", { weekday: "short" }),
        value: aggregate(start, end),
      };
    });
  }

  if (range === "30d") {
    return Array.from({ length: 6 }, (_, index) => {
      const start = addDays(today, -30 + index * 5);
      const end = addDays(start, 5);
      return {
        label: start.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
        value: aggregate(start, end),
      };
    });
  }

  const rangeStart = getAllRangeStart(now);
  const buckets: ChartBucket[] = [];
  let weekStart = rangeStart;

  while (weekStart <= today) {
    const weekEnd = addDays(weekStart, 7);
    buckets.push({
      label: weekStart.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      value: aggregate(weekStart, weekEnd),
    });
    weekStart = weekEnd;
  }

  return buckets;
}

export function isCompletedAppointment(appt: AppointmentRow): boolean {
  return appt.status === "completed";
}

export function isPaymentDone(appt: AppointmentRow): boolean {
  if (appt.amount_paid <= 0) return false;
  return appt.payment_status === "paid" || appt.payment_status === "partial";
}

export function getPlatformCommission(
  appt: AppointmentRow,
  commissionPercent: number,
): number {
  if (!isCompletedAppointment(appt) || !isPaymentDone(appt)) return 0;
  return Math.round(appt.amount_paid * (commissionPercent / 100) * 100) / 100;
}

function resolveAppointmentCommissionDate(appt: AppointmentRow): Date | null {
  const raw = isCompletedAppointment(appt) ? appt.updated_at : appt.created_at;
  if (!raw) return null;
  const date = new Date(raw);
  return Number.isNaN(date.getTime()) ? null : date;
}

function resolveWalletDate(tx: WalletTransaction): Date | null {
  if (!tx.created_at) return null;
  const date = new Date(tx.created_at);
  return Number.isNaN(date.getTime()) ? null : date;
}

function resolveWalletCreditAmount(tx: WalletTransaction): number {
  if (!tx.is_credit) return 0;
  const amount = Number(tx.amount);
  return Number.isFinite(amount) ? amount : 0;
}

export function computeDashboardAnalytics({
  appointments,
  walletTransactions,
  commissionPercent,
  range,
}: {
  appointments: AppointmentRow[];
  walletTransactions: WalletTransaction[];
  commissionPercent: number;
  range: DashboardRange;
}): DashboardAnalytics {
  const rangedWalletRows = walletTransactions.filter((row) =>
    isDateInRange(row.created_at, range),
  );
  const rangedAppointments = appointments.filter((appt) =>
    isDateInRange(appt.created_at, range),
  );
  const completedPaidInRange = rangedAppointments.filter(
    (appt) => isCompletedAppointment(appt) && isPaymentDone(appt),
  );

  const totalCommission = completedPaidInRange.reduce(
    (sum, appt) => sum + getPlatformCommission(appt, commissionPercent),
    0,
  );

  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const sixtyDaysAgo = new Date();
  sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);

  const monthlyCommission = appointments
    .filter((appt) => {
      const date = resolveAppointmentCommissionDate(appt);
      return date && date >= thirtyDaysAgo;
    })
    .reduce((sum, appt) => sum + getPlatformCommission(appt, commissionPercent), 0);

  const previousMonthCommission = appointments
    .filter((appt) => {
      const date = resolveAppointmentCommissionDate(appt);
      return date && date >= sixtyDaysAgo && date < thirtyDaysAgo;
    })
    .reduce((sum, appt) => sum + getPlatformCommission(appt, commissionPercent), 0);

  const commissionChange =
    previousMonthCommission > 0
      ? ((monthlyCommission - previousMonthCommission) / previousMonthCommission) * 100
      : monthlyCommission > 0
        ? 100
        : 0;

  const commissionEligible = appointments.filter(
    (appt) => isCompletedAppointment(appt) && isPaymentDone(appt),
  );

  return {
    totalTransactions: rangedWalletRows.length,
    totalPaymentVolume: rangedWalletRows.reduce(
      (sum, row) => sum + resolveWalletCreditAmount(row),
      0,
    ),
    totalCommission,
    monthlyCommission,
    commissionChange,
    commissionPercent,
    completedPaidBookings: completedPaidInRange.length,
    paymentChart: buildTimeSeriesChart(
      rangedWalletRows,
      range,
      resolveWalletDate,
      resolveWalletCreditAmount,
    ),
    commissionChart: buildTimeSeriesChart(
      commissionEligible.filter((appt) =>
        isDateInRange(resolveAppointmentCommissionDate(appt)?.toISOString(), range),
      ),
      range,
      resolveAppointmentCommissionDate,
      (appt) => getPlatformCommission(appt, commissionPercent),
    ),
  };
}

export function parseDashboardRange(value: string | null): DashboardRange {
  const normalized = (value ?? "").toLowerCase();
  if (normalized === "today" || normalized === "7d" || normalized === "30d" || normalized === "all") {
    return normalized;
  }
  return "30d";
}
