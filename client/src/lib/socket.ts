import { io, type Socket } from "socket.io-client";

// Defaults to the page's own origin — Vite's dev proxy (see vite.config.ts)
// forwards /socket.io to the backend on port 3001. This keeps the browser on
// a single origin: a direct connection to the backend's own port would be a
// second self-signed cert that phones never get a chance to accept (browsers
// only offer a click-through warning for page navigations, not background
// WebSocket/XHR requests).
const SERVER_URL = import.meta.env.VITE_SERVER_URL ?? window.location.origin;

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
  score: number;
}
