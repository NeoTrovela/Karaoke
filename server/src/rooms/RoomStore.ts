import { generateRoomCode } from "./roomCode.js";
import type { Room } from "./types.js";

export class RoomStore {
  private rooms = new Map<string, Room>();

  createRoom(hostSocketId: string): Room {
    let code = generateRoomCode();
    while (this.rooms.has(code)) {
      code = generateRoomCode();
    }
    const room: Room = {
      code,
      hostSocketId,
      players: new Map(),
      createdAt: Date.now(),
    };
    this.rooms.set(code, room);
    return room;
  }

  getRoom(code: string): Room | undefined {
    return this.rooms.get(code);
  }

  getRoomByHostSocketId(hostSocketId: string): Room | undefined {
    for (const room of this.rooms.values()) {
      if (room.hostSocketId === hostSocketId) return room;
    }
    return undefined;
  }

  getRoomByPlayerSocketId(playerSocketId: string): Room | undefined {
    for (const room of this.rooms.values()) {
      if (room.players.has(playerSocketId)) return room;
    }
    return undefined;
  }

  removeRoom(code: string): void {
    this.rooms.delete(code);
  }
}
