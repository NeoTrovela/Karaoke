import type { Server, Socket } from "socket.io";
import type { RoomStore } from "../rooms/RoomStore.js";
import { toPlayerSummaries } from "../rooms/types.js";

export function registerHostHandlers(io: Server, socket: Socket, roomStore: RoomStore) {
  socket.on("host:create-room", (callback: (res: { code: string }) => void) => {
    const room = roomStore.createRoom(socket.id);
    socket.join(room.code);
    callback({ code: room.code });
  });

  socket.on("host:video-ended", () => {
    const room = roomStore.getRoomByHostSocketId(socket.id);
    if (!room) return;
    io.to(room.code).emit("room:video-ended", { players: toPlayerSummaries(room) });
  });

  socket.on("host:video-started", () => {
    const room = roomStore.getRoomByHostSocketId(socket.id);
    if (!room) return;
    for (const player of room.players.values()) {
      player.score = 0;
    }
    io.to(room.code).emit("room:players", { players: toPlayerSummaries(room) });
    io.to(room.code).emit("room:video-started");
  });

  socket.on("disconnect", () => {
    const room = roomStore.getRoomByHostSocketId(socket.id);
    if (!room) return;
    io.to(room.code).emit("room:closed");
    roomStore.removeRoom(room.code);
  });
}
