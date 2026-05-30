import { TouchOutput } from "../types";

const MAX_TAPS = 20;

export class CognitiveLoadTracker {
  private tapTimestamps: number[] = [];
  private errorCount = 0;
  private totalActions = 0;
  private onOutput: (out: TouchOutput) => void;

  constructor(onOutput: (out: TouchOutput) => void) {
    this.onOutput = onOutput;
  }

  recordTap(): void {
    const now = Date.now();
    this.tapTimestamps.push(now);
    if (this.tapTimestamps.length > MAX_TAPS) this.tapTimestamps.shift();
    this.totalActions++;
    this._emit();
  }

  recordError(): void {
    this.errorCount++;
    this.totalActions++;
    this._emit();
  }

  private _emit(): void {
    this.onOutput({ available: true, cognitiveLoad: this._compute(), confidence: 0.7 });
  }

  private _compute(): number {
    // High inter-tap variance = high load; high error rate = high load
    const itvVariance = this._itvVariance();
    const errorRate = this.totalActions > 5 ? this.errorCount / this.totalActions : 0;

    // Normalize: itv variance 0–500ms maps to 0–1
    const normalizedVariance = Math.min(itvVariance / 500, 1);
    return Math.min(normalizedVariance * 0.6 + errorRate * 0.4, 1);
  }

  private _itvVariance(): number {
    if (this.tapTimestamps.length < 3) return 0;
    const intervals: number[] = [];
    for (let i = 1; i < this.tapTimestamps.length; i++) {
      intervals.push(this.tapTimestamps[i]! - this.tapTimestamps[i - 1]!);
    }
    const mean = intervals.reduce((a, b) => a + b, 0) / intervals.length;
    const variance = intervals.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / intervals.length;
    return Math.sqrt(variance);
  }
}
