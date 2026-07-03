import { describe, expect, it } from "vitest";
import { generateRoomCode } from "./roomCode.js";

const AMBIGUOUS_CHARS = ["0", "O", "1", "I", "L"];

describe("generateRoomCode", () => {
  it("generates a 5-character code", () => {
    expect(generateRoomCode()).toHaveLength(5);
  });

  it("only uses characters from the non-ambiguous alphabet", () => {
    const code = generateRoomCode();
    for (const char of code) {
      expect(AMBIGUOUS_CHARS).not.toContain(char);
      expect(char).toMatch(/^[23456789A-HJ-NP-Z]$/);
    }
  });

  it("generates different codes across many calls", () => {
    const codes = new Set(Array.from({ length: 20 }, () => generateRoomCode()));
    expect(codes.size).toBeGreaterThan(1);
  });
});
