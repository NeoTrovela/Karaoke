export interface SignalMessage {
  fromId: string;
  data: RTCSessionDescriptionInit | RTCIceCandidateInit;
}
