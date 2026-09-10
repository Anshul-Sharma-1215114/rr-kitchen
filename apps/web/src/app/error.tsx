"use client";

import { useEffect } from "react";
import Link from "next/link";
import { LogoMark } from "@/components/logo-mark";

// Next.js renders this in place of the page for any rendering error not
// caught closer to the source — a bad API response shape, a null
// reference, anything unexpected. Without this, that class of bug showed
// a blank white screen with no way back except manually editing the URL.
// Self-contained rather than reusing Header/Footer for the same reason as
// not-found.tsx: an error this high up may have happened inside a
// provider those depend on, so it can't assume that context is healthy.
export default function ErrorBoundary({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    // eslint-disable-next-line no-console
    console.error("Unhandled page error:", error);
  }, [error]);

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 bg-cream-50 px-4 text-center">
      <LogoMark className="h-16 w-16" />
      <h1 className="font-display text-3xl font-semibold text-charcoal">Something went wrong</h1>
      <p className="max-w-sm text-charcoal/60">
        We hit a snag loading this page. It's usually temporary — try again, or head back home.
      </p>
      <div className="mt-2 flex flex-wrap justify-center gap-3">
        <button
          onClick={reset}
          className="rounded-full bg-spice-500 px-6 py-2.5 font-medium text-white shadow-sm transition hover:bg-spice-600"
        >
          Try again
        </button>
        <Link
          href="/"
          className="rounded-full border border-spice-300 px-6 py-2.5 font-medium text-spice-700 transition hover:bg-spice-50"
        >
          Back to RR Kitchen
        </Link>
      </div>
    </main>
  );
}
