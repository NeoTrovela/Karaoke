import type { Server, Socket } from "socket.io";
import type { RoomStore } from "../rooms/RoomStore.js";

export function registerHostHandlers(io: Server, socket: Socket, roomStore: RoomStore) {
  socket.on("host:create-room", (callback: (res: { code: string }) => void) => {
    const room = roomStore.createRoom(socket.id);
    socket.join(room.code);
    callback({ code: room.code });
  });

  socket.on("disconnect", () => {
    const room = roomStore.getRoomByHostSocketId(socket.id);
    if (!room) return;
    io.to(room.code).emit("room:closed");
    roomStore.removeRoom(room.code);
  });
}
