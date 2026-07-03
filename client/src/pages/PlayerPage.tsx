import { useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { getSocket } from "../lib/socket";
import { PlayerPeerConnection } from "../lib/webrtc/PlayerPeerConnection";
import JoinForm from "../components/player/JoinForm";

type JoinRoomResponse = { ok: true; code: string } | { ok: false; error: string };

export default function PlayerPage() {
  const { code: codeFromUrl } = useParams<{ code?: string }>();
  const [joinedCode, setJoinedCode] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [roomClosed, setRoomClosed] = useState(false);
  const [micLive, setMicLive] = useState(false);

  const peerRef = useRef<PlayerPeerConnection | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  function stopMic() {
    peerRef.current?.close();
    peerRef.current = null;
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    setMicLive(false);
  }

  useEffect(() => {
    if (!joinedCode) return;
    const socket = getSocket();
    function handleRoomClosed() {
      setRoomClosed(true);
      stopMic();
    }
    socket.on("room:closed", handleRoomClosed);
    return () => {
      socket.off("room:closed", handleRoomClosed);
    };
  }, [joinedCode]);

  // Release the mic if the player navigates away mid-session.
  useEffect(() => stopMic, []);

  async function handleJoin(code: string, displayName: string) {
    setSubmitting(true);
    setError(null);

    let stream: MediaStream;
    try {
      // Must be called synchronously from the click/submit that triggered this
      // handler (iOS Safari requires getUserMedia to originate from a user gesture).
      stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true },
      });
    } catch {
      setSubmitting(false);
      setError("Microphone access is required to sing. Allow mic access and try again.");
      return;
    }
    streamRef.current = stream;

    const socket = getSocket();
    peerRef.current = new PlayerPeerConnection(socket);
    peerRef.current.setLocalStream(stream);
    setMicLive(true);

    function attempt() {
      socket.emit(
        "player:join-room",
        { code, displayName },
        (res: JoinRoomResponse) => {
          setSubmitting(false);
          if (res.ok) {
            setJoinedCode(res.code);
          } else {
            setError(res.error);
            stopMic();
          }
        },
      );
    }

    if (socket.connected) {
      attempt();
    } else {
      socket.once("connect", attempt);
    }
  }

  if (joinedCode) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-slate-950 text-white">
        <h1 className="text-3xl font-bold">{roomClosed ? "Room closed" : "You're in!"}</h1>
        <p className="text-slate-400">
          {roomClosed ? (
            "The host ended this session."
          ) : (
            <>Waiting for the host to start room <span className="font-mono">{joinedCode}</span>…</>
          )}
        </p>
        {!roomClosed && micLive && (
          <p className="text-sm text-emerald-400">🎤 Mic connected — sing whenever you're ready!</p>
        )}
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-slate-950 text-white">
      <h1 className="text-3xl font-bold">Join a Game</h1>
      <JoinForm
        initialCode={(codeFromUrl ?? "").toUpperCase()}
        onSubmit={handleJoin}
        error={error}
        submitting={submitting}
      />
    </div>
  );
}
