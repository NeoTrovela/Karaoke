import { describe, expect, it } from "vitest";
import { ScoreEngine, type AudioSample } from "./scoreEngine.js";

function feed(engine: ScoreEngine, sample: AudioSample, count: number): void {
  for (let i = 0; i < count; i++) engine.addSample(sample);
}

describe("ScoreEngine", () => {
  it("returns 0 with no samples", () => {
    expect(new ScoreEngine().getScore()).toBe(0);
  });

  it("scores silence low", () => {
    const engine = new ScoreEngine();
    feed(engine, { pitchHz: 0, clarity: 0, rms: 0 }, 30);
    expect(engine.getScore()).toBeLessThan(10);
  });

  it("scores a sustained, clear, loud note highly", () => {
    const engine = new ScoreEngine();
    feed(engine, { pitchHz: 440, clarity: 0.95, rms: 0.2 }, 30);
    expect(engine.getScore()).toBeGreaterThan(85);
  });

  it("scores shouting (loud, no clear pitch) lower than sustained singing", () => {
    const sustained = new ScoreEngine();
    feed(sustained, { pitchHz: 440, clarity: 0.95, rms: 0.2 }, 30);

    const shouting = new ScoreEngine();
    feed(shouting, { pitchHz: 0, clarity: 0.1, rms: 0.3 }, 30);

    expect(shouting.getScore()).toBeLessThan(sustained.getScore());
  });

  it("scores wildly varying pitch lower than steady pitch, at the same volume/participation", () => {
    const steady = new ScoreEngine();
    feed(steady, { pitchHz: 440, clarity: 0.9, rms: 0.15 }, 30);

    const varying = new ScoreEngine();
    const wildPitches = [220, 880, 110, 660, 330, 990];
    for (let i = 0; i < 30; i++) {
      varying.addSample({ pitchHz: wildPitches[i % wildPitches.length], clarity: 0.9, rms: 0.15 });
    }

    expect(varying.getScore()).toBeLessThan(steady.getScore());
  });

  it("scores normal singing (small natural pitch variation) highly", () => {
    const engine = new ScoreEngine();
    const naturalPitches = [438, 440, 441, 439, 442, 440];
    for (let i = 0; i < 30; i++) {
      engine.addSample({ pitchHz: naturalPitches[i % naturalPitches.length], clarity: 0.85, rms: 0.15 });
    }
    expect(engine.getScore()).toBeGreaterThan(80);
  });

  it("only counts high-clarity samples toward steadiness/participation", () => {
    const engine = new ScoreEngine();
    // Mix of confidently-voiced and low-confidence noisy samples.
    for (let i = 0; i < 15; i++) engine.addSample({ pitchHz: 440, clarity: 0.9, rms: 0.15 });
    for (let i = 0; i < 15; i++) engine.addSample({ pitchHz: 5000, clarity: 0.1, rms: 0.15 });

    // Participation should reflect ~50% voiced, not be thrown off by the noisy half's pitch.
    const score = engine.getScore();
    expect(score).toBeGreaterThan(0);
    expect(score).toBeLessThan(100);
  });

  it("keeps only the most recent samples within the rolling window", () => {
    const engine = new ScoreEngine();
    feed(engine, { pitchHz: 0, clarity: 0, rms: 0 }, 30);
    expect(engine.getScore()).toBeLessThan(10);

    feed(engine, { pitchHz: 440, clarity: 0.95, rms: 0.2 }, 30);
    expect(engine.getScore()).toBeGreaterThan(85);
  });

  describe("getSessionScore", () => {
    it("returns 0 with no samples", () => {
      expect(new ScoreEngine().getSessionScore()).toBe(0);
    });

    it("stays high even if the singer goes quiet right at the very end", () => {
      const engine = new ScoreEngine();
      // ~27s of a great performance, at the 100ms tick rate PlayerPage.tsx uses.
      feed(engine, { pitchHz: 440, clarity: 0.95, rms: 0.2 }, 270);
      // Then trails off to silence right as the song ends - only the last
      // ~3s the rolling window sees.
      feed(engine, { pitchHz: 0, clarity: 0, rms: 0 }, 30);

      expect(engine.getScore()).toBeLessThan(10);
      expect(engine.getSessionScore()).toBeGreaterThan(85);
    });

    it("reflects the whole session, not just the rolling window", () => {
      const engine = new ScoreEngine();
      feed(engine, { pitchHz: 0, clarity: 0, rms: 0 }, 30);
      feed(engine, { pitchHz: 440, clarity: 0.95, rms: 0.2 }, 30);

      // Rolling window only sees the good half; session sees both halves.
      expect(engine.getScore()).toBeGreaterThan(engine.getSessionScore());
    });
  });

  describe("reset", () => {
    it("clears both the rolling window and the session history", () => {
      const engine = new ScoreEngine();
      feed(engine, { pitchHz: 440, clarity: 0.95, rms: 0.2 }, 30);
      expect(engine.getScore()).toBeGreaterThan(0);
      expect(engine.getSessionScore()).toBeGreaterThan(0);

      engine.reset();

      expect(engine.getScore()).toBe(0);
      expect(engine.getSessionScore()).toBe(0);
    });
  });
});
