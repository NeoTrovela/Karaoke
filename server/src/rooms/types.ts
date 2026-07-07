export interface Player {
  id: string; // socket id
  displayName: string;
  score: number;
}

export interface Room {
  code: string;
  hostSocketId: string;
  players: Map<string, Player>;
  createdAt: number;
}

export interface PlayerSummary {
  id: string;
  displayName: string;
  score: number;
}

export function toPlayerSummaries(room: Room): PlayerSummary[] {
  return Array.from(room.players.values()).map(({ id, displayName, score }) => ({
    id,
    displayName,
    score,
  }));
}
