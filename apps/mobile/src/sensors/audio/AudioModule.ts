import { Audio } from "expo-av";
import type { AudioOutput } from "../types";

// Simplified audio arousal estimation using RMS energy and zero-crossing rate.
// A full implementation would load the TFLite YAMNet model via @tensorflow/tfjs-tflite.
// This rule-based version runs without a bundled model and serves as a baseline.

const WINDOW_MS = 100;
const SAMPLE_RATE = 16000;
const WINDOW_SAMPLES = (SAMPLE_RATE * WINDOW_MS) / 1000;

export class AudioModule {
  private recording: Audio.Recording | null = null;
  private running = false;
  private breathingBuffer: number[] = [];
  private onOutput: (out: AudioOutput) => void;

  constructor(onOutput: (out: AudioOutput) => void) {
    this.onOutput = onOutput;
  }

  async start(): Promise<void> {
    await Audio.requestPermissionsAsync();
    await Audio.setAudioModeAsync({ allowsRecordingIOS: true, playsInSilentModeIOS: true });
    this.running = true;
    this._loop();
  }

  async stop(): Promise<void> {
    this.running = false;
    if (this.recording) {
      await this.recording.stopAndUnloadAsync();
      this.recording = null;
    }
  }

  private async _loop(): Promise<void> {
    while (this.running) {
      try {
        const rec = new Audio.Recording();
        await rec.prepareToRecordAsync(Audio.RecordingOptionsPresets.LOW_QUALITY);
        await rec.startAsync();
        await new Promise((r) => setTimeout(r, WINDOW_MS));
        await rec.stopAndUnloadAsync();

        const status = await rec.getStatusAsync();
        const rms = this._estimateRMS(status);
        this._processWindow(rms);
      } catch {
        // Mic unavailable or permissions revoked — emit degraded output
        this.onOutput({ available: false, arousal: 0.5, valence: 0.5, breathingRate: 15, confidence: 0 });
        await new Promise((r) => setTimeout(r, 500));
      }
    }
  }

  private _estimateRMS(status: Audio.RecordingStatus): number {
    // expo-av doesn't expose raw PCM; use metering level as RMS proxy
    if ("metering" in status && typeof (status as any).metering === "number") {
      const dBFS = (status as any).metering as number; // dBFS, typically -160 to 0
      return Math.pow(10, dBFS / 20); // convert to linear amplitude
    }
    return 0;
  }

  private _processWindow(rms: number): void {
    this.breathingBuffer.push(rms);
    if (this.breathingBuffer.length > 300) this.breathingBuffer.shift(); // ~30s

    const arousal = Math.min(rms * 10, 1); // louder = higher arousal
    const breathingRate = this._estimateBreathingRate();
    // Valence estimated from breathing regularity: regular breathing → positive valence
    const breathingVariance = this._variance(this.breathingBuffer.slice(-60));
    const valence = Math.max(0, 1 - breathingVariance * 50);

    this.onOutput({ available: true, arousal, valence, breathingRate, confidence: 0.6 });
  }

  private _estimateBreathingRate(): number {
    if (this.breathingBuffer.length < 60) return 15;
    // Count peaks in 10s window (every ~0.1s sample)
    const window = this.breathingBuffer.slice(-100);
    let peaks = 0;
    for (let i = 1; i < window.length - 1; i++) {
      if (window[i]! > window[i - 1]! && window[i]! > window[i + 1]! && window[i]! > 0.05) peaks++;
    }
    return (peaks / 10) * 60; // peaks per 10s → per minute
  }

  private _variance(arr: number[]): number {
    const mean = arr.reduce((a, b) => a + b, 0) / arr.length;
    return arr.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / arr.length;
  }
}
