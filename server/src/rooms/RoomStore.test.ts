import { beforeEach, describe, expect, it } from "vitest";
import { RoomStore } from "./RoomStore.js";
import { toPlayerSummaries } from "./types.js";

describe("RoomStore", () => {
  let store: RoomStore;

  beforeEach(() => {
    store = new RoomStore();
  });

  describe("createRoom", () => {
    it("creates a room with a 5-character code, the host id, and no players", () => {
      const room = store.createRoom("host-1");
      expect(room.code).toHaveLength(5);
      expect(room.hostSocketId).toBe("host-1");
      expect(room.players.size).toBe(0);
      expect(typeof room.createdAt).toBe("number");
    });

    it("is idempotent for the same host socket id", () => {
      const first = store.createRoom("host-1");
      const second = store.createRoom("host-1");
      expect(second).toBe(first);
      expect(second.code).toBe(first.code);
    });

    it("creates separate rooms for different hosts", () => {
      const first = store.createRoom("host-1");
      const second = store.createRoom("host-2");
      expect(second).not.toBe(first);
      expect(second.code).not.toBe(first.code);
    });
  });

  describe("getRoom", () => {
    it("finds a room by its code", () => {
      const room = store.createRoom("host-1");
      expect(store.getRoom(room.code)).toBe(room);
    });

    it("returns undefined for an unknown code", () => {
      expect(store.getRoom("ZZZZZ")).toBeUndefined();
    });
  });

  describe("getRoomByHostSocketId", () => {
    it("finds a room by its host's socket id", () => {
      const room = store.createRoom("host-1");
      expect(store.getRoomByHostSocketId("host-1")).toBe(room);
    });

    it("returns undefined when no room has that host", () => {
      expect(store.getRoomByHostSocketId("nobody")).toBeUndefined();
    });
  });

  describe("getRoomByPlayerSocketId", () => {
    it("finds the room a player has joined", () => {
      const room = store.createRoom("host-1");
      room.players.set("player-1", { id: "player-1", displayName: "Neo", score: 0 });
      expect(store.getRoomByPlayerSocketId("player-1")).toBe(room);
    });

    it("returns undefined for a socket id that hasn't joined any room", () => {
      store.createRoom("host-1");
      expect(store.getRoomByPlayerSocketId("player-1")).toBeUndefined();
    });
  });

  describe("removeRoom", () => {
    it("deletes the room so it's no longer findable", () => {
      const room = store.createRoom("host-1");
      store.removeRoom(room.code);
      expect(store.getRoom(room.code)).toBeUndefined();
    });
  });
});

describe("toPlayerSummaries", () => {
  it("maps a room's players to their public id/displayName/score shape", () => {
    const store = new RoomStore();
    const room = store.createRoom("host-1");
    room.players.set("player-1", { id: "player-1", displayName: "Neo", score: 42 });
    room.players.set("player-2", { id: "player-2", displayName: "Trinity", score: 0 });

    const summaries = toPlayerSummaries(room);

    expect(summaries).toHaveLength(2);
    expect(summaries).toContainEqual({ id: "player-1", displayName: "Neo", score: 42 });
    expect(summaries).toContainEqual({ id: "player-2", displayName: "Trinity", score: 0 });
  });

  it("returns an empty array for a room with no players", () => {
    const store = new RoomStore();
    const room = store.createRoom("host-1");
    expect(toPlayerSummaries(room)).toEqual([]);
  });
});
