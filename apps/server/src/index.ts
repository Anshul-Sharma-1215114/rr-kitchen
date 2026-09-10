import { createServer } from "http";
import { Server } from "socket.io";
import { app } from "./app";
import { env, webOrigins } from "./config/env";
import { initSockets } from "./sockets";

// Last-resort safety net for anything outside Express's request cycle
// (socket.io event handlers, timers) where nothing else catches a
// rejection — log it instead of letting Node silently kill the process.
process.on("unhandledRejection", (reason) => {
  console.error("Unhandled promise rejection:", reason);
});
process.on("uncaughtException", (error) => {
  console.error("Uncaught exception:", error);
});

const httpServer = createServer(app);

// origin as an array (not the raw comma-joined WEB_ORIGIN string) so
// socket.io reflects back whichever single origin the request actually
// came from — a literal multi-value string produces an invalid
// "Access-Control-Allow-Origin: a,b" header that browsers reject outright.
const io = new Server(httpServer, {
  cors: { origin: webOrigins, credentials: true },
});

app.set("io", io);
initSockets(io);

httpServer.listen(env.PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`RR Kitchen server listening on http://localhost:${env.PORT} (also reachable on the LAN — see webOrigins in .env)`);
});
