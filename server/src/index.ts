import express from "express";
import { createServer } from "node:http";
import { Server } from "socket.io";
import { PORT, getLocalIp } from "./config.js";
import { registerSignalingHandlers } from "./sockets/signalingHandlers.js";

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: { origin: "*" },
});

app.get("/health", (_req, res) => {
  res.json({ ok: true });
});

io.on("connection", (socket) => {
  console.log(`socket connected: ${socket.id}`);

  registerSignalingHandlers(io, socket);

  socket.on("disconnect", () => {
    console.log(`socket disconnected: ${socket.id}`);
  });
});

httpServer.listen(PORT, "0.0.0.0", () => {
  const ip = getLocalIp();
  console.log(`Karaoke server listening on:`);
  console.log(`  http://localhost:${PORT}`);
  console.log(`  http://${ip}:${PORT}  (use this on the host laptop so phones can join)`);
});
