"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch, ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";

export default function CustomerLoginPage() {
  const router = useRouter();
  const { user, loading, refresh } = useAuth();

  // Logging in used router.push, which leaves /login sitting in browser
  // history right behind the page it redirected to — so pressing the
  // browser's Back button landed back on this form, showing "logged out"
  // even though the session was (and still is) perfectly valid. This
  // catches that case (and the same thing via bfcache, or someone just
  // navigating to /login by hand while already signed in) by bouncing away
  // the moment auth state resolves to an existing session, on every mount
  // of this page — not only right after a fresh login.
  useEffect(() => {
    if (!loading && user) router.replace("/");
  }, [loading, user, router]);

  const [step, setStep] = useState<"phone" | "otp">("phone");
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [devCode, setDevCode] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleRequestOtp(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const data = await apiFetch<{ devCode?: string }>("/api/auth/customer/otp/request", {
        method: "POST",
        body: JSON.stringify({ phone }),
      });
      setDevCode(data.devCode ?? null);
      setStep("otp");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to send OTP");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleVerifyOtp(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await apiFetch("/api/auth/customer/otp/verify", {
        method: "POST",
        body: JSON.stringify({ phone, code, name: name || undefined }),
      });
      await refresh();
      router.replace("/");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to verify OTP");
    } finally {
      setSubmitting(false);
    }
  }

  // Avoids a flash of the login form for an already-authenticated visitor
  // in the instant before the redirect effect above fires.
  if (loading || user) {
    return (
      <main className="flex items-center justify-center py-24">
        <p className="text-charcoal/50">Loading...</p>
      </main>
    );
  }

  return (
    <main className="mx-auto flex max-w-sm flex-col justify-center gap-6 px-4 py-20">
      <h1 className="text-2xl font-bold text-spice-600">Log in to RR Kitchen</h1>

      {step === "phone" ? (
        <form onSubmit={handleRequestOtp} className="flex flex-col gap-4">
          <label className="flex flex-col gap-1 text-sm">
            Phone number
            <input
              type="tel"
              required
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="9876543210"
              className="rounded-lg border border-charcoal/20 px-4 py-2 focus:border-spice-400 focus:outline-none"
            />
          </label>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <button
            type="submit"
            disabled={submitting}
            className="rounded-full bg-spice-500 px-6 py-2 font-medium text-white hover:bg-spice-600 disabled:opacity-50"
          >
            {submitting ? "Sending..." : "Send OTP"}
          </button>
        </form>
      ) : (
        <form onSubmit={handleVerifyOtp} className="flex flex-col gap-4">
          {devCode && (
            <p className="rounded-lg bg-leaf-100 px-4 py-2 text-sm text-leaf-800">
              Dev mode: your OTP is <span className="font-mono font-semibold">{devCode}</span>
            </p>
          )}
          <label className="flex flex-col gap-1 text-sm">
            Your name (first time only)
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Optional"
              className="rounded-lg border border-charcoal/20 px-4 py-2 focus:border-spice-400 focus:outline-none"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            Enter 4-digit OTP
            <input
              type="text"
              required
              maxLength={4}
              value={code}
              onChange={(e) => setCode(e.target.value)}
              className="rounded-lg border border-charcoal/20 px-4 py-2 tracking-widest focus:border-spice-400 focus:outline-none"
            />
          </label>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <button
            type="submit"
            disabled={submitting}
            className="rounded-full bg-spice-500 px-6 py-2 font-medium text-white hover:bg-spice-600 disabled:opacity-50"
          >
            {submitting ? "Verifying..." : "Verify & continue"}
          </button>
          <button
            type="button"
            onClick={() => setStep("phone")}
            className="text-sm text-charcoal/50 underline"
          >
            Change phone number
          </button>
        </form>
      )}
    </main>
  );
}
