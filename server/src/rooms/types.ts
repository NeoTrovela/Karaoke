export interface Player {
  id: string; // socket id
  displayName: string;
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
}

export function toPlayerSummaries(room: Room): PlayerSummary[] {
  return Array.from(room.players.values()).map(({ id, displayName }) => ({ id, displayName }));
}
