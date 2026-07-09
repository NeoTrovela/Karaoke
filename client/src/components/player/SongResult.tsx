import type { PlayerSummary } from "../../lib/socket";
import { computeRank } from "../../lib/ranking";

interface SongResultProps {
  players: PlayerSummary[];
  ownId: string;
}

export default function SongResult({ players, ownId }: SongResultProps) {
  const { rank, total, score } = computeRank(players, ownId);

  return (
    <div className="flex flex-col items-center gap-2 text-center">
      <p className="text-2xl font-bold">
        You placed #{rank} of {total}!
      </p>
      <p className="text-lg text-slate-400">
        Score: <span className="font-mono text-emerald-400">{score}</span>
      </p>
    </div>
  );
}
