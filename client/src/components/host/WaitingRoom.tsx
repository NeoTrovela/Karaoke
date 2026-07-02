import type { PlayerSummary } from "../../lib/socket";

export default function WaitingRoom({ players }: { players: PlayerSummary[] }) {
  if (players.length === 0) {
    return <p className="text-slate-400">Waiting for players to join…</p>;
  }

  return (
    <ul className="flex flex-col gap-2">
      {players.map((player) => (
        <li
          key={player.id}
          className="rounded-lg bg-slate-800 px-4 py-2 text-lg font-medium"
        >
          {player.displayName}
        </li>
      ))}
    </ul>
  );
}
