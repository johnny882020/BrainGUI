import { useEffect, useRef } from "react";
import { IMUModule } from "../sensors/imu/IMUModule";
import { CognitiveLoadTracker } from "../sensors/touch/CognitiveLoadTracker";
import { AudioModule } from "../sensors/audio/AudioModule";
import { StateFusion } from "../sensors/fusion/StateFusion";
import { useMindStore } from "../stores/mindStore";
import { useIntentStore } from "../stores/intentStore";
import type { AudioOutput, IMUOutput, TouchOutput, EmotionOutput } from "../sensors/types";

const FUSION_INTERVAL_MS = 1000;

/**
 * Starts all available sensor pipelines and drives the state fusion loop.
 * Call once at app startup. Cleans up on unmount.
 */
export function useMindState(): void {
  const update = useMindStore((s) => s.update);
  const pushIntent = useIntentStore((s) => s.push);

  const imuOutput = useRef<IMUOutput | null>(null);
  const audioOutput = useRef<AudioOutput | null>(null);
  const touchOutput = useRef<TouchOutput | null>(null);

  const imuRef = useRef<IMUModule | null>(null);
  const audioRef = useRef<AudioModule | null>(null);
  const touchRef = useRef<CognitiveLoadTracker | null>(null);
  const fusionRef = useRef(new StateFusion());
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    // IMU — no permissions needed
    const imu = new IMUModule((out) => {
      imuOutput.current = out;
      if (out.intent !== "idle") pushIntent(out.intent, out.confidence);
    });
    imuRef.current = imu;
    imu.start();

    // Audio
    const audio = new AudioModule((out) => { audioOutput.current = out; });
    audioRef.current = audio;
    audio.start().catch(() => {
      // Permission denied — audio sensor disabled
    });

    // Cognitive load tracker (exposed to UI via context)
    const touch = new CognitiveLoadTracker((out) => { touchOutput.current = out; });
    touchRef.current = touch;

    // Fusion loop at 1 Hz
    intervalRef.current = setInterval(() => {
      const snapshot = fusionRef.current.fuse(
        null, // Camera output injected separately via CameraModule
        audioOutput.current,
        imuOutput.current,
        touchOutput.current,
      );
      update(snapshot);
    }, FUSION_INTERVAL_MS);

    return () => {
      imu.stop();
      audio.stop();
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);
}
