import { useEffect, useState } from "react";
import { getSocket, type PlayerSummary } from "../lib/socket";
import RoomCodeQr from "../components/host/RoomCodeQr";
import WaitingRoom from "../components/host/WaitingRoom";

export default function HostPage() {
  const [code, setCode] = useState<string | null>(null);
  const [players, setPlayers] = useState<PlayerSummary[]>([]);

  useEffect(() => {
    const socket = getSocket();

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

    socket.on("room:players", ({ players }: { players: PlayerSummary[] }) => {
      setPlayers(players);
    });

    return () => {
      socket.off("connect", createRoom);
      socket.off("room:players");
    };
  }, []);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-10 bg-slate-950 text-white">
      <h1 className="text-3xl font-bold">Host a Game</h1>
      {code ? (
        <>
          <RoomCodeQr code={code} />
          <WaitingRoom players={players} />
        </>
      ) : (
        <p className="text-slate-400">Creating room…</p>
      )}
    </div>
  );
}
