import { useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { getSocket, type PlayerSummary } from "../lib/socket";
import { PlayerPeerConnection } from "../lib/webrtc/PlayerPeerConnection";
import { PitchAnalyzer } from "../lib/audio/PitchAnalyzer";
import { ScoreEngine } from "../lib/audio/scoreEngine";
import JoinForm from "../components/player/JoinForm";
import ScoreMeter from "../components/player/ScoreMeter";
import SongResult from "../components/player/SongResult";

type JoinRoomResponse = { ok: true; code: string } | { ok: false; error: string };

const ANALYSIS_INTERVAL_MS = 100;
const SCORE_EMIT_INTERVAL_MS = 500;

export default function PlayerPage() {
  const { code: codeFromUrl } = useParams<{ code?: string }>();
  const [joinedCode, setJoinedCode] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [roomClosed, setRoomClosed] = useState(false);
  const [micLive, setMicLive] = useState(false);
  const [score, setScore] = useState(0);
  const [volume, setVolume] = useState(0);
  const [muted, setMuted] = useState(false);
  const [showingResults, setShowingResults] = useState(false);
  const [players, setPlayers] = useState<PlayerSummary[]>([]);

  const peerRef = useRef<PlayerPeerConnection | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const analyzerRef = useRef<PitchAnalyzer | null>(null);
  const scoreEngineRef = useRef<ScoreEngine | null>(null);
  const mutedRef = useRef(false);
  const analysisIntervalRef = useRef<number | null>(null);
  const emitIntervalRef = useRef<number | null>(null);

  // Stops the periodic mic-analysis/score-emit loop without touching the mic
  // stream or WebRTC connection - used to pause scoring while results are
  // showing, so post-song ambient noise doesn't clobber the final score.
  function pauseAnalysisLoop() {
    if (analysisIntervalRef.current !== null) {
      clearInterval(analysisIntervalRef.current);
      analysisIntervalRef.current = null;
    }
    if (emitIntervalRef.current !== null) {
      clearInterval(emitIntervalRef.current);
      emitIntervalRef.current = null;
    }
  }

  // Idempotent: always clears any existing interval pair first, so calling
  // this more than once in a row (e.g. React StrictMode's dev-only
  // double-invoke of effects) can never leak an orphaned, un-stoppable
  // interval running alongside a newer one.
  function startAnalysisLoop() {
    pauseAnalysisLoop();
    const analyzer = analyzerRef.current;
    const scoreEngine = scoreEngineRef.current;
    if (!analyzer || !scoreEngine) return;
    const socket = getSocket();

    analysisIntervalRef.current = window.setInterval(() => {
      if (mutedRef.current) {
        setVolume(0);
        return;
      }
      scoreEngine.addSample(analyzer.analyze());
      setScore(scoreEngine.getScore());
      setVolume(scoreEngine.getVolume());
    }, ANALYSIS_INTERVAL_MS);

    emitIntervalRef.current = window.setInterval(() => {
      socket.emit("player:score-update", { score: scoreEngine.getScore() });
    }, SCORE_EMIT_INTERVAL_MS);
  }

  function stopMic() {
    peerRef.current?.close();
    peerRef.current = null;
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    pauseAnalysisLoop();
    analyzerRef.current?.close();
    analyzerRef.current = null;
    scoreEngineRef.current = null;
    mutedRef.current = false;
    setMuted(false);
    setMicLive(false);
    setScore(0);
    setVolume(0);
  }

  function toggleMute() {
    const next = !mutedRef.current;
    mutedRef.current = next;
    setMuted(next);
    const track = streamRef.current?.getAudioTracks()[0];
    if (track) track.enabled = !next;
    if (next) setVolume(0);
  }

  useEffect(() => {
    if (!joinedCode) return;
    const socket = getSocket();
    function handleRoomClosed() {
      setRoomClosed(true);
      stopMic();
    }
    function handleVideoEnded() {
      const finalScore = scoreEngineRef.current?.getSessionScore();
      if (finalScore !== undefined) {
        socket.emit("player:score-update", { score: finalScore });
      }
      // Stop sampling so post-song ambient noise can't overwrite the final
      // score before the next round starts.
      pauseAnalysisLoop();
      setShowingResults(true);
    }
    function handleVideoStarted() {
      scoreEngineRef.current?.reset();
      setShowingResults(false);
      startAnalysisLoop();
    }
    function handlePlayers({ players: nextPlayers }: { players: PlayerSummary[] }) {
      setPlayers(nextPlayers);
    }
    socket.on("room:closed", handleRoomClosed);
    socket.on("room:video-ended", handleVideoEnded);
    socket.on("room:video-started", handleVideoStarted);
    socket.on("room:players", handlePlayers);
    return () => {
      socket.off("room:closed", handleRoomClosed);
      socket.off("room:video-ended", handleVideoEnded);
      socket.off("room:video-started", handleVideoStarted);
      socket.off("room:players", handlePlayers);
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

    analyzerRef.current = new PitchAnalyzer(stream);
    scoreEngineRef.current = new ScoreEngine();
    startAnalysisLoop();

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
        {!roomClosed && showingResults && (
          <SongResult players={players} ownId={getSocket().id ?? ""} />
        )}
        {!roomClosed && !showingResults && micLive && (
          <>
            <ScoreMeter score={score} volume={volume} />
            <button
              type="button"
              onClick={toggleMute}
              className="rounded-lg bg-slate-800 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700"
            >
              {muted ? "Unmute" : "Mute"}
            </button>
          </>
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
