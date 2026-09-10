import Link from "next/link";
import { LogoMark } from "@/components/logo-mark";

// Root-level boundary: Next.js renders this for any route that doesn't
// match anywhere in the app, bypassing the (shop)/(admin)/(delivery)
// layouts entirely (none of them matched) — so it can't rely on Header/
// Footer, which need CartProvider/AuthProvider context those layouts set
// up. Kept deliberately self-contained and on-brand instead of falling
// back to Next's plain default, which was a jarring, unbranded dead end
// for anyone hitting a bad link.
export default function NotFound() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 bg-cream-50 px-4 text-center">
      <LogoMark className="h-16 w-16" />
      <h1 className="font-display text-3xl font-semibold text-charcoal">Page not found</h1>
      <p className="max-w-sm text-charcoal/60">
        We couldn&apos;t find what you were looking for. It may have moved, or the link might be off.
      </p>
      <Link
        href="/"
        className="mt-2 rounded-full bg-spice-500 px-6 py-2.5 font-medium text-white shadow-sm transition hover:bg-spice-600"
      >
        Back to RR Kitchen
      </Link>
    </main>
  );
}
