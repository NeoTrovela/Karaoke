import { PitchDetector } from "pitchy";

export interface PitchReading {
  pitchHz: number;
  clarity: number;
  rms: number;
}

// Wraps Web Audio + pitchy around the same MediaStream already captured for
// WebRTC (see PlayerPage.tsx) - no double mic capture.
export class PitchAnalyzer {
  private audioContext: AudioContext;
  private analyserNode: AnalyserNode;
  private pitchDetector: PitchDetector<Float32Array<ArrayBuffer>>;
  private buffer: Float32Array<ArrayBuffer>;

  constructor(stream: MediaStream) {
    this.audioContext = new AudioContext();
    const source = this.audioContext.createMediaStreamSource(stream);
    this.analyserNode = this.audioContext.createAnalyser();
    this.analyserNode.fftSize = 2048;
    source.connect(this.analyserNode);

    this.pitchDetector = PitchDetector.forFloat32Array(this.analyserNode.fftSize);
    this.buffer = new Float32Array(new ArrayBuffer(this.analyserNode.fftSize * Float32Array.BYTES_PER_ELEMENT));
  }

  analyze(): PitchReading {
    this.analyserNode.getFloatTimeDomainData(this.buffer);
    const [pitchHz, clarity] = this.pitchDetector.findPitch(
      this.buffer,
      this.audioContext.sampleRate,
    );

    let sumSquares = 0;
    for (const sample of this.buffer) sumSquares += sample * sample;
    const rms = Math.sqrt(sumSquares / this.buffer.length);

    return { pitchHz, clarity, rms };
  }

  close(): void {
    this.analyserNode.disconnect();
    void this.audioContext.close();
  }
}
