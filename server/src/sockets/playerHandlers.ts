import type { Server, Socket } from "socket.io";
import type { RoomStore } from "../rooms/RoomStore.js";
import { toPlayerSummaries } from "../rooms/types.js";

type JoinRoomRequest = { code: string; displayName: string };
type JoinRoomResponse =
  | { ok: true; code: string }
  | { ok: false; error: string };

export function registerPlayerHandlers(io: Server, socket: Socket, roomStore: RoomStore) {
  socket.on(
    "player:join-room",
    ({ code, displayName }: JoinRoomRequest, callback: (res: JoinRoomResponse) => void) => {
      const normalizedCode = code.trim().toUpperCase();
      const room = roomStore.getRoom(normalizedCode);
      if (!room) {
        callback({ ok: false, error: "Room not found. Check the code and try again." });
        return;
      }
      const name = displayName.trim();
      if (!name) {
        callback({ ok: false, error: "Enter a name to join." });
        return;
      }

      room.players.set(socket.id, { id: socket.id, displayName: name });
      socket.join(room.code);
      callback({ ok: true, code: room.code });
      io.to(room.code).emit("room:players", { players: toPlayerSummaries(room) });
    },
  );

  socket.on("disconnect", () => {
    const room = roomStore.getRoomByPlayerSocketId(socket.id);
    if (!room) return;
    room.players.delete(socket.id);
    io.to(room.code).emit("room:players", { players: toPlayerSummaries(room) });
  });
}
