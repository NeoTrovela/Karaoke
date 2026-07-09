import type { PlayerSummary } from "../../lib/socket";
import { sortByScore } from "../../lib/ranking";

const ROW_HEIGHT = 32;

interface LeaderboardProps {
  players: PlayerSummary[];
  mutedPlayerIds: Set<string>;
  onToggleMute: (playerId: string) => void;
}

export default function Leaderboard({ players, mutedPlayerIds, onToggleMute }: LeaderboardProps) {
  if (players.length === 0) return null;

  const ranked = sortByScore(players);

  return (
    <div
      className="fixed top-4 left-4 w-64 rounded-lg bg-black/60 px-4 py-3 text-white"
      style={{ height: ranked.length * ROW_HEIGHT }}
    >
      <div className="relative h-full">
        {ranked.map((player, index) => (
          <div
            key={player.id}
            className="absolute flex w-full items-center gap-3 text-sm transition-transform duration-500 ease-out"
            style={{ transform: `translateY(${index * ROW_HEIGHT}px)`, height: ROW_HEIGHT }}
          >
            <span className="w-4 text-slate-400">{index + 1}</span>
            <span className="flex-1 truncate font-medium">{player.displayName}</span>
            <span className="font-mono text-emerald-400">{player.score}</span>
            <button
              type="button"
              onClick={() => onToggleMute(player.id)}
              aria-label={mutedPlayerIds.has(player.id) ? "Unmute" : "Mute"}
              className="shrink-0 text-xs"
            >
              {mutedPlayerIds.has(player.id) ? "🔇" : "🔊"}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
