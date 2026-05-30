import { Accelerometer, Gyroscope } from "expo-sensors";
import type { Subscription } from "expo-sensors/build/Pedometer";
import { IMUOutput } from "../types";

const SAMPLE_RATE_HZ = 50;
const WINDOW_MS = 500;
const WINDOW_SAMPLES = (SAMPLE_RATE_HZ * WINDOW_MS) / 1000; // 25 samples

interface Vec3 {
  x: number;
  y: number;
  z: number;
}

export class IMUModule {
  private accelBuffer: Vec3[] = [];
  private gyroBuffer: Vec3[] = [];
  private accelSub: Subscription | null = null;
  private gyroSub: Subscription | null = null;
  private thresholds = { confirmPeakZ: 2.5, rejectOscAmp: 1.8, tiltAngleDeg: 25 };
  private onOutput: (out: IMUOutput) => void;
  private intervalId: ReturnType<typeof setInterval> | null = null;

  constructor(onOutput: (out: IMUOutput) => void) {
    this.onOutput = onOutput;
  }

  setThresholds(t: typeof this.thresholds): void {
    this.thresholds = t;
  }

  start(): void {
    Accelerometer.setUpdateInterval(1000 / SAMPLE_RATE_HZ);
    Gyroscope.setUpdateInterval(1000 / SAMPLE_RATE_HZ);

    this.accelSub = Accelerometer.addListener((data) => {
      this.accelBuffer.push(data);
      if (this.accelBuffer.length > WINDOW_SAMPLES * 2) {
        this.accelBuffer.shift();
      }
    });

    this.gyroSub = Gyroscope.addListener((data) => {
      this.gyroBuffer.push(data);
      if (this.gyroBuffer.length > WINDOW_SAMPLES * 2) {
        this.gyroBuffer.shift();
      }
    });

    this.intervalId = setInterval(() => this._classify(), WINDOW_MS);
  }

  stop(): void {
    this.accelSub?.remove();
    this.gyroSub?.remove();
    if (this.intervalId) clearInterval(this.intervalId);
    this.accelBuffer = [];
    this.gyroBuffer = [];
  }

  private _classify(): void {
    if (this.accelBuffer.length < WINDOW_SAMPLES) {
      this.onOutput({ available: true, intent: "idle", jerkMagnitude: 0, confidence: 0 });
      return;
    }

    const window = this.accelBuffer.slice(-WINDOW_SAMPLES);
    const jerk = this._jerkMagnitude(window);

    const intent = this._detectGesture(window, jerk);
    this.onOutput({
      available: true,
      intent,
      jerkMagnitude: jerk,
      confidence: jerk > 0.5 ? Math.min(jerk / 4, 1) : 0.1,
    });
  }

  private _jerkMagnitude(window: Vec3[]): number {
    let total = 0;
    for (let i = 1; i < window.length; i++) {
      const dx = (window[i]!.x - window[i - 1]!.x) * SAMPLE_RATE_HZ;
      const dy = (window[i]!.y - window[i - 1]!.y) * SAMPLE_RATE_HZ;
      const dz = (window[i]!.z - window[i - 1]!.z) * SAMPLE_RATE_HZ;
      total += Math.sqrt(dx * dx + dy * dy + dz * dz);
    }
    return total / window.length;
  }

  private _detectGesture(window: Vec3[], jerk: number): IMUOutput["intent"] {
    // Nod: single Z-axis spike above threshold
    const zPeak = Math.max(...window.map((s) => Math.abs(s.z)));
    if (zPeak > this.thresholds.confirmPeakZ && jerk > 1.5) return "confirm";

    // Shake: X-axis oscillation — count zero crossings
    const xValues = window.map((s) => s.x);
    const xMean = xValues.reduce((a, b) => a + b, 0) / xValues.length;
    let crossings = 0;
    for (let i = 1; i < xValues.length; i++) {
      if ((xValues[i - 1]! - xMean) * (xValues[i]! - xMean) < 0) crossings++;
    }
    if (crossings > 6 && jerk > 1.0) return "reject";

    // Tilt: sustained Y-axis roll — use gyroscope roll rate
    if (this.gyroBuffer.length >= WINDOW_SAMPLES) {
      const gyroWindow = this.gyroBuffer.slice(-WINDOW_SAMPLES);
      const meanRoll = gyroWindow.reduce((a, s) => a + s.y, 0) / gyroWindow.length;
      const rollDeg = (meanRoll * 180) / Math.PI;
      if (rollDeg > this.thresholds.tiltAngleDeg) return "right";
      if (rollDeg < -this.thresholds.tiltAngleDeg) return "left";
    }

    return "idle";
  }
}
