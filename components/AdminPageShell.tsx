"use client";

import { useState } from "react";
import { Menu } from "lucide-react";
import AuthGuard from "@/components/AuthGuard";
import RoleGuard from "@/components/RoleGuard";
import Sidebar from "@/components/Sidebar";

export default function AdminPageShell({
  children,
}: {
  children: React.ReactNode;
}) {
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  return (
    <AuthGuard>
      <div className="flex h-screen overflow-hidden bg-background">
        <Sidebar
          mobileOpen={mobileNavOpen}
          onCloseMobile={() => setMobileNavOpen(false)}
        />

        <div className="flex min-w-0 flex-1 flex-col lg:ml-[260px]">
          <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-gray-200 bg-white px-4 lg:hidden">
            <button
              type="button"
              onClick={() => setMobileNavOpen(true)}
              className="inline-flex h-9 w-9 items-center justify-center rounded-[var(--radius)] text-gray-700 hover:bg-gray-100"
              aria-label="Open menu"
            >
              <Menu className="h-5 w-5" />
            </button>
            <span className="font-heading text-sm font-semibold text-gray-900">
              ICare MC Admin
            </span>
          </header>

          <main className="min-w-0 flex-1 overflow-y-auto">
            <RoleGuard>{children}</RoleGuard>
          </main>
        </div>
      </div>
    </AuthGuard>
  );
}
