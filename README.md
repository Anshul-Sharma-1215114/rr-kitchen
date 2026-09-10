# RR Kitchen

Full-stack ordering platform for RR Kitchen: customer web app, seller/admin
dashboard, and delivery agent portal, sharing one PostgreSQL database.

## Architecture

- `apps/web` — Next.js 14 (App Router) + TypeScript + Tailwind. Pure frontend,
  talks to the API over REST and (from Phase 2 onward) Socket.io.
- `apps/server` — Express + TypeScript + Socket.io + Prisma. REST API, auth,
  real-time events.
- `packages/shared` — TypeScript types shared by both apps (roles, order
  status, etc). Mirrors the Prisma enums by hand since the web app doesn't
  generate its own Prisma client.

## Prerequisites

- Node.js 20+
- A PostgreSQL instance — either `docker compose up -d` (see below) or a
  native install. This machine already has PostgreSQL 17 running natively on
  port 5432, so `docker-compose.yml` is provided but wasn't needed here; if
  you use it elsewhere, stop any native Postgres on 5432 first to avoid a
  port clash.

## First-time setup

```bash
# 1. Install dependencies for both apps
npm install

# 2. Start Postgres (skip if you already have one running — see above)
docker compose up -d

# 2b. Create the app's role + database (skip if using docker compose, which
#     creates them for you from the env vars in docker-compose.yml)
psql -U postgres -c "CREATE ROLE rrkitchen WITH LOGIN PASSWORD 'rrkitchen' CREATEDB;"
psql -U postgres -c "CREATE DATABASE rrkitchen OWNER rrkitchen;"

# 3. Configure environment variables
cp apps/server/.env.example apps/server/.env
cp apps/web/.env.example apps/web/.env.local

# 4. Create the database schema
npm run prisma:migrate

# 5. Seed realistic placeholder data (menu, categories, a combo meal,
#    admin + delivery agent accounts, shop config)
npm run prisma:seed
```

## Running locally

```bash
npm run dev
```

