import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Server, Socket } from "socket.io";
import { RoomStore } from "../rooms/RoomStore.js";
import { registerHostHandlers } from "./hostHandlers.js";

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

describe("registerHostHandlers", () => {
  let roomStore: RoomStore;
  let fakeIo: ReturnType<typeof createFakeIo>;

  beforeEach(() => {
    roomStore = new RoomStore();
    fakeIo = createFakeIo();
  });

  function createHost(hostSocketId: string) {
    const { socket, handlers } = createFakeSocket(hostSocketId);
    registerHostHandlers(fakeIo.io, socket, roomStore);
    const callback = vi.fn();
    handlers.get("host:create-room")?.(callback);
    const [response] = callback.mock.calls[0] as [{ code: string }];
    const code = response.code;
    return { room: roomStore.getRoom(code)!, handlers };
  }

  describe("host:video-ended", () => {
    it("broadcasts a bare room:video-ended (players compute their own final score)", () => {
      const { room, handlers } = createHost("host-1");
      room.players.set("player-1", { id: "player-1", displayName: "Neo", score: 30 });
      fakeIo.emit.mockClear();
      fakeIo.to.mockClear();

      handlers.get("host:video-ended")?.();

      expect(fakeIo.to).toHaveBeenCalledWith(room.code);
      expect(fakeIo.emit).toHaveBeenCalledWith("room:video-ended");
    });

    it("is a no-op for a socket that isn't hosting a room", () => {
      const { socket, handlers } = createFakeSocket("stray-host");
      registerHostHandlers(fakeIo.io, socket, roomStore);

      expect(() => handlers.get("host:video-ended")?.()).not.toThrow();
      expect(fakeIo.emit).not.toHaveBeenCalled();
    });
  });

  describe("host:video-started", () => {
    it("resets every player's score to 0 and broadcasts room:players + room:video-started", () => {
      const { room, handlers } = createHost("host-1");
      room.players.set("player-1", { id: "player-1", displayName: "Neo", score: 80 });
      room.players.set("player-2", { id: "player-2", displayName: "Ana", score: 55 });
      fakeIo.emit.mockClear();
      fakeIo.to.mockClear();

      handlers.get("host:video-started")?.();

      expect(room.players.get("player-1")?.score).toBe(0);
      expect(room.players.get("player-2")?.score).toBe(0);
      expect(fakeIo.to).toHaveBeenCalledWith(room.code);
      expect(fakeIo.emit).toHaveBeenCalledWith("room:players", {
        players: [
          { id: "player-1", displayName: "Neo", score: 0 },
          { id: "player-2", displayName: "Ana", score: 0 },
        ],
      });
      expect(fakeIo.emit).toHaveBeenCalledWith("room:video-started");
    });

    it("is a no-op for a socket that isn't hosting a room", () => {
      const { socket, handlers } = createFakeSocket("stray-host");
      registerHostHandlers(fakeIo.io, socket, roomStore);

      expect(() => handlers.get("host:video-started")?.()).not.toThrow();
      expect(fakeIo.emit).not.toHaveBeenCalled();
    });
  });

  describe("host:end-session", () => {
    it("broadcasts room:closed and removes the room", () => {
      const { room, handlers } = createHost("host-1");
      fakeIo.emit.mockClear();
      fakeIo.to.mockClear();

      handlers.get("host:end-session")?.();

      expect(fakeIo.to).toHaveBeenCalledWith(room.code);
      expect(fakeIo.emit).toHaveBeenCalledWith("room:closed");
      expect(roomStore.getRoom(room.code)).toBeUndefined();
    });

    it("is a no-op for a socket that isn't hosting a room", () => {
      const { socket, handlers } = createFakeSocket("stray-host");
      registerHostHandlers(fakeIo.io, socket, roomStore);

      expect(() => handlers.get("host:end-session")?.()).not.toThrow();
      expect(fakeIo.emit).not.toHaveBeenCalled();
    });
  });
});
