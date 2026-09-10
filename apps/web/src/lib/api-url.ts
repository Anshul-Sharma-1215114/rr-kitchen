// The API always runs on the same host as the page, on a fixed port — this
// is resolved at runtime from the page's own origin (not a single baked-in
// build-time URL) so the app works correctly from any host the page is
// loaded through: localhost during normal dev, or the machine's LAN IP when
// testing from a phone/tablet on the same network.
//
// This matters beyond convenience: the auth cookie is `sameSite: "lax"`,
// which browsers withhold on cross-site fetch/XHR requests. If the page's
// host and the API's host ever differ (e.g. page loaded via "localhost" but
// API hardcoded to a LAN IP, or vice versa), every request past login
// silently drops the cookie and the user gets bounced back to login — with
// no error message pointing at why. Deriving the API host from
// `window.location.hostname` guarantees they always match.
const API_PORT = process.env.NEXT_PUBLIC_API_PORT ?? "4000";

export function getApiUrl(): string {
  if (typeof window !== "undefined") {
    return `${window.location.protocol}//${window.location.hostname}:${API_PORT}`;
  }
  // Server-side (SSR/build): no browser origin to derive from.
  return process.env.NEXT_PUBLIC_API_URL ?? `http://localhost:${API_PORT}`;
}
