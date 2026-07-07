import type { PlayerSummary } from "../../lib/socket";

export default function Leaderboard({ players }: { players: PlayerSummary[] }) {
  if (players.length === 0) return null;

  const ranked = [...players].sort((a, b) => b.score - a.score);

  return (
    <ul className="fixed top-4 left-4 flex flex-col gap-1 rounded-lg bg-black/60 px-4 py-3 text-white">
      {ranked.map((player, index) => (
        <li key={player.id} className="flex items-center gap-3 text-sm">
          <span className="w-4 text-slate-400">{index + 1}</span>
          <span className="flex-1 font-medium">{player.displayName}</span>
          <span className="font-mono text-emerald-400">{player.score}</span>
        </li>
      ))}
    </ul>
  );
}
