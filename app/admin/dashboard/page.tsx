"use client";

import { Suspense, useEffect, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Baby,
  BadgeCheck,
  BarChart3,
  CalendarCheck,
  DollarSign,
  HeartPulse,
  LayoutDashboard,
  Minus,
  Stethoscope,
  TrendingDown,
  TrendingUp,
  Users,
  Wallet,
} from "lucide-react";
import PageHero from "@/components/PageHero";
import StatCard from "@/components/StatCard";
import {
  DashboardAreaChart,
  DashboardBarChart,
} from "@/components/dashboard/DashboardCharts";
import { Button } from "@/components/ui/button";
import { useAppDispatch, useAppSelector } from "@/app/store/hooks";
import {
  fetchDashboardAnalytics,
  setDashboardRange,
} from "@/features/dashboard/dashboardAnalyticsSlice";
import { fetchDashboardStats } from "@/features/dashboard/dashboardSlice";
import { formatMoney } from "@/lib/appointments/display";
import type { DashboardRange } from "@/lib/dashboard/analytics";
import { parseDashboardRange } from "@/lib/dashboard/analytics";

function greetingForHour(hour: number): string {
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

function formatEtb(amount: number): string {
  const needsCents = Math.abs(amount % 1) >= 0.005;
  return formatMoney(amount, "ETB", needsCents ? 2 : 0);
}

const RANGE_OPTIONS: Array<{ id: DashboardRange; label: string }> = [
  { id: "today", label: "Today" },
  { id: "7d", label: "7D" },
  { id: "30d", label: "30D" },
  { id: "all", label: "All" },
];

function DashboardContent() {
  const dispatch = useAppDispatch();
  const router = useRouter();
  const searchParams = useSearchParams();
  const user = useAppSelector((state) => state.auth.user);
  const { stats, loading, error } = useAppSelector((state) => state.dashboard);
  const {
    analytics,
    loading: analyticsLoading,
    error: analyticsError,
    range,
  } = useAppSelector((state) => state.dashboardAnalytics);

  const urlRange = useMemo(
    () => parseDashboardRange(searchParams.get("range")),
    [searchParams],
  );

  useEffect(() => {
    dispatch(fetchDashboardStats());
  }, [dispatch]);

  useEffect(() => {
    dispatch(setDashboardRange(urlRange));
    dispatch(fetchDashboardAnalytics(urlRange));
  }, [dispatch, urlRange]);

  const greeting = useMemo(() => {
    const name = user?.name?.split(" ")[0] || "Admin";
    return `${greetingForHour(new Date().getHours())}, ${name}`;
  }, [user?.name]);

  const commissionChange = analytics?.commissionChange ?? 0;
  const commissionTrend =
    Math.abs(commissionChange) < 0.05
      ? "flat"
      : commissionChange > 0
        ? "up"
        : "down";
  const CommissionIcon =
    commissionTrend === "up"
      ? TrendingUp
      : commissionTrend === "down"
        ? TrendingDown
        : Minus;

  function handleRangeChange(nextRange: DashboardRange) {
    const next = new URLSearchParams(searchParams.toString());
    next.set("range", nextRange);
    router.replace(`/admin/dashboard?${next.toString()}`);
    dispatch(setDashboardRange(nextRange));
    dispatch(fetchDashboardAnalytics(nextRange));
  }

  function refreshAll() {
    dispatch(fetchDashboardStats());
    dispatch(fetchDashboardAnalytics(range));
  }

  return (
    <>
      <PageHero title={greeting} icon={LayoutDashboard} />

      <div className="admin-page admin-page-wide space-y-10">
        {error || analyticsError ? (
          <div className="rounded-[var(--radius)] border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {error ?? analyticsError}
          </div>
        ) : null}

        <section className="space-y-4">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 className="admin-section-title">Platform</h2>
              <p className="admin-section-desc">
                Live counts across mothers, care, and clinicians.
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              disabled={loading || analyticsLoading}
              onClick={refreshAll}
            >
              Refresh
            </Button>
          </div>

          <div className="grid auto-rows-fr gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
            <StatCard
              label="Parents"
              value={loading ? "…" : stats.profiles.toLocaleString()}
              href="/admin/users"
              icon={Users}
              loading={loading}
              accent="emerald"
            />
            <StatCard
              label="Pregnancies"
              value={loading ? "…" : stats.pregnancies.toLocaleString()}
              href="/admin/pregnancy"
              icon={HeartPulse}
              loading={loading}
              accent="teal"
            />
            <StatCard
              label="Children"
              value={loading ? "…" : stats.children.toLocaleString()}
              href="/admin/children"
              icon={Baby}
              loading={loading}
              accent="amber"
            />
            <StatCard
              label="Doctors"
              value={loading ? "…" : stats.doctors.toLocaleString()}
              href="/admin/doctors"
              icon={Stethoscope}
              loading={loading}
              accent="cyan"
            />
            <StatCard
              label="Appointments"
              value={loading ? "…" : stats.appointments.toLocaleString()}
              href="/admin/appointments"
              icon={CalendarCheck}
              loading={loading}
              accent="teal"
              description={
                loading
                  ? undefined
                  : `${stats.pendingAppointments.toLocaleString()} pending`
              }
            />
            <StatCard
              label="Admins"
              value={loading ? "…" : stats.adminUsers.toLocaleString()}
              href="/admin/admins"
              icon={BadgeCheck}
              loading={loading}
              accent="violet"
            />
          </div>
        </section>

        <section className="space-y-4">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 className="admin-section-title">Finance</h2>
              <p className="admin-section-desc">
                Payments, earnings, and commission from the platform snapshot.
              </p>
            </div>
            <div
              className="inline-flex rounded-[var(--radius)] border border-gray-200 bg-white p-1"
              role="group"
              aria-label="Finance range"
            >
              {RANGE_OPTIONS.map((option) => (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => handleRangeChange(option.id)}
                  aria-pressed={range === option.id}
                  className={`rounded-[calc(var(--radius)-2px)] px-3 py-1.5 text-sm font-medium transition-colors ${
                    range === option.id
                      ? "bg-emerald-600 text-white"
                      : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          <div className="grid auto-rows-fr gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-5">
            <StatCard
              label="Transactions"
              value={
                analyticsLoading
                  ? "…"
                  : (analytics?.totalTransactions ?? 0).toLocaleString()
              }
              href="/admin/finance/wallet-transactions"
              icon={Wallet}
              loading={analyticsLoading}
              accent="teal"
            />
            <StatCard
              label="Appointment payments"
              value={
                analyticsLoading
                  ? "…"
                  : formatEtb(analytics?.totalPaymentVolume ?? 0)
              }
              href="/admin/finance/payment"
              icon={DollarSign}
              loading={analyticsLoading}
              accent="emerald"
              description={
                analyticsLoading
                  ? undefined
                  : `${(analytics?.completedPaidBookings ?? 0).toLocaleString()} completed paid`
              }
            />
            <StatCard
              label="Doctor earnings"
              value={
                analyticsLoading
                  ? "…"
                  : formatEtb(analytics?.doctorBookingEarnings ?? 0)
              }
              href="/admin/finance/wallet-transactions"
              icon={Stethoscope}
              loading={analyticsLoading}
              accent="cyan"
              description={
                analyticsLoading
                  ? undefined
                  : `${(analytics?.doctorBookingEarningCount ?? 0).toLocaleString()} booking credits`
              }
            />
            <StatCard
              label="Subscriptions"
              value={
                analyticsLoading
                  ? "…"
                  : formatEtb(analytics?.subscriptionPaymentVolume ?? 0)
              }
              href="/admin/finance/app-membership"
              icon={BadgeCheck}
              loading={analyticsLoading}
              accent="amber"
              description={
                analyticsLoading
                  ? undefined
                  : `${(analytics?.subscriptionPaymentCount ?? 0).toLocaleString()} paid memberships`
              }
            />
            <StatCard
              label="Commission"
              value={
                analyticsLoading
                  ? "…"
                  : formatEtb(analytics?.totalCommission ?? 0)
              }
              href="/admin/finance/settings"
              icon={CommissionIcon}
              loading={analyticsLoading}
              accent="violet"
              description={
                analyticsLoading
                  ? undefined
                  : commissionTrend === "flat"
                    ? "No change vs prior period"
                    : `${commissionChange > 0 ? "+" : ""}${commissionChange.toFixed(1)}% vs prior period`
              }
            />
          </div>
        </section>

        <section className="space-y-4">
          <div>
            <h2 className="admin-section-title">Trends</h2>
            <p className="admin-section-desc">
              Payment and commission history returned with the dashboard snapshot.
            </p>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <div className="admin-panel space-y-3">
              <div className="flex items-start justify-between gap-3">
                <h3 className="flex items-center gap-2 text-sm font-semibold text-gray-900">
                  <BarChart3 className="h-4 w-4 text-emerald-600" />
                  Appointment payments
                </h3>
              </div>
              <DashboardBarChart
                buckets={analytics?.paymentChart ?? []}
                emptyLabel="No appointment payments yet"
                valueLabel="Amount"
                isCurrency
              />
            </div>

            <div className="admin-panel space-y-3">
              <div className="flex items-start justify-between gap-3">
                <h3 className="flex items-center gap-2 text-sm font-semibold text-gray-900">
                  <Stethoscope className="h-4 w-4 text-cyan-600" />
                  Doctor earnings
                </h3>
                <p className="text-xs text-gray-500">
                  {analyticsLoading
                    ? "…"
                    : `${(analytics?.doctorBookingEarningCount ?? 0).toLocaleString()} credits`}
                </p>
              </div>
              <DashboardBarChart
                buckets={analytics?.doctorEarningsChart ?? []}
                emptyLabel="No doctor booking earnings yet"
                valueLabel="Amount"
                isCurrency
              />
            </div>

            <div className="admin-panel space-y-3">
              <div className="flex items-start justify-between gap-3">
                <h3 className="flex items-center gap-2 text-sm font-semibold text-gray-900">
                  <BadgeCheck className="h-4 w-4 text-amber-600" />
                  App membership
                </h3>
                <p className="text-xs text-gray-500">
                  {analyticsLoading
                    ? "…"
                    : `${(analytics?.subscriptionPaymentCount ?? 0).toLocaleString()} paid`}
                </p>
              </div>
              <DashboardBarChart
                buckets={analytics?.subscriptionChart ?? []}
                emptyLabel="No subscription payments yet"
                valueLabel="Amount"
                isCurrency
              />
            </div>

            <div className="admin-panel space-y-3">
              <div className="flex items-start justify-between gap-3">
                <h3 className="flex items-center gap-2 text-sm font-semibold text-gray-900">
                  <TrendingUp className="h-4 w-4 text-violet-600" />
                  Commission
                </h3>
              </div>
              <DashboardAreaChart
                buckets={analytics?.commissionChart ?? []}
                emptyLabel="No commission recorded yet"
                valueLabel="Commission"
              />
            </div>
          </div>
        </section>
      </div>
    </>
  );
}

export default function DashboardPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[40vh] items-center justify-center text-sm text-gray-500">
          Loading dashboard…
        </div>
      }
    >
      <DashboardContent />
    </Suspense>
  );
}
