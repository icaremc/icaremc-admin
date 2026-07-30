"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import {
  Baby,
  Activity,
  BookOpen,
  Building2,
  ChevronDown,
  ChevronRight,
  CreditCard,
  DollarSign,
  FileText,
  Heart,
  LayoutDashboard,
  LogOut,
  Megaphone,
  Rocket,
  Settings2,
  Shield,
  Stethoscope,
  CalendarCheck,
  Tags,
  TrendingUp,
  Users,
  Wallet,
  Info,
  type LucideIcon,
} from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import { CONTENT_NAMESPACES } from "@/lib/constants";
import { canAccessRoute } from "@/lib/adminNav";
import { cn } from "@/lib/utils";
import { useAppSelector } from "@/app/store/hooks";
import { ADMIN_ACTIVITY_EVENTS } from "@/lib/activity/events";
import { logAdminPortalEvent } from "@/lib/client/logAdminActivity";

type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  matchPrefix?: boolean;
};

type SidebarProps = {
  mobileOpen?: boolean;
  onCloseMobile?: () => void;
};

const mothersItems: NavItem[] = [
  { href: "/admin/users", label: "Parent", icon: Users, matchPrefix: true },
  { href: "/admin/children", label: "Children", icon: Baby, matchPrefix: true },
];

const doctorsItems: NavItem[] = [
  { href: "/admin/doctors", label: "Doctors", icon: Stethoscope, matchPrefix: true },
  { href: "/admin/doctor-categories", label: "Speciality", icon: Tags },
  { href: "/admin/hospitals", label: "Hospitals", icon: Building2 },
  { href: "/admin/appointments", label: "Appointments", icon: CalendarCheck },
];

const contentItems: NavItem[] = [
  { href: "/admin/content", label: "Overview", icon: BookOpen },
  { href: "/admin/pregnancy-weeks", label: "Pregnancy weeks", icon: Heart, matchPrefix: true },
  { href: "/admin/child-growth", label: "Child milestones", icon: TrendingUp, matchPrefix: true },
  ...CONTENT_NAMESPACES.map((item) => ({
    href: `/admin/content/${item.value}`,
    label: item.label,
    icon: FileText,
    matchPrefix: true,
  })),
];

const appSettingsItems: NavItem[] = [
  { href: "/admin/app-version", label: "App release", icon: Rocket },
  { href: "/admin/about", label: "About the app", icon: Info, matchPrefix: true },
  { href: "/admin/legal", label: "Policies", icon: FileText, matchPrefix: true },
  { href: "/admin/push", label: "Push notifications", icon: Megaphone },
];

const financeItems: NavItem[] = [
  { href: "/admin/finance/payout-request", label: "Payout request", icon: DollarSign },
  { href: "/admin/finance/payment", label: "Payment", icon: CreditCard },
  { href: "/admin/finance/payment-settings", label: "Payment settings", icon: CreditCard },
  { href: "/admin/finance/wallet-transactions", label: "Wallet transactions", icon: Wallet },
  { href: "/admin/finance/settings", label: "Finance settings", icon: Settings2 },
];

const adminItems: NavItem[] = [
  { href: "/admin/activity", label: "Activity log", icon: Activity, matchPrefix: true },
  { href: "/admin/admins", label: "Portal admins", icon: Shield },
];

function navClass(active: boolean) {
  return active
    ? "bg-emerald-50 text-emerald-700 font-medium"
    : "text-gray-600 hover:bg-gray-50 hover:text-gray-900";
}

function iconClass(active: boolean) {
  return active ? "text-emerald-600" : "text-gray-400 group-hover:text-gray-600";
}

function isItemActive(pathname: string | null, item: NavItem) {
  if (!pathname) return false;
  if (pathname === item.href) return true;
  if (!item.matchPrefix) return false;
  if (item.href === "/admin/content") return pathname.startsWith("/admin/content/");
  if (item.href === "/admin/child-growth") {
    return pathname.startsWith("/admin/child-growth") || pathname.startsWith("/admin/followup-visits");
  }
  return pathname.startsWith(`${item.href}/`);
}

function sectionActive(pathname: string | null, items: NavItem[]) {
  return items.some((item) => isItemActive(pathname, item));
}

function NavLink({ item, compact = false, onNavigate }: { item: NavItem; compact?: boolean; onNavigate?: () => void }) {
  const pathname = usePathname();
  const active = isItemActive(pathname, item);
  const Icon = item.icon;

  return (
    <Link
      href={item.href}
      onClick={onNavigate}
      className={cn(
        "group flex items-center gap-3 rounded-[var(--radius)] transition-colors",
        compact ? "px-3 py-2 text-sm" : "px-3 py-2.5 text-[15px]",
        navClass(active),
      )}
    >
      <Icon className={cn(compact ? "h-3.5 w-3.5" : "h-4 w-4", iconClass(active))} />
      <span>{item.label}</span>
    </Link>
  );
}

function NavSection({
  title,
  items,
  defaultOpen,
  compact = false,
  onNavigate,
}: {
  title: string;
  items: NavItem[];
  defaultOpen: boolean;
  compact?: boolean;
  onNavigate?: () => void;
}) {
  const pathname = usePathname();
  const active = sectionActive(pathname, items);
  const [open, setOpen] = useState(defaultOpen || active);

  useEffect(() => {
    if (active) setOpen(true);
  }, [active]);

  return (
    <li className="pt-5">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className={cn(
          "group mb-2 flex w-full items-center justify-between gap-3 rounded-(--radius) px-3 py-1.5 transition-colors",
          active ? "text-emerald-700" : "text-gray-500 hover:text-gray-700",
        )}
      >
        <span className="text-[11px] font-semibold uppercase tracking-wider">{title}</span>
        {open ? <ChevronDown className="h-3.5 w-3.5 shrink-0" /> : <ChevronRight className="h-3.5 w-3.5 shrink-0" />}
      </button>
      {open ? (
        <ul className="ml-1 space-y-0.5 border-l border-gray-100 pl-2">
          {items.map((item) => (
            <li key={item.href}>
              <NavLink item={item} compact={compact} onNavigate={onNavigate} />
            </li>
          ))}
        </ul>
      ) : null}
    </li>
  );
}