This starts both the API server (http://localhost:4000) and the web app
(http://localhost:3000) together.

- Customer login: http://localhost:3000/login — phone + OTP. In development
  the OTP is echoed back in the API response and printed to the server
  console (no real SMS provider is wired up yet — see
  `apps/server/src/services/otp.service.ts`).
- Admin login: http://localhost:3000/admin/login — seeded account
  `admin@rrkitchen.local` / `admin123`.
- Delivery agent login: http://localhost:3000/delivery/login — seeded account
  `agent1@rrkitchen.local` / `agent123`.

## Useful commands

| Command                    | What it does                                  |
| --------------------------- | ---------------------------------------------- |
| `npm run dev`               | Run both apps in dev mode                      |
| `npm run prisma:migrate`    | Apply Prisma migrations (dev)                  |
| `npm run prisma:seed`       | Re-run the seed script                         |
| `npm run prisma:studio`     | Open Prisma Studio to browse the database      |
| `npm run build`             | Production build of both apps                  |

## Current status

**Phase 1 complete:** monorepo scaffold, full Prisma schema, migrations,
seed data, and end-to-end auth (customer OTP + admin/delivery-agent
email+password) with role-protected pages on the web app.

**Phase 2 complete:** the full customer app — menu browsing with
search/veg/price filters, the combo/thali builder with per-slot
substitutions, cart (persisted in localStorage), delivery/takeaway/dine-in
order types, geofenced address entry with a Google Maps picker (falls back
to browser geolocation + manual lat/lng when no Maps key is configured),
coupons, Cash on Delivery / UPI-at-the-door checkout, order creation with
server-side price recalculation, real-time order status tracking over
Socket.io, order history with reorder, and post-delivery ratings/reviews.
Verified end-to-end via the API (auth, geofencing accept/reject, order
pricing math, coupon math, the full status pipeline, and a live
Socket.io status push) — not yet click-tested in an actual browser, since
this environment has no browser available; `npm run build` compiles all
routes cleanly as a proxy for that.

**Phase 3 complete:** the seller/admin dashboard at `/admin` — menu &
category management with image upload (multer, written into
`apps/web/public/uploads`), the combo builder (add/edit/delete, swappable
slots), instant sold-out toggles that broadcast live to every connected
customer browser (anonymous sockets included) over Socket.io, a live
incoming-orders feed with an accept/reject quick-action and a synthesized
audio alert (Web Audio API, no asset file needed), full order management
(status pipeline, delivery-agent assignment restricted to delivery orders),
delivery agent management (create agents, activate/deactivate), shop
config (location, delivery radius, operating hours, min order value, tax,
distance-based fee slabs), coupon CRUD, customer list/detail/block (a
blocked customer is rejected at OTP login), and analytics (sales by day,
order volume, average order value, best-selling items). Verified via the
API: menu CRUD including a real image upload served back through the web
app's `/uploads` path, sold-out toggle disappearing from the public menu,
agent assignment restricted to delivery-type orders, shop config/fee-slab
updates, coupon create/deactivate, customer block blocking login, and the
analytics numbers. Same browser-testing caveat as Phase 2: not click-tested
in an actual browser, since none is available in this environment —
`npm run build` compiles all 19 routes cleanly as a proxy for that.

**Phase 4 complete:** the delivery agent portal at `/delivery` — assigned
deliveries split into active/history, one-tap Google Maps directions links
to both the shop and the customer address (a public Maps deep link, so no
API key is needed for this part), pickup/delivered status buttons (mapped
onto the existing `OUT_FOR_DELIVERY`/`DELIVERED` statuses — the spec's
"Picked Up → On the Way" collapse into the single `OUT_FOR_DELIVERY` step
already in the Phase 1 schema, to avoid a mid-project enum migration for a
wording difference), and automatic live location sharing: while any order
is `OUT_FOR_DELIVERY`, the browser's Geolocation API is watched and the
position is emitted over Socket.io every ~5s, with sharing starting/
stopping itself as deliveries begin/end. The server persists the latest
position on `DeliveryAgentProfile` and fans each update out to that order's
room (customer tracking page) and the admin room (admin's active-deliveries
view) — both now share one `LiveTrackingMap` component, per the spec's
reuse requirement, which renders an actual Google map when
`NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` is set or falls back to a live
distance/last-updated readout otherwise. Verified with a three-socket test
(customer + admin + agent connected simultaneously): one `agent:location`
emit from the agent socket correctly produced both an `order:location`
push to the subscribed customer and an `agent:location` push to the admin
room, and the position persisted to the database. Also verified: an agent
can't set a non-pickup/delivery status, can't touch an order not assigned
to them, and a non-agent role is rejected from the delivery endpoints.
Same browser-testing caveat as the earlier phases — not click-tested
visually, since no browser is available in this environment; `npm run
build` compiles all 19 routes cleanly as a proxy.

**Phase 5 complete:** the deferred edge cases and polish. Operating-hours
enforcement — orders are now rejected server-side outside the configured
hours (verified by temporarily setting hours that exclude the current
time and confirming order creation fails with a clear message, then
restoring them), with a matching banner and disabled checkout button on
the cart page. Sold-out-mid-cart — the cart page now cross-checks its
contents against the live menu on load and on every `menu:item-updated`
broadcast, flagging any line that's gone unavailable (sold out or
deleted) and blocking checkout until it's removed, rather than only
failing at order submission. In-app notifications — a toast system
(`ToastProvider`, mounted once in the root layout) now surfaces order
status changes to customers and new-delivery assignments to agents in
real time from anywhere in the app, not just while the relevant page
happens to be open; verified the agent side with a socket script that
received `order:agent-assigned` the instant an admin assigned the order.
A responsive pass fixed several admin/customer forms (menu item, combo
builder, delivery agent, coupon, shop settings, fee slabs, address forms)
that had multiple fixed-width inputs in one unwrapped flex row — those
would have overflowed on narrow phone screens; they now wrap or stack.
Same caveat as every phase: verified via the API/sockets and `next
build`, not click-tested in an actual browser since none is available
here.

All five phases of the original plan are now complete.

**Payment flow update:** no payment gateway is integrated. `paymentMethod`
is `COD` or `UPI_MANUAL` — both settled in person (cash, or the customer
scanning the shop's UPI QR and paying the agent/cashier directly). A
separate `paymentStatus` (`UNPAID`/`PAID`) is set manually: the assigned
delivery agent marks it paid from `/delivery` for delivery orders, or
admin/cashier from `/admin/orders` for dine-in/takeaway. The shop's UPI ID
lives on `ShopConfig.upiId` (admin-editable in Settings); the QR shown to
customers (`components/upi-qr-code.tsx`) is generated client-side from that
ID with `qrcode.react` — a standard `upi://pay?pa=...` intent URI, the same
every time (no amount encoded, no gateway call). Verified via the API: an
order rejects the old `RAZORPAY` value, UPI_MANUAL orders default to
`UNPAID`, a customer can't call mark-paid on their own order (wrong role),
an agent can't mark an order paid before being assigned to it, and both
the assigned agent and admin can mark paid once eligible.
`paymentMethod`/`paymentStatus` stayed separate enum fields exactly so a
gateway can be added later as a third `paymentMethod` value without
touching the Order model.

**Post-review bug-fix pass:** ran a full code review after all five phases
and the payment rework, found and fixed 10 real issues (each individually
re-verified against the running server) — most notably a single malformed
public request (`GET /api/menu-items?minPrice=abc`) could previously crash
the *entire* server process for every connected client (no error-handling
middleware existed anywhere), and the admin dashboard's live delivery
map never actually worked (it listened for location updates but never
joined the socket room needed to receive them). Also fixed: a coupon
usage-limit race condition, missing order status-transition validation,
cancelled orders markable as paid, no OTP rate limiting, deactivated
agents assignable to orders, and a stale cart coupon discount after
quantity changes. See the `express-async-errors` import and global error
middleware in `apps/server/src/app.ts`, and the `safeAsync` wrapper in
`apps/server/src/sockets/index.ts`, for the crash-prevention fixes
specifically.

**Homepage redesign:** `/` is now a proper marketing homepage (hero, USP
strip, popular items, combo highlight, how-it-works, testimonials, local
delivery-radius callout) using the brand palette from the RR Kitchen logo
(terracotta `#D97748` / deep green `#4A7C59` / cream `#FDF6EC` / dark brown
`#3E2723`, all wired into `tailwind.config.ts` as the `spice`/`leaf`/
`cream`/`charcoal` tokens used everywhere else in the app) and Lora
(serif headings) + Inter (sans body) via `next/font/google` — the previous
config *referenced* Poppins/Inter as font families but never actually
loaded them, so headings had silently been rendering in a system serif
this whole time; that's fixed now too. The former single `/` page (menu
grid + filters) moved to `/menu`; combos got their own `/combos` listing.
"Popular items" and "Testimonials" are real data, not hardcoded: a new
`GET /api/menu-items/popular` ranks by actual order volume (`OrderItem`
quantities), falling back to newest items when there isn't enough order
history yet, and `GET /api/reviews/featured` pulls real `Review` rows
(rating ≥ 4, has a comment). The seed script now creates 5 demo customers
with completed orders + reviews specifically so those two sections (and
the combo's popularity) have real data on a fresh install — clearly
placeholder data, same as the rest of the seed script, not fabricated
content shown as if from real production reviews. `ShopConfig` gained an
`address` field (footer/contact display; `lat`/`lng` already existed for
geofencing) and the header now shows a live "Delivering to: ..." indicator
pulled from the customer's default saved address. The logo shown
throughout (`components/logo-mark.tsx`) is a scalable SVG recreation of
the provided logo's bowl-and-steam badge, in the exact brand colors — it's
not the original file, since a pasted-in-chat image can't be extracted to
disk the way an uploaded file path can. Drop the real logo file into
`apps/web/public/` and swap the `<LogoMark />` usages for an `<Image>` if
pixel-exact branding matters.

**Header responsiveness fix + WhatsApp chat button:** the header's nav row
used a plain (non-wrapping) flex container, so on narrow screens the nav
links got squeezed into whatever space was left beside the logo instead of
using the full screen width — fixed by letting the nav drop to its own
full-width, horizontally-scrollable row on mobile (`w-full sm:w-auto` on
the `<nav>`, `flex-wrap` on its parent). Also added a floating WhatsApp
chat button (`components/whatsapp-button.tsx`), shown site-wide on every
customer page, linking to a `wa.me` click-to-chat URL built from a new
`ShopConfig.whatsappNumber` field (admin-editable in Settings) — it
renders nothing until a number is configured, so there's never a dead
link. The WhatsApp icon is an inline SVG in WhatsApp's own brand green
(not the RR Kitchen palette) since recognizability matters more than
palette consistency for that one icon specifically.

**Mobile nav redesigned as a proper hamburger menu:** the horizontally-
scrolling pill row still looked cramped on real phone widths, so mobile
(`<sm`) now gets a standard collapsed header — logo, a cart icon button,
and a hamburger toggle — with the four nav links in a dropdown panel
underneath. Desktop/tablet keeps the full inline pill row. Nav pills also
now highlight the active section (`usePathname`-driven), matching the
pattern the admin dashboard nav already used.

**Customer order cancellation:** a real functionality gap — customers
previously had no way to cancel an order themselves after placing it, even
seconds later. New `PATCH /api/orders/:id/cancel` (customer-only, and only
for orders that are actually theirs) allows cancelling while still
`PLACED` or `CONFIRMED` — deliberately stricter than what admin/agent can
do, since once `PREPARING` starts the kitchen has already committed
ingredients. If a coupon was applied, cancelling frees up its usage slot
(`usedCount` decremented) rather than permanently burning it on an order
that never happened. A "Cancel order" button appears on the order tracking
page only while the order is in a cancellable state. Verified: cancel
while `PLACED` succeeds, cancelling twice fails cleanly, cancelling after
`PREPARING` has started is rejected, one customer can't cancel another
customer's order (404, not 403 — doesn't reveal the order exists), and the
coupon's `usedCount` correctly returns to its pre-order value.

**Next.js upgraded 14.2.35 → 15.5.25 — critical security fix.** A routine
`npm install` for an unrelated change surfaced a newly-disclosed critical,
unauthenticated RCE advisory in Next.js specifically affecting
Windows-hosted servers (`>=13.4.0, <15.5.24`) — and this project runs on
Windows. Confirmed with the user before upgrading a core framework
dependency across the whole app. Low actual risk before the fix (dev
server only ever bound to localhost) but worth knowing if you deploy this
anywhere. This codebase never used Next's server-side APIs (`cookies()`,
`headers()`, Server Actions, or the `params` prop on Server Components —
every page is `"use client"` fetching from the Express API via plain
`fetch`), so the usual 14→15 breaking changes didn't apply; verified with
a clean `tsc --noEmit` + `next build` (all 21 routes) + a fresh dev-server
smoke test across every route. Also added `helmet` for baseline HTTP
security headers on the API (`X-Content-Type-Options`,
`X-Frame-Options`, HSTS in prod, etc.) — with its
`contentSecurityPolicy`/`crossOriginResourcePolicy` explicitly disabled
since those two are meant for HTML-serving servers and this is a pure
JSON + Socket.io API called cross-origin from the web app.

