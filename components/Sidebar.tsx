"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
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
  Megaphone,
  Shield,
  Stethoscope,
  CalendarCheck,
  Tags,
  Users,
  type LucideIcon,
} from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import { CONTENT_NAMESPACES } from "@/lib/constants";
import { cn } from "@/lib/utils";

type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  matchPrefix?: boolean;
};

const mothersItems: NavItem[] = [
  { href: "/admin/users", label: "App users", icon: Users, matchPrefix: true },
  { href: "/admin/pregnancy", label: "Pregnancies", icon: Heart },
  { href: "/admin/children", label: "Children", icon: Baby, matchPrefix: true },
  { href: "/admin/health-logs", label: "Weekly vitals", icon: Activity },
];

const doctorsItems: NavItem[] = [
  { href: "/admin/doctors", label: "Doctors", icon: Stethoscope, matchPrefix: true },
  { href: "/admin/doctor-categories", label: "Categories", icon: Tags },
  { href: "/admin/appointments", label: "Appointments", icon: CalendarCheck },
];

const contentItems: NavItem[] = [
  { href: "/admin/content", label: "Overview", icon: BookOpen },
  { href: "/admin/pregnancy-weeks", label: "Pregnancy weeks", icon: Heart, matchPrefix: true },
  ...CONTENT_NAMESPACES.map((item) => ({
    href: `/admin/content/${item.value}`,
    label: item.label,
    icon: FileText,
    matchPrefix: true,
  })),
];

const adminItems: NavItem[] = [
  { href: "/admin/push", label: "Push notifications", icon: Megaphone },
  { href: "/admin/admins", label: "Portal admins", icon: Shield },
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

function isItemActive(pathname: string | null, item: NavItem) {
  if (!pathname) return false;
  if (pathname === item.href) return true;
  if (!item.matchPrefix) return false;
  if (item.href === "/admin/content") {
    return pathname.startsWith("/admin/content/");
  }
  return pathname.startsWith(`${item.href}/`);
}

function sectionActive(pathname: string | null, items: NavItem[]) {
  return items.some((item) => isItemActive(pathname, item));
}

function NavLink({ item, compact = false }: { item: NavItem; compact?: boolean }) {
  const pathname = usePathname();
  const active = isItemActive(pathname, item);
  const Icon = item.icon;

  return (
    <Link
      href={item.href}
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
}: {
  title: string;
  items: NavItem[];
  defaultOpen: boolean;
  compact?: boolean;
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
          "group mb-2 flex w-full items-center justify-between gap-3 rounded-[var(--radius)] px-3 py-1.5 transition-colors",
          active ? "text-emerald-700" : "text-gray-500 hover:text-gray-700",
        )}
      >
        <span className="text-[11px] font-semibold uppercase tracking-wider">
          {title}
        </span>
        {open ? (
          <ChevronDown className="h-3.5 w-3.5 shrink-0" />
        ) : (
          <ChevronRight className="h-3.5 w-3.5 shrink-0" />
        )}
      </button>
      {open ? (
        <ul className="ml-1 space-y-0.5 border-l border-gray-100 pl-2">
          {items.map((item) => (
            <li key={item.href}>
              <NavLink item={item} compact={compact} />
            </li>
          ))}
        </ul>
      ) : null}
    </li>
  );
}

function FlatSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <li className="pt-5">
      <p className="mb-2 px-3 text-[11px] font-semibold uppercase tracking-wider text-gray-400">
        {title}
      </p>
      <ul className="space-y-0.5">{children}</ul>
    </li>
  );
}

export default function Sidebar() {
  const pathname = usePathname();

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

            <NavSection
              title="Mothers"
              items={mothersItems}
              defaultOpen={sectionActive(pathname, mothersItems)}
              compact
            />

            <NavSection
              title="Doctors"
              items={doctorsItems}
              defaultOpen={sectionActive(pathname, doctorsItems)}
              compact
            />

            <NavSection
              title="Content"
              items={contentItems}
              defaultOpen={sectionActive(pathname, contentItems)}
              compact
            />

            <FlatSection title="Administration">
              {adminItems.map((item) => (
                <li key={item.href}>
                  <NavLink item={item} />
                </li>
              ))}
            </FlatSection>
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
