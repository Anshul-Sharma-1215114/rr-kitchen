// In production the web app (Vercel) and API (Render, or wherever) live on
// completely different domains, so NEXT_PUBLIC_API_URL — baked in at build
// time — is the source of truth whenever it's set.
//
// Without it (local/LAN dev), the API is resolved at runtime from the
// page's own origin on a fixed port instead, so the app works correctly
// from any host the page is loaded through: localhost during normal dev, or
// the machine's LAN IP when testing from a phone/tablet on the same
// network — without needing a separate env value per host.
//
// This matters beyond convenience: the auth cookie is `sameSite: "lax"`,
// which browsers withhold on cross-site fetch/XHR requests. If the page's
// host and the API's host ever differ unexpectedly (e.g. page loaded via
// "localhost" but API hardcoded to a LAN IP, or vice versa), every request
// past login silently drops the cookie and the user gets bounced back to
// login — with no error message pointing at why. Deriving the dev-mode API
// host from `window.location.hostname` guarantees they always match.
const API_PORT = process.env.NEXT_PUBLIC_API_PORT ?? "4000";
const API_URL = process.env.NEXT_PUBLIC_API_URL;

export function getApiUrl(): string {
  if (API_URL) return API_URL;
  if (typeof window !== "undefined") {
    return `${window.location.protocol}//${window.location.hostname}:${API_PORT}`;
  }
  // Server-side (SSR/build) with no explicit URL and no browser origin to derive from.
  return `http://localhost:${API_PORT}`;
}

// Uploaded images (menu item/combo photos) are stored as API-relative paths
// (e.g. "/uploads/abc.jpg") and served by the API itself, not the web app —
// so rendering them needs the API origin prefixed on, same as any other API
// call.
export function resolveImageUrl(url: string | null): string | null {
  if (!url) return null;
  if (/^https?:\/\//.test(url)) return url;
  return `${getApiUrl()}${url}`;
}
