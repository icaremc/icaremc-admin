"use client";

import AuthGuard from "@/components/AuthGuard";
import RoleGuard from "@/components/RoleGuard";
import Sidebar from "@/components/Sidebar";

export default function AdminPageShell({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthGuard>
      <div className="flex h-screen overflow-hidden bg-background">
        <Sidebar />
        <main className="ml-[260px] min-w-0 flex-1 overflow-y-auto">
          <RoleGuard>{children}</RoleGuard>
        </main>
      </div>
    </AuthGuard>
  );
}
