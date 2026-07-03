import { io, type Socket } from "socket.io-client";

// Defaults to the page's own hostname/scheme on port 3001, so it works whether
// the host opened the app via localhost or its LAN IP (needed for phones to
// join), and over HTTP or HTTPS (needed for phone getUserMedia access).
const scheme = window.location.protocol === "https:" ? "https" : "http";
const SERVER_URL = import.meta.env.VITE_SERVER_URL ?? `${scheme}://${window.location.hostname}:3001`;

let socket: Socket | null = null;

export function getSocket(): Socket {
  if (!socket) {
    socket = io(SERVER_URL, { autoConnect: true });
  }
  return socket;
}

export interface PlayerSummary {
  id: string;
  displayName: string;
}