export default function Sidebar({ mobileOpen = false, onCloseMobile }: SidebarProps) {
  const pathname = usePathname();
  const adminRole = useAppSelector((state) => state.auth.user?.adminRole);

  useEffect(() => {
    onCloseMobile?.();
  }, [pathname, onCloseMobile]);

  const closeMobile = () => onCloseMobile?.();

  const showDashboard = canAccessRoute(adminRole, "/admin/dashboard");
  const visibleMothers = mothersItems.filter((item) => canAccessRoute(adminRole, item.href));
  const visibleDoctors = doctorsItems.filter((item) => canAccessRoute(adminRole, item.href));
  const visibleContent = contentItems.filter((item) => canAccessRoute(adminRole, item.href));
  const visibleAppSettings = appSettingsItems.filter((item) => canAccessRoute(adminRole, item.href));
  const visibleFinance = financeItems.filter((item) => canAccessRoute(adminRole, item.href));
  const visibleAdmin = adminItems.filter((item) => canAccessRoute(adminRole, item.href));

  return (
    <>
      {mobileOpen ? (
        <button
          type="button"
          className="fixed inset-0 z-40 bg-black/40 lg:hidden"
          onClick={closeMobile}
          aria-label="Close menu"
        />
      ) : null}

      <aside
        className={cn(
          "fixed left-0 top-0 z-50 flex h-screen w-[min(260px,85vw)] flex-col border-r border-gray-200 bg-white transition-transform duration-200 lg:w-[260px]",
          mobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0",
        )}
      >
        <div className="flex h-16 shrink-0 items-center gap-3 border-b border-gray-200 px-5">
          <div className="flex h-8 w-8 items-center justify-center rounded-[var(--radius)] bg-gradient-to-br from-emerald-500 to-teal-600 text-xs font-bold text-white">
            IC
          </div>
          <span className="font-heading text-[15px] font-semibold tracking-normal text-gray-900">ICare MC Admin</span>
        </div>

        <div className="flex-1 overflow-y-auto px-3 py-4">
          <nav>
            <ul className="space-y-0.5">
              <li>
                {showDashboard ? (
                  <Link
                    href="/admin/dashboard"
                    onClick={closeMobile}
                    className={cn(
                      "group flex items-center gap-3 rounded-[var(--radius)] px-3 py-2.5 text-[15px] transition-colors",
                      navClass(pathname === "/admin/dashboard"),
                    )}
                  >
                    <LayoutDashboard className={cn("h-4 w-4", iconClass(pathname === "/admin/dashboard"))} />
                    <span>Dashboard</span>
                  </Link>
                ) : null}
              </li>

              {visibleMothers.length > 0 ? <NavSection title="Parents" items={visibleMothers} defaultOpen={sectionActive(pathname, visibleMothers)} compact onNavigate={closeMobile} /> : null}
              {visibleDoctors.length > 0 ? <NavSection title="Doctors" items={visibleDoctors} defaultOpen={sectionActive(pathname, visibleDoctors)} compact onNavigate={closeMobile} /> : null}
              {visibleContent.length > 0 ? <NavSection title="Content" items={visibleContent} defaultOpen={sectionActive(pathname, visibleContent)} compact onNavigate={closeMobile} /> : null}
              {visibleFinance.length > 0 ? <NavSection title="Finance" items={visibleFinance} defaultOpen={sectionActive(pathname, visibleFinance)} compact onNavigate={closeMobile} /> : null}
              {visibleAdmin.length > 0 ? <NavSection title="Administration" items={visibleAdmin} defaultOpen={sectionActive(pathname, visibleAdmin)} compact onNavigate={closeMobile} /> : null}
              {visibleAppSettings.length > 0 ? <NavSection title="App settings" items={visibleAppSettings} defaultOpen={sectionActive(pathname, visibleAppSettings)} compact onNavigate={closeMobile} /> : null}
            </ul>
          </nav>
        </div>

        <div className="shrink-0 border-t border-gray-200 px-4 py-4">
          <button
            type="button"
            onClick={async () => {
              await logAdminPortalEvent({
                event_type: ADMIN_ACTIVITY_EVENTS.LOGOUT,
                event_label: "Signed out of admin portal",
              });
              await supabase.auth.signOut();
              location.href = "/";
            }}
            className="inline-flex w-full items-center justify-center gap-2 rounded-[var(--radius)] border border-gray-200 px-3 py-2.5 text-sm text-gray-700 transition-colors hover:bg-gray-50"
          >
            <LogOut className="h-4 w-4" />
            Sign out
          </button>
          <p className="mt-3 text-center text-xs text-gray-500">© {new Date().getFullYear()} ICare MC</p>
          <a
            href="https://www.zulu-tech.com"
            target="_blank"
            rel="noreferrer"
            className="mt-1 block text-center text-xs text-gray-400 underline-offset-2 hover:text-gray-600 hover:underline"
          >
            Developed by Zulu Tech
          </a>
        </div>
      </aside>
    </>
  );
}
