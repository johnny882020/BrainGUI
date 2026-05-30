import { StateFusion } from "../sensors/fusion/StateFusion";
import type { AudioOutput, EmotionOutput, IMUOutput, TouchOutput } from "../sensors/types";

const makeAudio = (arousal: number, valence: number): AudioOutput => ({
  available: true, confidence: 0.7, arousal, valence, breathingRate: 15,
});
const makeIMU = (intent: IMUOutput["intent"]): IMUOutput => ({
  available: true, confidence: 0.8, intent, jerkMagnitude: intent === "idle" ? 0 : 2.5,
});
const makeTouch = (load: number): TouchOutput => ({
  available: true, confidence: 0.6, cognitiveLoad: load,
});
const makeCamera = (state: EmotionOutput["state"]): EmotionOutput => ({
  available: true, confidence: 0.8, state, blinkRate: 15, au4BrowFurrow: 0.1, au12LipCorner: 0.3, gazeDeviation: 0.2,
});

describe("StateFusion", () => {
  it("returns neutral when no sensors available", () => {
    const f = new StateFusion();
    const out = f.fuse(null, null, null, null);
    expect(out.state).toBe("neutral");
    expect(out.activeSensors).toHaveLength(0);
  });

  it("reports active sensors correctly", () => {
    const f = new StateFusion();
    const out = f.fuse(null, makeAudio(0.3, 0.8), makeIMU("idle"), null);
    expect(out.activeSensors).toContain("audio");
    expect(out.activeSensors).toContain("imu");
    expect(out.activeSensors).not.toContain("camera");
  });

  it("high arousal + low valence → stressed", () => {
    const f = new StateFusion();
    const out = f.fuse(makeCamera("stressed"), makeAudio(0.8, 0.2), makeIMU("idle"), makeTouch(0.8));
    expect(out.state).toBe("stressed");
  });

  it("low arousal + high valence → relaxed", () => {
    const f = new StateFusion();
    const out = f.fuse(makeCamera("relaxed"), makeAudio(0.2, 0.9), makeIMU("idle"), makeTouch(0.1));
    expect(out.state).toBe("relaxed");
  });

  it("imu intent passes through", () => {
    const f = new StateFusion();
    const out = f.fuse(null, makeAudio(0.5, 0.5), makeIMU("confirm"), null);
    expect(out.intent).toBe("confirm");
  });

  it("confidence is between 0 and 1", () => {
    const f = new StateFusion();
    const out = f.fuse(makeCamera("focused"), makeAudio(0.5, 0.6), makeIMU("idle"), makeTouch(0.4));
    expect(out.confidence).toBeGreaterThanOrEqual(0);
    expect(out.confidence).toBeLessThanOrEqual(1);
  });

  it("renormalises when a sensor is missing", () => {
    const f = new StateFusion();
    // Camera has weight 0.4 — removing it should still produce valid output
    const withCamera = f.fuse(makeCamera("excited"), makeAudio(0.8, 0.8), makeIMU("idle"), null);
    const withoutCamera = f.fuse(null, makeAudio(0.8, 0.8), makeIMU("idle"), null);
    expect(withoutCamera.confidence).toBeGreaterThan(0);
    expect(["focused", "relaxed", "excited", "stressed", "neutral"]).toContain(withoutCamera.state);
  });

  it("timestamp is ISO-8601", () => {
    const f = new StateFusion();
    const out = f.fuse(null, null, null, null);
    expect(() => new Date(out.timestamp)).not.toThrow();
    expect(new Date(out.timestamp).toISOString()).toBe(out.timestamp);
  });
});
