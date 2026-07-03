import express from "express";
import { createServer as createHttpServer } from "node:http";
import { createServer as createHttpsServer } from "node:https";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { Server } from "socket.io";
import { PORT, getLocalIp } from "./config.js";
import { RoomStore } from "./rooms/RoomStore.js";
import { registerHostHandlers } from "./sockets/hostHandlers.js";
import { registerPlayerHandlers } from "./sockets/playerHandlers.js";
import { registerSignalingHandlers } from "./sockets/signalingHandlers.js";

const dirname = path.dirname(fileURLToPath(import.meta.url));
const certPath = path.resolve(dirname, "../../certs/cert.pem");
const keyPath = path.resolve(dirname, "../../certs/key.pem");
const hasCerts = fs.existsSync(certPath) && fs.existsSync(keyPath);

const app = express();
// Same cert as the Vite dev server (see client/vite.config.ts) so both sides
// of the WebRTC handshake are served over a secure context for phones.
const httpServer = hasCerts
  ? createHttpsServer(
      { cert: fs.readFileSync(certPath), key: fs.readFileSync(keyPath) },
      app,
    )
  : createHttpServer(app);
const io = new Server(httpServer, {
  cors: { origin: "*" },
});
const roomStore = new RoomStore();

app.get("/health", (_req, res) => {
  res.json({ ok: true });
});

io.on("connection", (socket) => {
  console.log(`socket connected: ${socket.id}`);

  registerHostHandlers(io, socket, roomStore);
  registerPlayerHandlers(io, socket, roomStore);
  registerSignalingHandlers(io, socket);

  socket.on("disconnect", () => {
    console.log(`socket disconnected: ${socket.id}`);
  });
});

httpServer.listen(PORT, "0.0.0.0", () => {
  const ip = getLocalIp();
  const scheme = hasCerts ? "https" : "http";
  console.log(`Karaoke server listening on:`);
  console.log(`  ${scheme}://localhost:${PORT}`);
  console.log(`  ${scheme}://${ip}:${PORT}  (use this on the host laptop so phones can join)`);
  if (!hasCerts) {
    console.log(`  (no HTTPS cert found — run "npm run setup:https" so phones can use their mic)`);
  }
});
