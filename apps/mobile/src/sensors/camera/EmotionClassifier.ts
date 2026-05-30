import type { MentalState } from "@brainlink/types";
import type { EmotionOutput } from "../types";

interface FaceFeatures {
  blinkRate: number;     // blinks/min
  au4BrowFurrow: number; // 0–1
  au12LipCorner: number; // 0–1 (positive = smile)
  gazeDeviation: number; // 0–1
  eyeAspectRatio: number;
}

interface EmotionBaselines {
  restingBlinkRate: number;
  restingAU4: number;
  restingAU12: number;
}

/**
 * Rule-based emotion classifier from facial features.
 * A production version would use a bundled TFLite model (face_emotion.tflite).
 * The rule-based fallback provides deterministic, explainable output with zero model size.
 */
export class EmotionClassifier {
  private baselines: EmotionBaselines = {
    restingBlinkRate: 15,
    restingAU4: 0.1,
    restingAU12: 0.2,
  };

  setBaselines(b: EmotionBaselines): void {
    this.baselines = b;
  }

  classify(features: FaceFeatures): EmotionOutput {
    const state = this._inferState(features);
    const confidence = this._confidence(features, state);
    return {
      available: true,
      state,
      confidence,
      blinkRate: features.blinkRate,
      au4BrowFurrow: features.au4BrowFurrow,
      au12LipCorner: features.au12LipCorner,
      gazeDeviation: features.gazeDeviation,
    };
  }

  private _inferState(f: FaceFeatures): MentalState {
    const highBrow = f.au4BrowFurrow > this.baselines.restingAU4 + 0.25;
    const lowBlink = f.blinkRate < this.baselines.restingBlinkRate * 0.7;
    const smile = f.au12LipCorner > this.baselines.restingAU12 + 0.2;
    const fixedGaze = f.gazeDeviation < 0.2;
    const fastBlink = f.blinkRate > this.baselines.restingBlinkRate * 1.5;

    if (highBrow && lowBlink && !smile) return "stressed";
    if (fixedGaze && lowBlink && !highBrow) return "focused";
    if (smile && fastBlink) return "excited";
    if (!highBrow && f.eyeAspectRatio < 0.2) return "relaxed";
    return "neutral";
  }

  private _confidence(f: FaceFeatures, state: MentalState): number {
    // Confidence is proportional to how far features are from ambiguous boundaries
    const signals: number[] = [
      Math.abs(f.au4BrowFurrow - 0.5),
      Math.abs(f.au12LipCorner - 0.5),
      Math.min(f.blinkRate / 30, 1),
    ];
    return 0.4 + signals.reduce((a, b) => a + b, 0) / signals.length * 0.6;
  }
}
