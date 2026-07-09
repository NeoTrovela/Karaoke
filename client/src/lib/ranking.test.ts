import { describe, expect, it } from "vitest";
import { computeRank, sortByScore } from "./ranking";

describe("sortByScore", () => {
  it("sorts descending without mutating the input", () => {
    const players = [
      { id: "a", displayName: "A", score: 20 },
      { id: "b", displayName: "B", score: 80 },
    ];
    const sorted = sortByScore(players);
    expect(sorted.map((p) => p.id)).toEqual(["b", "a"]);
    expect(players.map((p) => p.id)).toEqual(["a", "b"]);
  });
});

describe("computeRank", () => {
  it("ranks the own player by descending score", () => {
    const players = [
      { id: "a", displayName: "A", score: 20 },
      { id: "b", displayName: "B", score: 80 },
      { id: "c", displayName: "C", score: 50 },
    ];

    expect(computeRank(players, "b")).toEqual({ rank: 1, total: 3, score: 80 });
    expect(computeRank(players, "c")).toEqual({ rank: 2, total: 3, score: 50 });
    expect(computeRank(players, "a")).toEqual({ rank: 3, total: 3, score: 20 });
  });

  it("falls back to last place if the own id isn't in the list", () => {
    const players = [{ id: "a", displayName: "A", score: 20 }];
    expect(computeRank(players, "missing")).toEqual({ rank: 1, total: 1, score: 0 });
  });
});