**Closed a security gap of my own making:** the earlier bug-review pass
added rate limiting to OTP login (it was brute-forceable) but never
applied the same protection to admin/delivery-agent password login, which
had the identical no-lockout gap. Fixed with the same pattern
(`login-rate-limit.service.ts`): 5 wrong attempts locks that email out for
5 minutes, scoped per-email so unrelated accounts are unaffected. Verified
by deliberately failing an admin login 6 times (locked out on the 6th,
correctly rejects the *right* password too while locked) and confirming a
different staff account could still log in normally throughout.

**Loading states replaced with real skeletons.** Several pages either
showed bare "Loading..." text or — worse — the homepage's data-backed
sections (popular items, combo highlight, testimonials) rendered nothing
at all while their fetch was in flight, since they distinguished "no data"
from "still loading" by the same empty array. Fixed by tracking loading
state as `null` vs `[]` and adding proper skeleton placeholders
(`components/skeleton.tsx`) shaped like the real content. Found a real bug
doing this pass, not just a polish gap: the order history page had no
loading state at all, so `orders.length === 0` fired immediately on first
render and showed "You haven't placed any orders yet" to customers who
actually had orders, for as long as their `/api/orders` fetch took.

**Real RR Kitchen menu.** All placeholder menu data replaced with the
actual menu, transcribed from three photos of the shop's own printed menu
card and signage — 20 items across Breakfast, South Indian, Main Course
and Beverages, every price matching exactly, every name in English (Hindi
names on the signage translated), zero invented items or prices. The
signage's yellow banner had one item ("Thalipeeth") missing from the
printed card; both sources were cross-checked so nothing was dropped. The
menu's "Thali" has no separately-priced Dal anywhere on the real menu, so
it's modeled as a single flat-priced `MenuItem` rather than a `Combo` —
building it as a Combo would have meant inventing a standalone Dal price
that doesn't exist; the old 7-item placeholder combo (entirely fictional
test data) was retired along with it. Each item got a real, properly-
licensed dish photo sourced from Wikimedia Commons (`Special:FilePath`,
verified by file signature — one initial download silently returned an
HTML error page instead of an image and was caught and re-fetched with
the correct exact filename) and compressed with `sharp` (1200px wide,
quality 78) for page-load speed — the raw downloads were 1-5MB apiece,
now 45-135KB. These 20 fixture images live in a new
`apps/web/public/seed-images/` directory, committed to the repo, separate
from `public/uploads/` (gitignored runtime admin uploads) — otherwise the
seed script wouldn't be reproducible for anyone cloning the repo fresh.
Also set the shop's real WhatsApp number (`9691888057`, from the menu's
own "For Orders & Enquiries" line) as `ShopConfig.whatsappNumber`,
replacing the placeholder.

