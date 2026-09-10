import { RoleGuard } from "@/components/role-guard";
import { AdminNav } from "@/components/admin-nav";

export default function AdminDashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <RoleGuard role="ADMIN" loginPath="/admin/login">
      <AdminNav />
      <main className="mx-auto max-w-6xl px-4 py-6">{children}</main>
    </RoleGuard>
  );
}
