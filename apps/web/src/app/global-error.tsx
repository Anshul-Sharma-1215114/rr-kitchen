"use client";

// Last-resort boundary for an error in the root layout itself (rare — most
// failures are caught by error.tsx below it). Next.js requires this file
// to render its own <html>/<body>, since the root layout that normally
// provides them is what failed. Deliberately plain inline styles, not
// Tailwind classes or the brand fonts — if the app got this broken, don't
// also depend on the CSS pipeline having loaded correctly.
export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="en">
      <body style={{ margin: 0, minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "system-ui, sans-serif", background: "#FDF6EC", color: "#3E2723" }}>
        <div style={{ textAlign: "center", padding: "1.5rem" }}>
          <h1 style={{ fontSize: "1.5rem", fontWeight: 600, marginBottom: "0.5rem" }}>RR Kitchen hit a problem</h1>
          <p style={{ color: "#3E272399", marginBottom: "1rem" }}>Please try again in a moment.</p>
          <button
            onClick={reset}
            style={{ borderRadius: 999, background: "#D97748", color: "white", padding: "0.6rem 1.5rem", border: "none", fontWeight: 500 }}
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}
