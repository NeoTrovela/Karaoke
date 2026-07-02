import type { Socket } from "socket.io-client";
import { ICE_SERVERS } from "./iceServers";
import type { SignalMessage } from "./types";

export type PlayerStreamHandler = (playerId: string, stream: MediaStream) => void;

// Host side of the star topology: one recvonly RTCPeerConnection per connected phone.
export class HostPeerManager {
  private connections = new Map<string, RTCPeerConnection>();
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
    this.connections.set(playerId, pc);

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
    this.connections.get(playerId)?.close();
    this.connections.delete(playerId);
  }

  disconnectAll(): void {
    for (const playerId of this.connections.keys()) this.disconnectPlayer(playerId);
    this.socket.off("webrtc:answer", this.handleAnswer);
    this.socket.off("webrtc:ice-candidate", this.handleRemoteIceCandidate);
  }

  private handleAnswer = async ({ fromId, data }: SignalMessage): Promise<void> => {
    const pc = this.connections.get(fromId);
    if (!pc) return;
    await pc.setRemoteDescription(data as RTCSessionDescriptionInit);
  };

  private handleRemoteIceCandidate = async ({ fromId, data }: SignalMessage): Promise<void> => {
    const pc = this.connections.get(fromId);
    if (!pc) return;
    await pc.addIceCandidate(data as RTCIceCandidateInit);
  };
}
