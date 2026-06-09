"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import {
  Activity,
  Baby,
  BookOpen,
  ChevronDown,
  ChevronRight,
  FileText,
  Heart,
  LayoutDashboard,
  LogOut,
  Shield,
  Users,
} from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import { CONTENT_NAMESPACES } from "@/lib/constants";
import { cn } from "@/lib/utils";

const healthDataItems = [
  { href: "/admin/pregnancy", label: "Pregnancies", icon: Heart },
  { href: "/admin/health-logs", label: "Weekly vitals", icon: Activity },
  { href: "/admin/children", label: "Children", icon: Baby },
];

const contentSubItems = [
  { href: "/admin/content", label: "Overview", icon: BookOpen },
  { href: "/admin/pregnancy-weeks", label: "Pregnancy weeks", icon: Heart },
  ...CONTENT_NAMESPACES.map((item) => ({
    href: `/admin/content/${item.value}`,
    label: item.label,
    icon: FileText,
  })),
];

function navClass(active: boolean) {
  return active
    ? "bg-emerald-50 text-emerald-700 font-medium"
    : "text-gray-600 hover:bg-gray-50 hover:text-gray-900";
}

function iconClass(active: boolean) {
  return active
    ? "text-emerald-600"
    : "text-gray-400 group-hover:text-gray-600";
}

