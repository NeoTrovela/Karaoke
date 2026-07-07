import type { Socket } from "socket.io-client";
import { ICE_SERVERS } from "./iceServers";
import type { SignalMessage } from "./types";

export type PlayerStreamHandler = (playerId: string, stream: MediaStream) => void;

interface PeerEntry {
  pc: RTCPeerConnection;
  pendingCandidates: RTCIceCandidateInit[];
}

// Host side of the star topology: one recvonly RTCPeerConnection per connected phone.
export class HostPeerManager {
  private connections = new Map<string, PeerEntry>();
  private socket: Socket;
  private onPlayerStream: PlayerStreamHandler;

  constructor(socket: Socket, onPlayerStream: PlayerStreamHandler) {
    this.socket = socket;
    this.onPlayerStream = onPlayerStream;
    this.socket.on("webrtc:answer", this.handleAnswer);
    this.socket.on("webrtc:ice-candidate", this.handleRemoteIceCandidate);
  }

  async connectToPlayer(playerId: string): Promise<void> {
    const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });
    const entry: PeerEntry = { pc, pendingCandidates: [] };
    this.connections.set(playerId, entry);

    pc.addTransceiver("audio", { direction: "recvonly" });

    pc.ontrack = (event) => {
      const [stream] = event.streams;
      if (stream) this.onPlayerStream(playerId, stream);
    };

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        this.socket.emit("webrtc:ice-candidate", {
          targetId: playerId,
          data: event.candidate.toJSON(),
        });
      }
    };

    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);
    this.socket.emit("webrtc:offer", { targetId: playerId, data: offer });
  }

  disconnectPlayer(playerId: string): void {
    this.connections.get(playerId)?.pc.close();
    this.connections.delete(playerId);
  }

  disconnectAll(): void {
    for (const playerId of this.connections.keys()) this.disconnectPlayer(playerId);
    this.socket.off("webrtc:answer", this.handleAnswer);
    this.socket.off("webrtc:ice-candidate", this.handleRemoteIceCandidate);
  }

  private handleAnswer = async ({ fromId, data }: SignalMessage): Promise<void> => {
    const entry = this.connections.get(fromId);
    if (!entry) return;
    await entry.pc.setRemoteDescription(data as RTCSessionDescriptionInit);
    for (const candidate of entry.pendingCandidates) {
      await entry.pc.addIceCandidate(candidate);
    }
    entry.pendingCandidates = [];
  };

  // ICE candidates can arrive before the answer's setRemoteDescription() resolves
  // (candidates start flowing almost immediately after createOffer/createAnswer,
  // often faster than the signaling round-trip) - buffer until it's safe to apply.
  private handleRemoteIceCandidate = async ({ fromId, data }: SignalMessage): Promise<void> => {
    const entry = this.connections.get(fromId);
    if (!entry) return;
    const candidate = data as RTCIceCandidateInit;
    if (entry.pc.remoteDescription) {
      await entry.pc.addIceCandidate(candidate);
    } else {
      entry.pendingCandidates.push(candidate);
    }
  };
}
