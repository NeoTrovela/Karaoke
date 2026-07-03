import type { PlayerSummary } from "../../lib/socket";

interface WaitingRoomProps {
  players: PlayerSummary[];
  livePlayerIds?: Set<string>;
}

export default function WaitingRoom({ players, livePlayerIds }: WaitingRoomProps) {
  if (players.length === 0) {
    return <p className="text-slate-400">Waiting for players to join…</p>;
  }

  return (
    <ul className="flex flex-col gap-2">
      {players.map((player) => (
        <li
          key={player.id}
          className="flex items-center gap-2 rounded-lg bg-slate-800 px-4 py-2 text-lg font-medium"
        >
          {livePlayerIds?.has(player.id) && <span aria-label="Mic connected">🎤</span>}
          {player.displayName}
        </li>
      ))}
    </ul>
  );
}