Caught two real bugs of my own making while doing this: (1) the seed
script's demo orders were skip-if-exists by order number, so when the
menu's categories changed (item IDs are derived from name+category) the
old demo orders silently kept pointing at now-deleted items — Masala Dosa
was objectively the highest-volume item in the demo data yet completely
missing from "Popular Items" until this was found and fixed (demo orders
now delete-and-recreate every seed run); (2) one demo review's comment
text ("best paneer butter masala...") didn't match its order after that
order's items were updated to the real menu — a stale-data inconsistency
that would only show up by actually reading the API response, not by
looking at the seed script in isolation. Verified end-to-end after fixing
both: all 20 items/prices/categories/images checked against the source
photos one by one, zero duplicates, all English, `search=dosa` correctly
returns both dosas, veg filter returns all 20 (menu is fully vegetarian),
a real order placed through the API priced correctly against the new
menu, and the popularity ranking now correctly puts Masala Dosa first.

**Critical bug: HSTS header broke every browser session, indistinguishably
from three "different" symptoms.** After the earlier security-hardening
pass added `helmet`, it was mounted with no `hsts` override, so it kept
helmet's default: `Strict-Transport-Security: max-age=15552000;
includeSubDomains` on every response. HSTS is keyed by *hostname*, not
port — so the moment a real browser saw that header from
`http://localhost:4000`, it started silently force-upgrading **every**
future `localhost` request, on **any** port, to `https://`, for the next
~180 days. Since neither the API (4000) nor the web app (3000) serve TLS
in dev, every subsequent request just failed — which looked like three
unrelated bugs at once ("admin gets logged out on refresh," "the delivery
flow doesn't work," "admin can't see the delivery partner") but was
actually one: the browser refusing to speak plain HTTP to `localhost`
anymore. `curl` does not enforce HSTS, so the extensive curl-based testing
throughout this project never surfaced it — it only showed up in an
actual browser. Fixed in `apps/server/src/app.ts` by setting `hsts:
isProd`, so the header is only ever sent once the app is actually served
over HTTPS. Verified the header is now absent from fresh responses, and
that login → `/api/auth/me` → agent-list all work correctly over curl.
**Important:** this fix only stops the header from being sent again — it
cannot retroactively undo the policy a browser already cached before the
fix. Anyone who hit this needs to clear it manually once (Chrome/Edge:
`chrome://net-internals/#hsts` → "Delete domain security policies" →
enter `localhost` → Delete; Firefox/Safari: clear site data for
`localhost`), then reload.

**Full-app bug sweep.** Ran the whole stack through a headless-browser
driver (Playwright, scripted like a real user — login, checkout, admin
order management, delivery agent flow — with console/network errors
captured on every page) rather than relying on curl, since curl-based
testing is exactly what missed the HSTS bug above. Found and fixed four
real bugs, plus a UI/mobile pass:

1. **Delivery orders could get stranded.** The admin order-status
   dropdown offered every status regardless of order type, so picking
   "Ready for pickup" on a *delivery* order was a dead end — that status
   only ever advances to Completed or Cancelled, never to actual
   delivery. Moved the transition rules into `packages/shared` as
   `ORDER_STATUS_TRANSITIONS` / `getNextOrderStatuses(status, orderType)`
   — a single source of truth now used by both the server (enforced) and
   the admin dropdown (which options it even offers), instead of two
   copies that could silently drift apart.
2. **Admin/delivery-agent sessions crashed on customer pages.** The
   header and cart component fetched `/api/addresses` (customer-only)
   whenever *any* user was logged in, without checking role. Since
   admin/customer/agent share one site and cookie, an admin clicking
   into `/cart` or `/combos` in the same browser hit an unhandled 403
   and the page broke. Fixed by checking `role === "CUSTOMER"` first,
   with `.catch()` as a backstop either way.
3. **Cancelling an order crashed the order page.** `cancelOrder`
   returned a bare `prisma.order.update()` result with no relations
   included, but the customer's order-detail page replaces its entire
   `order` state with that response and immediately re-renders
   `order.items.map(...)` — which threw on the very next paint. Fixed by
   giving `cancelOrder`'s update the same `include` shape (`items`,
   `address`, `review`, `deliveryAgent`) as the regular `getOrder` fetch,
   so every place that consumes an "order" object gets a consistently
   shaped one. (`markOrderPaid` and `updateOrderStatus` return bare rows
   too, but every caller of those discards the response and refetches
   the list instead of rendering it directly, so they weren't at risk —
   `cancelOrder` was the one exception.)