export default function Sidebar() {
  const pathname = usePathname();
  const isContentActive =
    pathname?.startsWith("/admin/content") ||
    pathname?.startsWith("/admin/pregnancy-weeks");
  const isHealthActive = healthDataItems.some(
    (item) =>
      pathname === item.href || pathname?.startsWith(`${item.href}/`),
  );
  const [isContentOpen, setIsContentOpen] = useState(
    () => isContentActive,
  );
  const [isHealthOpen, setIsHealthOpen] = useState(() => isHealthActive);

  useEffect(() => {
    if (isContentActive) setIsContentOpen(true);
  }, [isContentActive]);

  useEffect(() => {
    if (isHealthActive) setIsHealthOpen(true);
  }, [isHealthActive]);

  return (
    <aside className="fixed left-0 top-0 z-40 flex h-screen w-[260px] flex-col border-r border-gray-200 bg-white">
      <div className="flex h-16 shrink-0 items-center gap-3 border-b border-gray-200 px-5">
        <div className="flex h-8 w-8 items-center justify-center rounded-[var(--radius)] bg-gradient-to-br from-emerald-500 to-teal-600 text-xs font-bold text-white">
          IC
        </div>
        <span className="font-heading text-[15px] font-semibold tracking-normal text-gray-900">
          ICare MC Admin
        </span>
      </div>

      <div className="flex-1 overflow-y-auto px-3 py-4">
        <nav>
          <ul className="space-y-0.5">
            <li>
              <Link
                href="/admin/dashboard"
                className={cn(
                  "group flex items-center gap-3 rounded-[var(--radius)] px-3 py-2.5 text-[15px] transition-colors",
                  navClass(pathname === "/admin/dashboard"),
                )}
              >
                <LayoutDashboard
                  className={cn("h-4 w-4", iconClass(pathname === "/admin/dashboard"))}
                />
                <span>Dashboard</span>
              </Link>
            </li>

            <li className="pt-5">
              <p className="mb-2 px-3 text-[11px] font-semibold uppercase tracking-wider text-gray-400">
                Content Management
              </p>
              <button
                type="button"
                onClick={() => setIsContentOpen(!isContentOpen)}
                className={cn(
                  "group flex w-full items-center justify-between gap-3 rounded-[var(--radius)] px-3 py-2.5 text-[15px] transition-colors",
                  navClass(!!isContentActive),
                )}
              >
                <div className="flex items-center gap-3">
                  <BookOpen
                    className={cn("h-4 w-4", iconClass(!!isContentActive))}
                  />
                  <span>Content</span>
                </div>
                {isContentOpen ? (
                  <ChevronDown className="h-4 w-4 text-gray-400" />
                ) : (
                  <ChevronRight className="h-4 w-4 text-gray-400" />
                )}
              </button>
              {isContentOpen ? (
                <ul className="ml-4 mt-0.5 space-y-0.5 border-l border-gray-100 pl-3">
                  {contentSubItems.map(({ href, label, icon: Icon }) => {
                    const active =
                      pathname === href ||
                      (href !== "/admin/content" &&
                        pathname?.startsWith(`${href}/`));
                    return (
                      <li key={href}>
                        <Link
                          href={href}
                          className={cn(
                            "group flex items-center gap-3 rounded-[var(--radius)] px-3 py-2 text-sm transition-colors",
                            navClass(active),
                          )}
                        >
                          <Icon className={cn("h-3.5 w-3.5", iconClass(active))} />
                          <span>{label}</span>
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              ) : null}
            </li>

            <li className="pt-5">
              <p className="mb-2 px-3 text-[11px] font-semibold uppercase tracking-wider text-gray-400">
                Health Data
              </p>
              <button
                type="button"
                onClick={() => setIsHealthOpen(!isHealthOpen)}
                className={cn(
                  "group flex w-full items-center justify-between gap-3 rounded-[var(--radius)] px-3 py-2.5 text-[15px] transition-colors",
                  navClass(isHealthActive),
                )}
              >
                <div className="flex items-center gap-3">
                  <Heart className={cn("h-4 w-4", iconClass(isHealthActive))} />
                  <span>Records</span>
                </div>
                {isHealthOpen ? (
                  <ChevronDown className="h-4 w-4 text-gray-400" />
                ) : (
                  <ChevronRight className="h-4 w-4 text-gray-400" />
                )}
              </button>
              {isHealthOpen ? (
                <ul className="ml-4 mt-0.5 space-y-0.5 border-l border-gray-100 pl-3">
                  {healthDataItems.map(({ href, label, icon: Icon }) => {
                    const active = pathname === href;
                    return (
                      <li key={href}>
                        <Link
                          href={href}
                          className={cn(
                            "group flex items-center gap-3 rounded-[var(--radius)] px-3 py-2 text-sm transition-colors",
                            navClass(active),
                          )}
                        >
                          <Icon className={cn("h-3.5 w-3.5", iconClass(active))} />
                          <span>{label}</span>
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              ) : null}
            </li>

            <li className="pt-5">
              <p className="mb-2 px-3 text-[11px] font-semibold uppercase tracking-wider text-gray-400">
                Users
              </p>
              <ul className="space-y-0.5">
                <li>
                  <Link
                    href="/admin/users"
                    className={cn(
                      "group flex items-center gap-3 rounded-[var(--radius)] px-3 py-2.5 text-[15px] transition-colors",
                      navClass(pathname === "/admin/users"),
                    )}
                  >
                    <Users
                      className={cn("h-4 w-4", iconClass(pathname === "/admin/users"))}
                    />
                    <span>App users</span>
                  </Link>
                </li>
                <li>
                  <Link
                    href="/admin/admins"
                    className={cn(
                      "group flex items-center gap-3 rounded-[var(--radius)] px-3 py-2.5 text-[15px] transition-colors",
                      navClass(pathname === "/admin/admins"),
                    )}
                  >
                    <Shield
                      className={cn("h-4 w-4", iconClass(pathname === "/admin/admins"))}
                    />
                    <span>Admins</span>
                  </Link>
                </li>
              </ul>
            </li>
          </ul>
        </nav>
      </div>

      <div className="shrink-0 border-t border-gray-200 px-4 py-4">
        <button
          type="button"
          onClick={async () => {
            await supabase.auth.signOut();
            location.href = "/";
          }}
          className="inline-flex w-full items-center justify-center gap-2 rounded-[var(--radius)] border border-gray-200 px-3 py-2.5 text-sm text-gray-700 transition-colors hover:bg-gray-50"
        >
          <LogOut className="h-4 w-4" />
          Sign out
        </button>
        <p className="mt-3 text-center text-xs text-gray-500">
          © {new Date().getFullYear()} ICare MC
        </p>
      </div>
    </aside>
  );
}
