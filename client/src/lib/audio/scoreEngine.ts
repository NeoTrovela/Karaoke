export interface AudioSample {
  pitchHz: number;
  clarity: number;
  rms: number;
}

// pitchy's docs suggest 0.8-1.0 as the suitable clarity-threshold range.
const CLARITY_THRESHOLD = 0.8;
// ~3s of samples at the 100ms tick rate PlayerPage.tsx drives this at.
const WINDOW_SIZE = 30;
// "Good singing volume" baseline for a typical getUserMedia stream; tunable.
const REFERENCE_RMS = 0.15;
// Scales how fast the steadiness score decays as semitone variance grows.
const STEADINESS_DECAY = 8;
const MIN_VOICED_FOR_STEADINESS = 3;

function hzToSemitone(hz: number): number {
  return 69 + 12 * Math.log2(hz / 440);
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

// Rolling-window "fun" score: energy (volume) + pitch steadiness (in
// semitones, so octave jumps aren't over/under-weighted) + participation
// (fraction of recent frames actually voiced). Not true melody-accuracy
// grading - see docs/ARCHITECTURE.md's design decisions for why.
export class ScoreEngine {
  private samples: AudioSample[] = [];
  // Every sample since the last reset() (a full song), not windowed - used
  // for a fairer end-of-song score than whatever the rolling window says at
  // the exact instant the video ends.
  private sessionSamples: AudioSample[] = [];

  addSample(sample: AudioSample): void {
    this.samples.push(sample);
    if (this.samples.length > WINDOW_SIZE) {
      this.samples.shift();
    }
    this.sessionSamples.push(sample);
  }

  reset(): void {
    this.samples = [];
    this.sessionSamples = [];
  }

  getVolume(): number {
    return this.computeVolume(this.samples);
  }

  getScore(): number {
    return this.computeScore(this.samples);
  }

  getSessionScore(): number {
    return this.computeScore(this.sessionSamples);
  }

  private computeScore(samples: AudioSample[]): number {
    if (samples.length === 0) return 0;
    const composite =
      this.computeVolume(samples) * 0.4 +
      this.computeSteadiness(samples) * 0.35 +
      this.computeParticipation(samples) * 0.25;
    return Math.round(clamp(composite, 0, 100));
  }

  private computeVolume(samples: AudioSample[]): number {
    if (samples.length === 0) return 0;
    const avgRms = samples.reduce((sum, s) => sum + s.rms, 0) / samples.length;
    return clamp((avgRms / REFERENCE_RMS) * 100, 0, 100);
  }

  private getVoicedSemitones(samples: AudioSample[]): number[] {
    return samples
      .filter((s) => s.clarity >= CLARITY_THRESHOLD)
      .map((s) => hzToSemitone(s.pitchHz));
  }

  private computeSteadiness(samples: AudioSample[]): number {
    const semitones = this.getVoicedSemitones(samples);
    if (semitones.length < MIN_VOICED_FOR_STEADINESS) return 0;
    const mean = semitones.reduce((sum, v) => sum + v, 0) / semitones.length;
    const variance = semitones.reduce((sum, v) => sum + (v - mean) ** 2, 0) / semitones.length;
    return clamp(100 * Math.exp(-variance / STEADINESS_DECAY), 0, 100);
  }

  private computeParticipation(samples: AudioSample[]): number {
    if (samples.length === 0) return 0;
    const voicedCount = samples.filter((s) => s.clarity >= CLARITY_THRESHOLD).length;
    return clamp((voicedCount / samples.length) * 100, 0, 100);
  }
}