4. **A customer's first-ever address was never marked default.**
   `POST /api/addresses` only set `isDefault` if the request body
   explicitly asked for it — but the "Add address" form never sends that
   field, so no address a customer added was ever flagged default until
   they separately found and clicked "Set default". In the meantime, the
   header's "Delivering to" banner and the cart's address picker fell
   back to whichever address was created most recently, silently
   changing every time a second address was added, with no "Default"
   badge shown anywhere. Fixed by auto-defaulting a customer's very
   first address on creation; later additions still require an explicit
   "Set default" as before.

Also fixed: the admin dashboard's nav bar (Dashboard/Orders/.../Settings)
had no mobile layout at all — it just clipped off-screen on a phone with
no visual hint that it scrolled, so Customers/Analytics/Settings were
effectively unreachable. Replaced it with the same hamburger-dropdown
pattern already used on the customer site, and fixed a couple of order-row
layouts that overlapped their Accept/Reject buttons at narrow widths.
Also added the `sizes` prop to every `next/image` `fill` image (menu/combo
cards and detail-page heroes) — Next.js was warning on all of them in dev,
and without it the browser has no way to pick an appropriately-sized image
for the viewport, so mobile visitors were downloading full-size images
unnecessarily.

Verified end-to-end after all of the above: a full customer order
(delivery *and* takeaway, COD *and* UPI-QR, coupon apply/reject, review
submission, order cancellation) via the actual UI in a real browser, not
just the API; the admin order lifecycle (accept → prepare → assign agent
→ out for delivery, with the fixed dropdown only ever offering valid next
steps); the delivery agent marking an order paid and delivered; and menu
item edits, coupon creation, and address add/edit/set-default all
persisting correctly.

**Second bug-hunt pass — the combo builder, exercised for the first time.**
No real combo existed yet (the one placeholder combo was retired during the
real-menu migration), so the "per-slot substitution" feature — explicitly
called for in the original spec — had never actually been driven end to
end. Built one through the admin UI to test it and found two real gaps:

1. **A swap could trade a cheap item for an expensive one at no extra
   charge.** The only rule governing which items could substitute into a
   swappable combo slot was "same category" — but this menu's categories
   are broad (e.g. "Main Course" spans individual rotis all the way up to
   a full Thali), so a ₹15 Butter Roti slot could be freely swapped for a
   ₹100 Thali. Fixed by additionally capping a substitute to the original
   slot's own price (enforced both in which options the swap dropdown
   offers, via `GET /api/combos/:id`, and again at order creation) —
   "swap" now means "pick a similar-or-cheaper option," not a way to
   upsize a combo for free.
2. **The kitchen had no way to see what was actually swapped.** The
   substitution was correctly recorded on the order (`comboSelections` on
   the `OrderItem`), but nothing in the UI ever displayed it — not the
   customer's order confirmation, not the admin's order list. Whoever's
   actually cooking the order had no way to know "give Plain Roti, not
   Butter Roti" for this specific combo. Fixed by snapshotting the
   substitution's item *names* at order-creation time (the same pattern
   already used for `priceAtOrder`, so it survives a later menu rename)
   and rendering "Swapped X → Y" under the combo line on both the
   customer's order page and the admin's order list.

Verified with a full combo order placed through the real UI (swap chosen,
cart line showing "Swapped Butter Roti → Plain Roti", price/tax totals
correct, order confirmation and admin dashboard both showing the swap),
plus a re-check that the swap dropdown no longer offers overpriced
substitutes and that the server rejects one if requested directly via the
API.

**Third pass — admin CRUD completeness and a login gap.** Exercised every
remaining admin control that hadn't been clicked yet this session
(delivery-agent create/deactivate, category create/delete, menu item
delete, combo delete, customer block) and found one real bug plus a
couple of small consistency gaps:

