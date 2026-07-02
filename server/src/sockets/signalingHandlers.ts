import type { Server, Socket } from "socket.io";

const SIGNAL_EVENTS = ["webrtc:offer", "webrtc:answer", "webrtc:ice-candidate"] as const;

interface SignalPayload {
  targetId: string;
  data: unknown;
}

// Pure relay by socket id — no room/membership checks yet, those land once RoomStore exists.
export function registerSignalingHandlers(io: Server, socket: Socket): void {
  for (const event of SIGNAL_EVENTS) {
    socket.on(event, ({ targetId, data }: SignalPayload) => {
      io.to(targetId).emit(event, { fromId: socket.id, data });
    });
  }
}
