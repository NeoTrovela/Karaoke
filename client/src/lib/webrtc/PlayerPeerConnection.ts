import type { Socket } from "socket.io-client";
import { ICE_SERVERS } from "./iceServers";
import type { SignalMessage } from "./types";

// Player side of the star topology: a single RTCPeerConnection to the host.
export class PlayerPeerConnection {
  private pc: RTCPeerConnection | null = null;
  private hostId: string | null = null;
  private localStream: MediaStream | null = null;
  private socket: Socket;
  private pendingCandidates: RTCIceCandidateInit[] = [];

  constructor(socket: Socket) {
    this.socket = socket;
    this.socket.on("webrtc:offer", this.handleOffer);
    this.socket.on("webrtc:ice-candidate", this.handleRemoteIceCandidate);
  }

  // Called once mic capture is wired up (M2); safe to call before or after the offer arrives.
  setLocalStream(stream: MediaStream): void {
    this.localStream = stream;
    if (this.pc) {
      for (const track of stream.getTracks()) this.pc.addTrack(track, stream);
    }
  }

  close(): void {
    this.pc?.close();
    this.pc = null;
    this.hostId = null;
    this.pendingCandidates = [];
    this.socket.off("webrtc:offer", this.handleOffer);
    this.socket.off("webrtc:ice-candidate", this.handleRemoteIceCandidate);
  }

  private handleOffer = async ({ fromId, data }: SignalMessage): Promise<void> => {
    this.hostId = fromId;
    const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });
    this.pc = pc;

    if (this.localStream) {
      for (const track of this.localStream.getTracks()) pc.addTrack(track, this.localStream);
    }

    pc.onicecandidate = (event) => {
      if (event.candidate && this.hostId) {
        this.socket.emit("webrtc:ice-candidate", {
          targetId: this.hostId,
          data: event.candidate.toJSON(),
        });
      }
    };

    await pc.setRemoteDescription(data as RTCSessionDescriptionInit);
    for (const candidate of this.pendingCandidates) {
      await pc.addIceCandidate(candidate);
    }
    this.pendingCandidates = [];

    const answer = await pc.createAnswer();
    await pc.setLocalDescription(answer);
    this.socket.emit("webrtc:answer", { targetId: fromId, data: answer });
  };

  // ICE candidates can arrive before the offer's setRemoteDescription() resolves
  // (candidates start flowing almost immediately after createOffer, often faster
  // than the signaling round-trip) - buffer until it's safe to apply.
  private handleRemoteIceCandidate = async ({ fromId, data }: SignalMessage): Promise<void> => {
    if (fromId !== this.hostId || !this.pc) return;
    const candidate = data as RTCIceCandidateInit;
    if (this.pc.remoteDescription) {
      await this.pc.addIceCandidate(candidate);
    } else {
      this.pendingCandidates.push(candidate);
    }
  };
}
