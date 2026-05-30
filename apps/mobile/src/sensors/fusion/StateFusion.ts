import type { MentalState, MindSnapshot, MotorIntent, SensorName } from "@brainlink/types";
import type { AudioOutput, EmotionOutput, IMUOutput, TouchOutput } from "../types";

export interface FusionWeights {
  camera: number;
  audio: number;
  imu: number;
  touch: number;
}

const DEFAULT_WEIGHTS: FusionWeights = {
  camera: 0.4,
  audio: 0.3,
  imu: 0.2,
  touch: 0.1,
};

// Map from audio arousal/valence to mental state using Russell circumplex quadrants
function audioToState(audio: AudioOutput): { state: MentalState; confidence: number } {
  const { arousal, valence } = audio;
  if (arousal > 0.6 && valence > 0.5) return { state: "excited", confidence: 0.65 };
  if (arousal > 0.6 && valence <= 0.5) return { state: "stressed", confidence: 0.65 };
  if (arousal <= 0.4 && valence > 0.5) return { state: "relaxed", confidence: 0.65 };
  if (arousal <= 0.4 && valence <= 0.5) return { state: "neutral", confidence: 0.5 };
  return { state: "neutral", confidence: 0.4 };
}

// Map cognitive load to a state modifier (high load biases toward stressed/focused)
function touchToState(touch: TouchOutput): { state: MentalState; confidence: number } {
  if (touch.cognitiveLoad > 0.7) return { state: "stressed", confidence: 0.5 };
  if (touch.cognitiveLoad > 0.4) return { state: "focused", confidence: 0.45 };
  return { state: "relaxed", confidence: 0.4 };
}

const STATE_ORDER: MentalState[] = ["focused", "relaxed", "excited", "stressed", "neutral"];

export class StateFusion {
  private weights: FusionWeights = { ...DEFAULT_WEIGHTS };

  setWeights(w: Partial<FusionWeights>): void {
    this.weights = { ...this.weights, ...w };
  }

  fuse(
    camera: EmotionOutput | null,
    audio: AudioOutput | null,
    imu: IMUOutput | null,
    touch: TouchOutput | null
  ): MindSnapshot {
    const activeSensors: SensorName[] = [];
    const statePosterior: Record<MentalState, number> = {
      focused: 0, relaxed: 0, excited: 0, stressed: 0, neutral: 0,
    };

    let totalWeight = 0;

    // Gather available sensor contributions
    const contributions: Array<{ state: MentalState; confidence: number; weight: number }> = [];

    if (camera?.available) {
      activeSensors.push("camera");
      contributions.push({ state: camera.state, confidence: camera.confidence, weight: this.weights.camera });
    }
    if (audio?.available) {
      activeSensors.push("audio");
      const { state, confidence } = audioToState(audio);
      contributions.push({ state, confidence, weight: this.weights.audio });
    }
    if (imu?.available) {
      activeSensors.push("imu");
      // IMU contributes primarily to intent, not state — minor state signal via arousal proxy
      if (imu.jerkMagnitude > 1.5) {
        contributions.push({ state: "excited", confidence: 0.3, weight: this.weights.imu * 0.3 });
      }
    }
    if (touch?.available) {
      activeSensors.push("touch");
      const { state, confidence } = touchToState(touch);
      contributions.push({ state, confidence, weight: this.weights.touch });
    }

    // Bayesian posterior: accumulate weighted confidence per state
    for (const { state, confidence, weight } of contributions) {
      statePosterior[state] += confidence * weight;
      totalWeight += weight;
    }

    // Normalize
    if (totalWeight > 0) {
      for (const key of STATE_ORDER) {
        statePosterior[key] /= totalWeight;
      }
    } else {
      statePosterior["neutral"] = 1;
    }

    // Pick maximum-posterior state
    const state = STATE_ORDER.reduce((best, s) =>
      statePosterior[s]! > statePosterior[best]! ? s : best
    );
    const confidence = statePosterior[state] ?? 0;

    // Intent comes solely from IMU
    const intent: MotorIntent = imu?.available ? imu.intent : "idle";

    // Arousal/valence from audio (primary) or defaults
    const arousal = audio?.available ? audio.arousal : 0.5;
    const valence = audio?.available ? audio.valence : 0.5;

    return {
      state,
      intent,
      arousal,
      valence,
      confidence,
      activeSensors,
      timestamp: new Date().toISOString(),
    };
  }
}
