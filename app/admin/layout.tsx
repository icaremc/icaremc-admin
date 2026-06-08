import AdminPageShell from "@/components/AdminPageShell";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AdminPageShell>{children}</AdminPageShell>;
}
