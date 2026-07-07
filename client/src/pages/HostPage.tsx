import { useEffect, useRef, useState } from "react";
import { getSocket, type PlayerSummary } from "../lib/socket";
import { HostPeerManager } from "../lib/webrtc/HostPeerManager";
import RoomCodeQr from "../components/host/RoomCodeQr";
import WaitingRoom from "../components/host/WaitingRoom";
import VideoUrlForm from "../components/host/VideoUrlForm";
import YoutubeStage from "../components/host/YoutubeStage";

export default function HostPage() {
  const [code, setCode] = useState<string | null>(null);
  const [players, setPlayers] = useState<PlayerSummary[]>([]);
  const [livePlayerIds, setLivePlayerIds] = useState<Set<string>>(new Set());
  const [videoId, setVideoId] = useState<string | null>(null);

  const audioElementsRef = useRef<Map<string, HTMLAudioElement>>(new Map());
  const knownPlayerIdsRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    const socket = getSocket();
    const audioElements = audioElementsRef.current;

    function playStream(playerId: string, stream: MediaStream) {
      let audio = audioElements.get(playerId);
      if (!audio) {
        audio = new Audio();
        audio.autoplay = true;
        audioElements.set(playerId, audio);
      }
      audio.srcObject = stream;
      setLivePlayerIds((prev) => new Set(prev).add(playerId));
    }

    function stopStream(playerId: string) {
      const audio = audioElements.get(playerId);
      if (audio) {
        audio.pause();
        audio.srcObject = null;
        audioElements.delete(playerId);
      }
      setLivePlayerIds((prev) => {
        const next = new Set(prev);
        next.delete(playerId);
        return next;
      });
    }

    const peerManager = new HostPeerManager(socket, playStream);

    function createRoom() {
      socket.emit("host:create-room", (res: { code: string }) => {
        setCode(res.code);
      });
    }

    if (socket.connected) {
      createRoom();
    } else {
      socket.once("connect", createRoom);
    }

    function handlePlayers({ players: nextPlayers }: { players: PlayerSummary[] }) {
      setPlayers(nextPlayers);

      const nextIds = new Set(nextPlayers.map((player) => player.id));
      for (const id of nextIds) {
        if (!knownPlayerIdsRef.current.has(id)) {
          peerManager.connectToPlayer(id);
        }
      }
      for (const id of knownPlayerIdsRef.current) {
        if (!nextIds.has(id)) {
          peerManager.disconnectPlayer(id);
          stopStream(id);
        }
      }
      knownPlayerIdsRef.current = nextIds;
    }

    socket.on("room:players", handlePlayers);

    return () => {
      socket.off("connect", createRoom);
      socket.off("room:players", handlePlayers);
      peerManager.disconnectAll();
      for (const audio of audioElements.values()) {
        audio.pause();
        audio.srcObject = null;
      }
      audioElements.clear();
      knownPlayerIdsRef.current = new Set();
    };
  }, []);

  if (code && videoId) {
    return (
      <YoutubeStage
        videoId={videoId}
        roomCode={code}
        players={players}
        onChangeVideo={() => setVideoId(null)}
      />
    );
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-10 bg-slate-950 text-white">
      <h1 className="text-3xl font-bold">Host a Game</h1>
      {code ? (
        <>
          <RoomCodeQr code={code} />
          <WaitingRoom players={players} livePlayerIds={livePlayerIds} />
          <VideoUrlForm onSubmit={setVideoId} />
        </>
      ) : (
        <p className="text-slate-400">Creating room…</p>
      )}
    </div>
  );
}
