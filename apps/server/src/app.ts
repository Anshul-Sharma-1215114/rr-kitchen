import express from "express";
import "express-async-errors";
import helmet from "helmet";
import cors from "cors";
import cookieParser from "cookie-parser";
import { isProd, webOrigins } from "./config/env";
import authRoutes from "./routes/auth.routes";
import menuRoutes from "./routes/menu.routes";
import shopConfigRoutes from "./routes/shop-config.routes";
import addressRoutes from "./routes/address.routes";
import couponRoutes from "./routes/coupon.routes";
import orderRoutes from "./routes/order.routes";
import favoriteRoutes from "./routes/favorite.routes";
import adminRoutes from "./routes/admin.routes";
import deliveryRoutes from "./routes/delivery.routes";
import reviewRoutes from "./routes/review.routes";

export const app = express();

// contentSecurityPolicy/crossOriginResourcePolicy are meant for servers
// that render HTML — this is a pure JSON + Socket.io API called
// cross-origin from the web app, so those two would only add friction.
//
// hsts is explicitly OFF unless isProd: HSTS tells the browser "never talk
// to this host over plain HTTP again, for the next ~180 days" — sent from
// a plain-HTTP dev server, that's a foot-gun, not a hardening measure. The
// browser starts silently rewriting every subsequent request (to the API
// AND to the web app, since HSTS is keyed by hostname, not port) to
// https://, which fails outright since nothing here speaks TLS — it looks
// exactly like random, total breakage (failed logins, "logged out" on
// refresh, empty data everywhere) with no error message pointing at the
// cause. curl doesn't enforce HSTS the way real browsers do, so this
// class of bug is invisible to curl-based testing and only shows up in an
// actual browser. Even in prod this Express process itself doesn't
// terminate TLS (that's normally a reverse proxy/CDN's job, and HSTS is
// often better set there) — flip this on only once HTTPS is confirmed
// working end-to-end.
app.use(helmet({ contentSecurityPolicy: false, crossOriginResourcePolicy: false, hsts: isProd }));
app.use(
  cors({
    // A function rather than a single string so both the localhost origin
    // and the machine's LAN IP (for testing from a phone/tablet on the
    // same network) can be allowed at once — see webOrigins in config/env.
    origin: (origin, callback) => {
      if (!origin || webOrigins.includes(origin)) return callback(null, true);
      callback(new Error("Not allowed by CORS"));
    },
    credentials: true,
  })
);
app.use(express.json());
app.use(cookieParser());

app.get("/health", (_req, res) => res.json({ status: "ok" }));

app.use("/api/auth", authRoutes);
app.use("/api", menuRoutes);
app.use("/api/shop-config", shopConfigRoutes);
app.use("/api/addresses", addressRoutes);
app.use("/api/coupons", couponRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/favorites", favoriteRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/delivery", deliveryRoutes);
app.use("/api/reviews", reviewRoutes);

app.use((_req, res) => {
  res.status(404).json({ error: "Not found" });
});

// Catches anything thrown/rejected in a route handler (express-async-errors
// forwards async rejections here too) so a single bad request can't take
// down the whole process — without this, an uncaught rejection inside an
// Express 4 async handler crashes the server for every connected client.
// eslint-disable-next-line @typescript-eslint/no-unused-vars
app.use((err: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error("Unhandled request error:", err);
  if (res.headersSent) return;
  res.status(500).json({ error: isProd ? "Something went wrong" : String(err) });
});
