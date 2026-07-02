import { useState } from "react";
import { useParams } from "react-router-dom";
import { getSocket } from "../lib/socket";
import JoinForm from "../components/player/JoinForm";

type JoinRoomResponse = { ok: true; code: string } | { ok: false; error: string };

export default function PlayerPage() {
  const { code: codeFromUrl } = useParams<{ code?: string }>();
  const [joinedCode, setJoinedCode] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  function handleJoin(code: string, displayName: string) {
    setSubmitting(true);
    setError(null);
    const socket = getSocket();

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
        <h1 className="text-3xl font-bold">You're in!</h1>
        <p className="text-slate-400">
          Waiting for the host to start room <span className="font-mono">{joinedCode}</span>…
        </p>
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
