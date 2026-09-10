import { io, type Socket } from "socket.io-client";
import { getApiUrl } from "./api-url";

let socket: Socket | null = null;

// Reused across the app so we don't open a new connection per component.
// Auth rides along as the httpOnly cookie (withCredentials), same as REST.
export function getSocket(): Socket {
  if (!socket) {
    socket = io(getApiUrl(), { withCredentials: true, autoConnect: true });
  }
  return socket;
}
