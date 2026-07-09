import type { PlayerSummary } from "../../lib/socket";

interface WaitingRoomProps {
  players: PlayerSummary[];
  livePlayerIds?: Set<string>;
  mutedPlayerIds: Set<string>;
  onToggleMute: (playerId: string) => void;
}

export default function WaitingRoom({
  players,
  livePlayerIds,
  mutedPlayerIds,
  onToggleMute,
}: WaitingRoomProps) {
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
          <span className="flex-1">{player.displayName}</span>
          <button
            type="button"
            onClick={() => onToggleMute(player.id)}
            aria-label={mutedPlayerIds.has(player.id) ? "Unmute" : "Mute"}
            className="rounded-lg bg-slate-700 px-2 py-1 text-sm hover:bg-slate-600"
          >
            {mutedPlayerIds.has(player.id) ? "🔇" : "🔊"}
          </button>
        </li>
      ))}
    </ul>
  );
}
