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

  addSample(sample: AudioSample): void {
    this.samples.push(sample);
    if (this.samples.length > WINDOW_SIZE) {
      this.samples.shift();
    }
  }

  getVolume(): number {
    if (this.samples.length === 0) return 0;
    const avgRms = this.samples.reduce((sum, s) => sum + s.rms, 0) / this.samples.length;
    return clamp((avgRms / REFERENCE_RMS) * 100, 0, 100);
  }

  getScore(): number {
    if (this.samples.length === 0) return 0;
    const composite =
      this.getVolume() * 0.4 + this.getSteadiness() * 0.35 + this.getParticipation() * 0.25;
    return Math.round(clamp(composite, 0, 100));
  }

  private getVoicedSemitones(): number[] {
    return this.samples
      .filter((s) => s.clarity >= CLARITY_THRESHOLD)
      .map((s) => hzToSemitone(s.pitchHz));
  }

  private getSteadiness(): number {
    const semitones = this.getVoicedSemitones();
    if (semitones.length < MIN_VOICED_FOR_STEADINESS) return 0;
    const mean = semitones.reduce((sum, v) => sum + v, 0) / semitones.length;
    const variance = semitones.reduce((sum, v) => sum + (v - mean) ** 2, 0) / semitones.length;
    return clamp(100 * Math.exp(-variance / STEADINESS_DECAY), 0, 100);
  }

  private getParticipation(): number {
    if (this.samples.length === 0) return 0;
    const voicedCount = this.samples.filter((s) => s.clarity >= CLARITY_THRESHOLD).length;
    return clamp((voicedCount / this.samples.length) * 100, 0, 100);
  }
}
