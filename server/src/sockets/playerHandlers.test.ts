import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Server, Socket } from "socket.io";
import { RoomStore } from "../rooms/RoomStore.js";
import { registerPlayerHandlers } from "./playerHandlers.js";

type Handler = (...args: unknown[]) => void;

function createFakeSocket(id: string) {
  const handlers = new Map<string, Handler>();
  const socket = {
    id,
    on: vi.fn((event: string, handler: Handler) => {
      handlers.set(event, handler);
    }),
    join: vi.fn(),
  };
  return { socket: socket as unknown as Socket, handlers };
}

function createFakeIo() {
  const emit = vi.fn();
  const to = vi.fn(() => ({ emit }));
  const io = { to };
  return { io: io as unknown as Server, to, emit };
}

describe("registerPlayerHandlers", () => {
  let roomStore: RoomStore;
  let fakeIo: ReturnType<typeof createFakeIo>;

  beforeEach(() => {
    roomStore = new RoomStore();
    fakeIo = createFakeIo();
  });

  function join(hostSocketId: string, playerSocketId: string, displayName: string) {
    const room = roomStore.createRoom(hostSocketId);
    const { socket, handlers } = createFakeSocket(playerSocketId);
    registerPlayerHandlers(fakeIo.io, socket, roomStore);
    const callback = vi.fn();
    handlers.get("player:join-room")?.({ code: room.code, displayName }, callback);
    return { room, socket, handlers, callback };
  }

  describe("player:score-update", () => {
    it("stores the score and rebroadcasts room:players with it", () => {
      const { room, handlers } = join("host-1", "player-1", "Neo");
      fakeIo.emit.mockClear();

      handlers.get("player:score-update")?.({ score: 42 });

      expect(room.players.get("player-1")?.score).toBe(42);
      expect(fakeIo.to).toHaveBeenCalledWith(room.code);
      expect(fakeIo.emit).toHaveBeenCalledWith("room:players", {
        players: [{ id: "player-1", displayName: "Neo", score: 42 }],
      });
    });

    it("clamps out-of-range scores to [0, 100]", () => {
      const { room, handlers } = join("host-1", "player-1", "Neo");

      handlers.get("player:score-update")?.({ score: 500 });
      expect(room.players.get("player-1")?.score).toBe(100);

      handlers.get("player:score-update")?.({ score: -20 });
      expect(room.players.get("player-1")?.score).toBe(0);
    });

    it("ignores non-numeric or non-finite scores", () => {
      const { room, handlers } = join("host-1", "player-1", "Neo");

      handlers.get("player:score-update")?.({ score: "oops" as unknown as number });
      expect(room.players.get("player-1")?.score).toBe(0);

      handlers.get("player:score-update")?.({ score: NaN });
      expect(room.players.get("player-1")?.score).toBe(0);
    });

    it("is a no-op for a socket that hasn't joined any room", () => {
      const { socket, handlers } = createFakeSocket("stray-socket");
      registerPlayerHandlers(fakeIo.io, socket, roomStore);

      expect(() => handlers.get("player:score-update")?.({ score: 50 })).not.toThrow();
      expect(fakeIo.emit).not.toHaveBeenCalled();
    });
  });
});
