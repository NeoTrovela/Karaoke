interface ScoreMeterProps {
  score: number;
  volume: number;
}

export default function ScoreMeter({ score, volume }: ScoreMeterProps) {
  return (
    <div className="flex w-full max-w-xs flex-col items-center gap-2">
      <div className="h-3 w-full overflow-hidden rounded-full bg-slate-800">
        <div
          className="h-full rounded-full bg-emerald-400 transition-[width] duration-100"
          style={{ width: `${Math.min(100, Math.max(0, volume))}%` }}
        />
      </div>
      <p className="text-2xl font-bold text-emerald-400">{score}</p>
    </div>
  );
}
