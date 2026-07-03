import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Server, Socket } from "socket.io";
import { registerSignalingHandlers } from "./signalingHandlers.js";

type Handler = (payload: { targetId: string; data: unknown }) => void;

function createFakeSocket(id: string) {
  const handlers = new Map<string, Handler>();
  const socket = {
    id,
    on: vi.fn((event: string, handler: Handler) => {
      handlers.set(event, handler);
    }),
  };
  return { socket: socket as unknown as Socket, handlers };
}

function createFakeIo() {
  const emit = vi.fn();
  const to = vi.fn(() => ({ emit }));
  const io = { to };
  return { io: io as unknown as Server, to, emit };
}

describe("registerSignalingHandlers", () => {
  let fakeIo: ReturnType<typeof createFakeIo>;
  let fakeSocket: ReturnType<typeof createFakeSocket>;

  beforeEach(() => {
    fakeIo = createFakeIo();
    fakeSocket = createFakeSocket("socket-1");
    registerSignalingHandlers(fakeIo.io, fakeSocket.socket);
  });

  it("registers a handler for each signaling event", () => {
    expect(fakeSocket.handlers.has("webrtc:offer")).toBe(true);
    expect(fakeSocket.handlers.has("webrtc:answer")).toBe(true);
    expect(fakeSocket.handlers.has("webrtc:ice-candidate")).toBe(true);
  });

  it.each(["webrtc:offer", "webrtc:answer", "webrtc:ice-candidate"] as const)(
    "relays %s to the target id, tagging it with the sender's socket id",
    (event) => {
      const handler = fakeSocket.handlers.get(event);
      const data = { sdp: "fake-sdp" };

      handler?.({ targetId: "target-1", data });

      expect(fakeIo.to).toHaveBeenCalledWith("target-1");
      expect(fakeIo.emit).toHaveBeenCalledWith(event, { fromId: "socket-1", data });
    },
  );

  it("does not mutate the payload's data", () => {
    const handler = fakeSocket.handlers.get("webrtc:offer");
    const data = { sdp: "fake-sdp" };

    handler?.({ targetId: "target-1", data });

    const [, emittedPayload] = fakeIo.emit.mock.calls[0] as [string, { data: unknown }];
    expect(emittedPayload.data).toBe(data);
  });
});
