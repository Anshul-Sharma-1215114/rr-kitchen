"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { Role } from "@rr-kitchen/shared";
import { apiFetch, ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { LogoMark } from "@/components/logo-mark";

export function StaffLoginForm({
  title,
  redirectTo,
  role,
}: {
  title: string;
  redirectTo: string;
  role: Role;
}) {
  const router = useRouter();
  const { user, loading, refresh } = useAuth();

  // Same fix as the customer login page: logging in used router.push,
  // which left /admin/login (or /delivery/login) sitting in history right
  // behind the dashboard it redirected to, so the browser's Back button
  // landed back on this form — looking exactly like the session had been
  // lost, even though it hadn't. Bounces away on every mount once auth
  // state resolves to a session with the matching role, not just right
  // after a fresh login.
  useEffect(() => {
    if (!loading && user?.role === role) router.replace(redirectTo);
  }, [loading, user, role, redirectTo, router]);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await apiFetch("/api/auth/staff/login", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      });
      await refresh();
      router.replace(redirectTo);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Login failed");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading || user?.role === role) {
    return (
      <main className="flex min-h-screen items-center justify-center">
        <p className="text-charcoal/50">Loading...</p>
      </main>
    );
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center gap-6 px-4">
      <div className="flex flex-col items-center gap-3 text-center">
        <LogoMark className="h-14 w-14" />
        <h1 className="font-display text-2xl font-semibold text-spice-600">{title}</h1>
      </div>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <label className="flex flex-col gap-1 text-sm">
          Email
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="rounded-lg border border-charcoal/20 px-4 py-2 focus:border-spice-400 focus:outline-none"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Password
          <input
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="rounded-lg border border-charcoal/20 px-4 py-2 focus:border-spice-400 focus:outline-none"
          />
        </label>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button
          type="submit"
          disabled={submitting}
          className="rounded-full bg-spice-500 px-6 py-2 font-medium text-white hover:bg-spice-600 disabled:opacity-50"
        >
          {submitting ? "Logging in..." : "Log in"}
        </button>
      </form>
    </main>
  );
}
