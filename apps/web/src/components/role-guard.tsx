"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import type { Role } from "@rr-kitchen/shared";
import { useAuth } from "@/lib/auth-context";

export function RoleGuard({
  role,
  loginPath,
  children,
}: {
  role: Role;
  loginPath: string;
  children: React.ReactNode;
}) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && user?.role !== role) {
      router.replace(loginPath);
    }
  }, [loading, user, role, loginPath, router]);

  if (loading || user?.role !== role) {
    return (
      <main className="flex min-h-screen items-center justify-center">
        <p className="text-charcoal/50">Loading...</p>
      </main>
    );
  }

  return <>{children}</>;
}
