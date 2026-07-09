import type { PlayerSummary } from "../../lib/socket";
import { sortByScore } from "../../lib/ranking";

interface FinalResultsProps {
  players: PlayerSummary[];
  onPlayAnother: () => void;
}

export default function FinalResults({ players, onPlayAnother }: FinalResultsProps) {
  const ranked = sortByScore(players);

  return (
    <div className="fixed inset-0 flex flex-col items-center justify-center gap-8 bg-slate-950 text-white">
      <h1 className="text-4xl font-bold">Final Results</h1>
      <ol className="flex w-full max-w-md flex-col gap-2">
        {ranked.map((player, index) => (
          <li
            key={player.id}
            className={`flex items-center gap-4 rounded-lg px-5 py-3 ${
              index === 0 ? "bg-amber-500/20 text-amber-300" : "bg-slate-800/80"
            }`}
          >
            <span className="w-6 text-lg font-bold">{index + 1}</span>
            <span className="flex-1 truncate text-lg font-medium">{player.displayName}</span>
            <span className="font-mono text-xl text-emerald-400">{player.score}</span>
          </li>
        ))}
      </ol>
      <button
        type="button"
        onClick={onPlayAnother}
        className="rounded-lg bg-purple-600 px-6 py-3 text-lg font-semibold hover:bg-purple-500"
      >
        Pick another song
      </button>
    </div>
  );
}
