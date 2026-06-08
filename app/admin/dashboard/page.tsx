"use client";

import { useEffect, useMemo } from "react";
import Link from "next/link";
import {
  Activity,
  ArrowRight,
  Baby,
  BookOpen,
  CalendarCheck2,
  FileText,
  Heart,
  LayoutDashboard,
  Lightbulb,
  Plus,
  Users,
} from "lucide-react";
import PageHero from "@/components/PageHero";
import StatCard from "@/components/StatCard";
import { Button } from "@/components/ui/button";
import { useAppDispatch, useAppSelector } from "@/app/store/hooks";
import { fetchDashboardStats } from "@/features/dashboard/dashboardSlice";
import { CONTENT_NAMESPACES } from "@/lib/constants";

function greetingForHour(hour: number): string {
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

const quickActions = [
  {
    href: "/admin/admins",
    label: "Create admin",
    description: "Add portal accounts with admin roles",
    icon: Plus,
  },
  {
    href: "/admin/content/daily_tip",
    label: "Daily tips",
    description: "Manage week-based health tips",
    icon: Lightbulb,
  },
  {
    href: "/admin/pregnancy-weeks",
    label: "Pregnancy weeks",
    description: "Edit week-by-week guidance",
    icon: Heart,
  },
  {
    href: "/admin/pregnancy",
    label: "Mothers",
    description: "Review EDD and gestational weeks",
    icon: Activity,
  },
];

export default function DashboardPage() {
  const dispatch = useAppDispatch();
  const user = useAppSelector((state) => state.auth.user);
  const { stats, loading, error } = useAppSelector((state) => state.dashboard);

  useEffect(() => {
    dispatch(fetchDashboardStats());
  }, [dispatch]);

  const greeting = useMemo(() => {
    const name = user?.name?.split(" ")[0] || "Admin";
    return `${greetingForHour(new Date().getHours())}, ${name}`;
  }, [user?.name]);

  const totalPlatformRecords =
    stats.profiles +
    stats.mothers +
    stats.pregnancyLogs +
    stats.childProfiles +
    stats.appointments;

  return (
    <>
      <PageHero
        title={greeting}
        description="Overview of ICare MC content, users, and health tracking"
        icon={LayoutDashboard}
        stat={{
          label: "Platform records",
          value: loading ? "…" : totalPlatformRecords.toLocaleString(),
        }}
      />

      <div className="mx-auto max-w-[1200px] space-y-8 px-6 py-8 lg:px-8">
        {error ? (
          <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-600">
            {error}
          </div>
        ) : null}

        <section>
          <div className="mb-4 flex items-end justify-between gap-4">
            <div>
              <h2 className="admin-section-title">Platform activity</h2>
              <p className="admin-section-desc">
                Users and health data from the mobile app
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              disabled={loading}
              onClick={() => dispatch(fetchDashboardStats())}
            >
              Refresh
            </Button>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard
              label="Total users"
              value={stats.profiles}
              href="/admin/users"
              icon={Users}
              loading={loading}
              description={`${stats.adminUsers} admin${stats.adminUsers === 1 ? "" : "s"}`}
              accent="emerald"
            />
            <StatCard
              label="Mothers"
              value={stats.mothers}
              href="/admin/pregnancy"
              icon={Heart}
              loading={loading}
              description="Active pregnancy profiles"
              accent="teal"
            />
            <StatCard
              label="Logs this week"
              value={stats.recentLogs}
              href="/admin/health-logs"
              icon={Activity}
              loading={loading}
              description={`${stats.pregnancyLogs} total logs`}
              accent="cyan"
            />
            <StatCard
              label="Appointments"
              value={stats.appointments}
              href="/admin/appointments"
              icon={CalendarCheck2}
              loading={loading}
              description={`${stats.childProfiles} child profiles`}
              accent="amber"
            />
          </div>
        </section>

        <section>
          <div className="mb-4">
            <h2 className="admin-section-title">Content</h2>
            <p className="admin-section-desc">
              CMS items synced to the mobile app
            </p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            <StatCard
              label="Content items"
              value={stats.contentItems}
              href="/admin/content"
              icon={BookOpen}
              loading={loading}
              description="All namespaces combined"
              accent="violet"
            />
            <StatCard
              label="Pregnancy weeks"
              value={stats.pregnancyWeeks}
              href="/admin/pregnancy-weeks"
              icon={Heart}
              loading={loading}
              description="Published week guides"
              accent="emerald"
            />
            <StatCard
              label="Child profiles"
              value={stats.childProfiles}
              href="/admin/children"
              icon={Baby}
              loading={loading}
              description="Post-birth tracking"
              accent="teal"
            />
          </div>
        </section>

        <div className="grid gap-8 lg:grid-cols-2">
          <section className="admin-panel">
            <h2 className="admin-section-title">Quick actions</h2>
            <p className="admin-section-desc mt-1">
              Common admin tasks
            </p>
            <ul className="mt-4 space-y-2">
              {quickActions.map((action) => (
                <li key={action.href}>
                  <Link
                    href={action.href}
                    className="group flex items-center gap-3 rounded-[var(--radius)] border border-gray-200 bg-gray-50 px-4 py-3 transition-colors hover:border-emerald-200 hover:bg-emerald-50/50"
                  >
                    <div className="flex h-9 w-9 items-center justify-center rounded-[var(--radius)] bg-white text-emerald-600 shadow-sm ring-1 ring-gray-200">
                      <action.icon className="h-4 w-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-gray-900">{action.label}</p>
                      <p className="truncate text-xs text-gray-500">
                        {action.description}
                      </p>
                    </div>
                    <ArrowRight className="h-4 w-4 shrink-0 text-gray-400 transition-transform group-hover:translate-x-0.5 group-hover:text-emerald-600" />
                  </Link>
                </li>
              ))}
            </ul>
          </section>

          <section className="admin-panel">
            <h2 className="admin-section-title">
              Content namespaces
            </h2>
            <p className="admin-section-desc mt-1">
              Localized content in English, Amharic, and Oromo
            </p>
            <ul className="mt-4 space-y-2">
              {CONTENT_NAMESPACES.map((item) => (
                <li key={item.value}>
                  <Link
                    href={`/admin/content/${item.value}`}
                    className="group flex items-start gap-3 rounded-[var(--radius)] border border-gray-200 px-4 py-3 transition-colors hover:border-emerald-200 hover:bg-emerald-50/50"
                  >
                    <FileText className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-gray-900">{item.label}</p>
                      <p className="text-xs text-gray-500">{item.description}</p>
                    </div>
                    <ArrowRight className="h-4 w-4 shrink-0 text-gray-400 opacity-0 transition-opacity group-hover:opacity-100" />
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        </div>

        {user?.email ? (
          <p className="text-center text-xs text-gray-400">
            Signed in as {user.email}
          </p>
        ) : null}
      </div>
    </>
  );
}
