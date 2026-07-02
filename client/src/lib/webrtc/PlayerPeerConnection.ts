import type { Socket } from "socket.io-client";
import { ICE_SERVERS } from "./iceServers";
import type { SignalMessage } from "./types";

// Player side of the star topology: a single RTCPeerConnection to the host.
export class PlayerPeerConnection {
  private pc: RTCPeerConnection | null = null;
  private hostId: string | null = null;
  private localStream: MediaStream | null = null;
  private socket: Socket;

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
    const answer = await pc.createAnswer();
    await pc.setLocalDescription(answer);
    this.socket.emit("webrtc:answer", { targetId: fromId, data: answer });
  };

  private handleRemoteIceCandidate = async ({ fromId, data }: SignalMessage): Promise<void> => {
    if (fromId !== this.hostId || !this.pc) return;
    await this.pc.addIceCandidate(data as RTCIceCandidateInit);
  };
}
