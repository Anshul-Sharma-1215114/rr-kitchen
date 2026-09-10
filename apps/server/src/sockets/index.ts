import type { Server, Socket } from "socket.io";
import { verifyAuthToken } from "../utils/jwt";
import { prisma } from "../prisma";

// Room/event conventions:
//   - "order:<orderId>" room: joined by the customer, admin, and assigned
//     agent for that order; server emits "order:status" into it.
//   - "admin" room: joined by admin dashboard sessions; server emits
//     "order:new", "order:status" and "order:agent-assigned" into it.

// Socket.io doesn't catch rejections from async event handlers the way
// express-async-errors does for routes — an uncaught one here becomes a
// process-level unhandledRejection. Wrap each async handler so one bad
// event can't take down every other connection.
function safeAsync<Args extends unknown[]>(handler: (...args: Args) => Promise<void>) {
  return (...args: Args) => {
    handler(...args).catch((err) => console.error("[socket] handler error:", err));
  };
}

const COOKIE_NAME = "rrk_token";

// The web client connects with `withCredentials: true`, so the same httpOnly
// auth cookie used by REST calls rides along on the socket.io handshake —
// no separate socket token needed.
function extractTokenFromCookieHeader(cookieHeader: string | undefined): string | undefined {
  if (!cookieHeader) return undefined;
  const match = cookieHeader
    .split(";")
    .map((c) => c.trim())
    .find((c) => c.startsWith(`${COOKIE_NAME}=`));
  return match?.slice(COOKIE_NAME.length + 1);
}

export function initSockets(io: Server) {
  // Anonymous connections are allowed — menu updates (e.g. sold-out toggles)
  // broadcast to everyone, including guests browsing without an account.
  // Auth is only enforced per-event below, for the rooms that need it.
  io.use((socket: Socket, next) => {
    const token =
      (socket.handshake.auth?.token as string | undefined) ??
      extractTokenFromCookieHeader(socket.handshake.headers.cookie);
    if (token) {
      try {
        socket.data.user = verifyAuthToken(token);
      } catch {
        // Treat an invalid/expired token as anonymous rather than rejecting
        // the connection outright.
      }
    }
    next();
  });

  io.on("connection", (socket: Socket) => {
    // eslint-disable-next-line no-console
    console.log(`[socket] connected: ${socket.id} (user ${socket.data.user?.id ?? "anonymous"})`);

    socket.on(
      "order:subscribe",
      safeAsync(async (orderId: string) => {
        const user = socket.data.user as { id: string; role: string } | undefined;
        if (!user || typeof orderId !== "string") return;
        const order = await prisma.order.findUnique({ where: { id: orderId } });
        if (!order) return;
        const authorized =
          order.customerId === user.id || order.deliveryAgentId === user.id || user.role === "ADMIN";
        if (authorized) socket.join(`order:${orderId}`);
      })
    );

    socket.on("admin:subscribe", () => {
      if (socket.data.user?.role === "ADMIN") socket.join("admin");
    });

    // Lets a delivery agent receive "order:agent-assigned" the moment admin
    // assigns them an order, regardless of which page they have open.
    socket.on("agent:subscribe-self", () => {
      const user = socket.data.user as { id: string; role: string } | undefined;
      if (user?.role === "DELIVERY_AGENT") socket.join(`agent:${user.id}`);
    });

    socket.on("disconnect", () => {
      // eslint-disable-next-line no-console
      console.log(`[socket] disconnected: ${socket.id}`);
    });
  });
}