1. **A "deactivated" delivery agent could still log in.** The admin's
   Active/Deactivated toggle only ever gated *new* order assignment
   (`assignDeliveryAgent` checked `deliveryAgentProfile.isActive`), but
   `staffLogin` never checked it at all — an agent an admin had just
   deactivated (because they'd left, or for cause) could still sign into
   the delivery portal and keep acting on deliveries already assigned to
   them. Fixed by rejecting login for a `DELIVERY_AGENT` whose profile is
   inactive, the same way an `isBlocked` account is already rejected.
   (Like that existing check, this only stops *new* logins — a session
   token issued before deactivation stays valid until it expires, since
   auth here is a stateless JWT with no revocation list. Fixing that
   fully would mean adding token revocation, a bigger change than this
   pass warranted; closing the login gap addresses the actual reported
   scenario.)
2. **Categories could be created but never renamed or removed** from the
   UI — the server endpoints existed, nothing called them. Added a
   delete (×) chip per category next to the existing "+ Category" form,
   reusing the server's existing guard that refuses to delete a category
   that still has items in it.
3. **A customer detail page in admin rendered `phone · ` with a dangling
   separator** for the common case of a customer with no email on file
   (customers authenticate by phone/OTP, so most have none) — the
   separator was hardcoded rather than conditional on the email actually
   existing. Fixed to only show the "· email" part when there is one.
4. **The WhatsApp button's prefilled message trailed off mid-sentence** —
   "Hi RR Kitchen! I had a question about" with nothing after "about".
   Completed it to "...about my order."
5. **Hitting a bad URL dropped visitors onto Next.js's stock, unbranded
   404 page** — plain white background, system font, no way back to the
   site. Added a proper `not-found.tsx` in the brand's cream/terracotta/
   Lora style with a link home. (It has to be self-contained rather than
   reusing the site's `Header`/`Footer` — a not-found this high up in the
   route tree renders outside the `(shop)` layout that sets up the
   `CartProvider`/`AuthProvider` those components depend on.)

Verified: agent creation → login works → admin deactivates → login now
rejected with a clear "This account has been deactivated" (a still-active
agent's login is unaffected); category delete blocked with a message when
in use, succeeds when empty; menu item delete, combo delete (including
with existing orders referencing it — the FK is `SetNull` and the order
still displays correctly from its own snapshotted name/price), and a real
image upload through the admin item form all persist correctly; customer
block immediately rejects that phone number's OTP verify (not the OTP
*request* — blocking is enforced at the point a session would actually be
issued) and unblock immediately restores it; the settings form's Save
button round-trips correctly; login rate-limiting (5 failed attempts →
429, even the correct password rejected while locked) still works.
Also spot-checked and found already correct, no changes needed: geofence
rejection at checkout with a clear message and disabled button, dine-in
checkout, favorites toggle end-to-end, empty search results, zero-address
checkout (button correctly disabled — confirmed via the DOM attribute,
not just visually), analytics date-range switching, and — using two
concurrent browser sessions to verify the real-time path end-to-end — an
agent's live location reaching both the customer's tracking view and
admin's live-delivery map within seconds.

## Location/maps removed entirely

At the user's request, the app no longer collects, stores, or displays any
GPS/location data or map — no address coordinates, no delivery-radius
geofencing, no Google Maps picker or "view on map" links, no live delivery
tracking, no browser Geolocation API usage anywhere in the codebase.
Addresses are now just plain text fields (house/flat, landmark, area,
city, pincode) — what the user asked for as "the correct fields to store
the address of customer."

What changed as a result, since several features were built on top of
distance:

- **Delivery fee is now a single flat amount** (admin-configurable in
  Settings), the same for every delivery address, replacing the old
  distance-based fee slabs (₹20/35/50 by km-band). The one-time migration
  seeded it at ₹30 (roughly the old mid-tier slab) so delivery isn't
  silently free until an admin visits Settings.
- **No more delivery-radius geofencing at checkout.** Any address can be
  used for a delivery order now; there's no distance to check it against.
- **No more live delivery tracking.** The delivery agent no longer shares
  their location (the periodic `navigator.geolocation.watchPosition` +
  Socket.io broadcast is gone entirely), and the customer/admin "live map"
  views are replaced with a plain status line ("Ravi Kumar is out for your
  delivery.") — the order-status stepper and ETA text already covered the
  same information without needing a map.
- **"Directions to shop/customer" links on the delivery agent portal are
  gone** — they were Google Maps deep links built from coordinates that no
  longer exist.
- **The homepage's "~5km delivery radius" section was rewritten** to a
  plain "Proudly Home-Style" message with no distance claim, since nothing
  enforces one anymore — same for the hero section's delivery-radius line.
- Deleted outright: `components/location-picker.tsx`,
  `components/live-tracking-map.tsx`, `lib/maps-link.ts`,
  `lib/google-maps-loader.ts`, `packages/shared/src/geo.ts`, the
  `DeliveryFeeSlab` Prisma model, and the `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY`
  env var. The server's `agent:location`/`order:location` socket events
  and the `/api/addresses/check-radius` endpoint are gone too.

**A real bug surfaced while wiring up LAN access alongside this change**
(testing from a phone on the same network — a separate, earlier ask):
`NEXT_PUBLIC_API_URL` had been hardcoded to the machine's LAN IP so a
phone could reach the API. That broke login from `localhost` — the auth
cookie is `sameSite: "lax"`, which browsers withhold on cross-site
fetch/XHR requests, and "localhost" vs. a bare IP address are different
sites as far as cookies are concerned. Every request after login started
silently dropping the cookie and bouncing back to the login page, with no
error explaining why (the same *shape* of bug as the earlier HSTS
incident — something browser-cookie-policy-shaped that curl can't catch
and that only shows up as "keeps logging me out"). Fixed by resolving the
API's host from the page's own origin at runtime
(`window.location.hostname`) instead of a single baked-in URL — see
`apps/web/src/lib/api-url.ts` — so the page and the API it talks to are
always the same host, whether that's `localhost` or the LAN IP. Also
fixed a related issue this surfaced: Socket.io's own separate `cors`
config was still passed the raw comma-joined `WEB_ORIGIN` string as a
literal origin, producing an invalid multi-value
`Access-Control-Allow-Origin` header that browsers reject outright —
fixed to use the same parsed `webOrigins` array as the REST API's CORS
config.

Verified after all of the above: a full delivery order placed with a
plain-text address (no coordinates anywhere in the request), the flat fee
applied correctly, the order progressed through to "out for delivery"
showing the plain status line on the customer/admin/agent views with no
map, and login working correctly again from `localhost` after the API-URL
fix. `npm run build` compiles clean across `shared`/`server`/`web`.

## Contact info surfaced everywhere it's needed operationally

Requested after using the app hands-on: the admin accept/reject flow, the
delivery agent, and the customer's order page all needed to actually see
who to call, not just names. Added:

- **Admin dashboard's live-orders feed** (the accept/reject screen) now
  shows the item list and the customer's phone number as a `tel:` link —
  previously it was just "customer name · N item(s) · total," with no way
  to see what was ordered or reach the customer without leaving the page.
  The full `/admin/orders` list got the same `tel:` link.
- **The delivery agent portal** now makes the customer's phone a `tel:`
  link (it was plain text before) and shows the drop address with a pin
  icon at every stage of an active delivery. The **History** section — for
  looking back at where a past delivery actually went — previously showed
  only the order number, status, and amount; it now includes the address
  too.
- **The customer's order page shows the delivery agent's name *and* a
  "Call delivery partner" button once one's assigned** — and, more
  importantly, **the assignment itself was reaching the page but the page
  was silently ignoring it**. The server has always broadcast an
  `order:agent-assigned` event into the order's Socket.io room the moment
  admin assigns someone (confirmed via server logs — it was firing
  correctly), but the customer's order-detail page never listened for that
  event, only for `order:status`/`order:payment-status`. Since assigning
  an agent doesn't change the order's status, nothing on the page ever
  reacted — the agent's name only appeared after a manual refresh, which
  is what "not reflected immediately" meant. Fixed by adding the missing
  listener, and by having the server's payload carry the agent's phone
  number too (`agentId`/`agentPhone`, not just `agentName`) so the call
  button can render immediately without a follow-up fetch.
- **A "Call the kitchen" button**, next to the existing WhatsApp button —
  both are now a small floating pair (call on top, WhatsApp below) in
  `components/contact-buttons.tsx`, reusing the shop's one configured
  contact number for both (the printed menu this was sourced from only
  lists a single number for "Orders & Enquiries," so there was no second
  number to add a field for).

**Found and fixed a real security bug while wiring the agent's phone
number through:** `getOrder` and `cancelOrder` both fetched the assigned
delivery agent with a bare Prisma `include: { deliveryAgentProfile: true
}` — which, with no `select`, returns *every* scalar column on that
User row, including `passwordHash` (a bcrypt hash), straight into the
JSON response. Any customer viewing their own order's detail page was
receiving their delivery agent's password hash in the network response
(not rendered anywhere in the UI, but sitting there in devtools for
anyone who opened them). Neither endpoint needed anything from that row
beyond id/name/phone/profile, so switched both to an explicit `select`
that only returns those.

Verified: the admin dashboard and orders list both show items + a working
call link on every order card; the delivery agent's active deliveries and
history both show address, and the phone number is a real `tel:` link;
and — using two concurrent browser sessions, the same way the earlier
live-location feature was verified — a customer's order page open and
waiting on "Waiting for a delivery agent to be assigned" updated itself,
with no refresh, to "Ravi Kumar is out for your delivery" plus a working
call button the instant the admin API call assigned the agent.

## Delivery portal rebuilt, app-wide UI/typography pass, and a real auth bug

**Bug: logging in, then pressing the browser's Back button, bounced back
to the login form** — reported as "this is really a bug you did not
encounter," and it was: every login flow (customer OTP, admin, delivery
agent) used `router.push()` to leave the login page after a successful
login. `push` *adds* a history entry rather than replacing one, so the
login page stayed sitting in browser history right behind wherever it
redirected to. Pressing Back landed the user back on a blank login form —
looking exactly like the session had been lost, even though the cookie
was still perfectly valid underneath. Fixed two ways, not just one, since
either alone leaves a gap: (1) `router.push` → `router.replace` on
successful login, so the login page's history entry is swapped out rather
than kept; (2) each login page now also checks auth state on every mount
and immediately redirects away if a valid session already exists — this
catches the case `replace` alone can't, like a bfcache-restored login
page, or someone navigating straight to `/login` (or `/admin/login`,
`/delivery/login`) while already signed in. Verified by scripting the
exact reported sequence (log in → navigate elsewhere → press Back) for
all three login flows — each now lands on the page visited *before*
login, never back on the login form.

**Delivery portal redesign.** It really was "only one page" doing a lot —
rebuilt with an app-like header (agent initials in an avatar circle),
color-coded status badges (green/red/amber, not one flat color for every
status regardless of meaning), and — the concrete ask — **History rows
are now tap-to-expand** instead of a bare list. Expanding one shows the
full order: the status stepper, every item with its price, the customer's
name and a working call link, the complete delivery address, any special
instructions, payment method and status, the full price breakdown, and
the placed/completed timestamps — everything needed to look back at a
past delivery, including "where did this actually go," without needing to
ask anyone.

**App-wide typography and spacing pass.** The single highest-leverage
change: the root font size is now 18px instead of the browser default
16px (`globals.css`), which — because every Tailwind text and spacing
utility is rem-based — scales the *entire* app's type and padding up
together in one place, rather than needing hundreds of individual
`text-sm` → `text-base` edits across every component. On top of that:
soft shadows (and a hover lift) added to menu/combo cards and every major
admin card for a less flat, more "real app" feel; a shared `StatusBadge`
component (color-coded per status) replacing the flat single-color pills
that existed independently in four different places; and larger, bolder
prices throughout. Verified no layout regressions from the font-size
change specifically by checking for horizontal overflow at 375px width
(the narrowest common phone) on the homepage, menu, and cart — none found
— and by re-checking the admin dashboard's mobile hamburger menu still
works correctly at the larger type size.

**Edge-case hardening: error boundaries.** Added `error.tsx` (catches a
rendering failure anywhere in the app — a bad API response shape, a null
reference, anything unexpected — and shows an on-brand "something went
wrong, try again" page instead of a blank white screen) and
`global-error.tsx` (the last-resort fallback if the root layout itself
fails, which can't rely on Tailwind or the brand fonts having loaded,
since that's exactly what might be broken). Neither existed before this
pass, meaning any uncaught rendering error anywhere in the app was a
blank screen with no way back except manually editing the URL.

Also fixed while in the area: the "Swapping placeholders" section below
still referenced `packages/shared/src/geo.ts` and
`components/location-picker.tsx` for distance calculation and map
rendering — both deleted in the earlier location-removal pass and never
updated here, so the docs were describing files that no longer exist.

## Swapping placeholders for production services later

- **OTP:** `apps/server/src/services/otp.service.ts` defines an `OtpProvider`
  interface with a console-logging implementation. Swap in MSG91/Twilio by
  implementing the same interface. **This is the one placeholder that
  blocks a real launch** — until it's swapped, no customer can actually
  receive their login OTP by SMS.
- **Images:** currently served from `apps/web/public/uploads`, a local disk
  folder. Swap for Cloudinary/S3 by replacing the upload handler (added in
  Phase 3) — nothing else in the schema needs to change since `imageUrl` is
  just a string. Doing this matters more than it sounds: local disk storage
  doesn't survive a redeploy on most hosts (the filesystem is ephemeral),
  and doesn't work at all once there's more than one server instance.
- **Payments:** no gateway is wired up — see the "Payment flow update" note
  above. To add one later (Razorpay or similar), add a third
  `paymentMethod` value in `packages/shared/src/index.ts` and the Prisma
  enum, create the gateway order in `order.controller.ts`'s `createOrder`,
  and add a webhook/verify endpoint that flips `paymentStatus` to `PAID` —
  the schema doesn't need to change.

## Deploying to production

Everything below is a real gap between "runs correctly on my machine" and
"safe to put in front of real customers and real money." None of it is
optional — treat this as the pre-launch checklist, not background reading.

**Must change before going live — the app will actively misbehave or be
insecure otherwise:**

1. **`JWT_SECRET`** — the `.env` value is the literal string
   `dev-only-change-me-1234567890`. Anyone who reads this repo (or the
   public GitHub history, if it's ever pushed) can forge a valid session
   token for any user, including an admin, with that secret. Generate a
   real random one (`openssl rand -base64 48`) and set it only in the
   production environment's secrets, never committed to git.
2. **`NODE_ENV=production`** — flips on the two things deliberately kept
   off in dev: `secure` cookies (HTTPS-only) and HSTS (see the HSTS
   incident documented above — turning this on *before* HTTPS is actually
   serving the app breaks it the same way; turn it on *with* or *after*
   HTTPS, never before).
3. **`WEB_ORIGIN`** — currently `http://localhost:3000,http://192.168.1.2:3000`
   for local + LAN testing. Set it to the real production domain(s) only
   (`https://rrkitchen.example.com`) — anything left in this list is a
   valid CORS origin for the API.
4. **`DATABASE_URL`** — point at the production Postgres instance, not the
   local dev database this was built against.
5. **HTTPS is not optional.** This Express process doesn't terminate TLS
   itself (that's normally a reverse proxy — nginx, Caddy, or the
   platform's own load balancer); put one in front of it. Cookies are
   `secure` in production, so login silently fails without HTTPS.
6. **A real OTP provider** (see above) — without it, no customer can log
   in, full stop.
7. **`apps/web/.env.local`'s `NEXT_PUBLIC_API_PORT`** only works because
   the web app and API currently share a host — see `lib/api-url.ts`. If
   the API ends up on a genuinely different domain in production (not
   just a different port on the same host), that file's assumption breaks
   and it needs an explicit `NEXT_PUBLIC_API_URL` override instead.

**Should address soon after launch — works today, won't hold up at scale
or under real operational load:**

- **Rate limiting is in-memory** (`login-rate-limit.service.ts`,
  `otp.service.ts`) — a single `Map` in the Node process. It resets on
  every restart/deploy, and doesn't work at all across more than one
  server instance (each instance has its own independent map, so limits
  are effectively N times looser than intended). Move to Redis before
  running more than one instance, or before this matters for real abuse
  resistance.
- **Uploaded images live on local disk** — see the "Images" placeholder
  note above. Same issue: doesn't survive redeploys, doesn't work
  multi-instance.
- **No automated test suite.** Everything in this README's "Current
  status" history was verified by hand (curl scripts, then a headless
  Playwright browser once one was available) during development, not by
  a CI-run test suite. There isn't a safety net catching a regression
  before it reaches production — for now, re-run the flows documented
  above by hand after any change that touches order creation, auth, or
  payment status before deploying.
- **No error tracking/monitoring configured.** `error.tsx`/
  `global-error.tsx` catch rendering failures and show a fallback instead
  of a blank page, and `console.error` them — but nothing ships those
  errors anywhere durable (Sentry or similar) for a human to actually see
  after the fact.

**Standard steps for the deploy itself:**

```bash
npm run build          # builds packages/shared, apps/server, apps/web
npm run prisma:migrate # or `prisma migrate deploy` in a non-interactive
                        # CI/CD environment — applies pending migrations
                        # without prompting
```

Run the server with a process manager (PM2, systemd, or the hosting
platform's own supervisor) rather than a bare `node` process, so it
restarts automatically on a crash. `apps/server`'s `dist/index.js` is the
production entry point after `npm run build`; `apps/web` is a standard
Next.js production build (`next start`, or deploy to a platform that runs
that for you).
