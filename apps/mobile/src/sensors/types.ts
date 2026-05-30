import type { MentalState, MotorIntent } from "@brainlink/types";

export interface SensorOutput {
  available: boolean;
  confidence: number; // 0–1
}

export interface EmotionOutput extends SensorOutput {
  state: MentalState;
  blinkRate: number; // blinks/min
  au4BrowFurrow: number; // 0–1
  au12LipCorner: number; // 0–1
  gazeDeviation: number; // 0–1 (0 = on-screen centre)
}

export interface AudioOutput extends SensorOutput {
  arousal: number; // 0–1
  valence: number; // 0–1
  breathingRate: number; // breaths/min
}

export interface IMUOutput extends SensorOutput {
  intent: MotorIntent;
  jerkMagnitude: number;
}

export interface TouchOutput extends SensorOutput {
  cognitiveLoad: number; // 0–1
}
