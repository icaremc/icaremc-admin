"use client";

import { Suspense, useEffect, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Baby,
  BadgeCheck,
  BarChart3,
  CalendarCheck,
  DollarSign,
  LayoutDashboard,
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

  const commissionTrendUp = (analytics?.commissionChange ?? 0) >= 0;

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

      <div className="admin-page space-y-8">
        {error || analyticsError ? (
          <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-600">
            {error ?? analyticsError}
          </div>
        ) : null}

        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap gap-2">
            {RANGE_OPTIONS.map((option) => (
              <button
                key={option.id}
                type="button"
                onClick={() => handleRangeChange(option.id)}
                className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${
                  range === option.id
                    ? "bg-emerald-600 text-white"
                    : "border border-gray-200 bg-white text-gray-700 hover:bg-gray-50"
                }`}
              >
                {option.label}
              </button>
            ))}
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

        <section className="grid auto-rows-fr gap-4 sm:grid-cols-2 xl:grid-cols-5">
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
                : formatMoney(analytics?.totalPaymentVolume ?? 0, "ETB")
            }
            href="/admin/finance/payment"
            icon={DollarSign}
            loading={analyticsLoading}
            accent="emerald"
          />
          <StatCard
            label="Subscription payments"
            value={
              analyticsLoading
                ? "…"
                : formatMoney(analytics?.subscriptionPaymentVolume ?? 0, "ETB")
            }
            href="/admin/finance/app-membership"
            icon={BadgeCheck}
            loading={analyticsLoading}
            accent="amber"
          />
          <StatCard
            label="Commission"
            value={
              analyticsLoading
                ? "…"
                : formatMoney(analytics?.totalCommission ?? 0, "ETB", 2)
            }
            href="/admin/finance/settings"
            icon={TrendingUp}
            loading={analyticsLoading}
            accent="violet"
          />
          <StatCard
            label="Commission growth"
            value={
              analyticsLoading
                ? "…"
                : `${(analytics?.commissionChange ?? 0).toFixed(1)}%`
            }
            icon={commissionTrendUp ? TrendingUp : TrendingDown}
            loading={analyticsLoading}
            accent="violet"
          />
        </section>

        <section className="grid gap-6 lg:grid-cols-2 xl:grid-cols-3">
          <div className="admin-panel">
            <h3 className="mb-4 flex items-center gap-2 font-semibold text-gray-900">
              <BarChart3 className="h-5 w-5 text-emerald-600" />
              Payments
            </h3>
            <DashboardBarChart
              buckets={analytics?.paymentChart ?? []}
              emptyLabel="No payments in this period"
              valueLabel="Amount"
              isCurrency
            />
          </div>
          <div className="admin-panel">
            <h3 className="mb-4 flex items-center gap-2 font-semibold text-gray-900">
              <BadgeCheck className="h-5 w-5 text-amber-600" />
              App membership
            </h3>
            <DashboardBarChart
              buckets={analytics?.subscriptionChart ?? []}
              emptyLabel="No subscription payments in this period"
              valueLabel="Amount"
              isCurrency
            />
            <p className="mt-3 text-sm text-gray-500">
              {analyticsLoading
                ? "…"
                : `${(analytics?.subscriptionPaymentCount ?? 0).toLocaleString()} paid subscriptions in this period`}
            </p>
          </div>
          <div className="admin-panel lg:col-span-2 xl:col-span-1">
            <h3 className="mb-4 flex items-center gap-2 font-semibold text-gray-900">
              <TrendingUp className="h-5 w-5 text-violet-600" />
              Commission
            </h3>
            <DashboardAreaChart
              buckets={analytics?.commissionChart ?? []}
              emptyLabel="No commission in this period"
              valueLabel="Commission"
            />
          </div>
        </section>

        <section className="grid auto-rows-fr gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            label="Parents"
            value={stats.profiles}
            href="/admin/users"
            icon={Users}
            loading={loading}
            accent="emerald"
          />
          <StatCard
            label="Children"
            value={stats.children}
            href="/admin/children"
            icon={Baby}
            loading={loading}
            accent="amber"
          />
          <StatCard
            label="Appointments"
            value={stats.appointments}
            href="/admin/appointments"
            icon={CalendarCheck}
            loading={loading}
            accent="teal"
          />
          <StatCard
            label="Doctors"
            value={stats.doctors}
            href="/admin/doctors"
            icon={Stethoscope}
            loading={loading}
            accent="violet"
          />
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
