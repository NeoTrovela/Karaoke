import type { PlayerSummary } from "./socket";

export function sortByScore(players: PlayerSummary[]): PlayerSummary[] {
  return [...players].sort((a, b) => b.score - a.score);
}

export function computeRank(
  players: PlayerSummary[],
  ownId: string,
): { rank: number; total: number; score: number } {
  const ranked = sortByScore(players);
  const index = ranked.findIndex((player) => player.id === ownId);
  const own = ranked[index];
  return {
    rank: index === -1 ? ranked.length : index + 1,
    total: ranked.length,
    score: own?.score ?? 0,
  };
}
