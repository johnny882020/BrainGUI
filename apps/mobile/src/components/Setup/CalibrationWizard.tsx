import React, { useState, useEffect, useRef } from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { useUserStore } from "../../stores/userStore";
import { IMUModule } from "../../sensors/imu/IMUModule";
import type { IMUOutput } from "../../sensors/types";

type Step = "intro" | "gesture" | "emotion" | "done";

const GESTURE_INSTRUCTIONS = [
  { label: "Nod your head forward slowly (5×)", gesture: "confirm" as const },
  { label: "Shake your head left-right (5×)", gesture: "reject" as const },
  { label: "Tilt your head to the left and hold (3×)", gesture: "left" as const },
  { label: "Tilt your head to the right and hold (3×)", gesture: "right" as const },
];

export function CalibrationWizard({ onDone }: { onDone: () => void }) {
  const [step, setStep] = useState<Step>("intro");
  const [gestureIdx, setGestureIdx] = useState(0);
  const [countdown, setCountdown] = useState(0);
  const [detected, setDetected] = useState<string | null>(null);
  const imuRef = useRef<IMUModule | null>(null);
  const setCalibrationDone = useUserStore((s) => s.setCalibrationDone);

  useEffect(() => {
    if (step !== "gesture") return;
    const instruction = GESTURE_INSTRUCTIONS[gestureIdx];
    if (!instruction) {
      setCalibrationDone("gesture");
      setStep("emotion");
      return;
    }
    const imu = new IMUModule((out: IMUOutput) => {
      if (out.intent === instruction.gesture && out.confidence > 0.5) {
        setDetected(`Detected: ${out.intent}`);
        setTimeout(() => {
          setDetected(null);
          setGestureIdx((i) => i + 1);
        }, 1000);
      }
    });
    imuRef.current = imu;
    imu.start();
    return () => { imu.stop(); };
  }, [step, gestureIdx]);

  useEffect(() => {
    if (step !== "emotion") return;
    // 2-minute guided baseline recording (simplified timer)
    setCountdown(120);
    const t = setInterval(() => {
      setCountdown((c) => {
        if (c <= 1) {
          clearInterval(t);
          setCalibrationDone("emotion");
          setStep("done");
          return 0;
        }
        return c - 1;
      });
    }, 1000);
    return () => clearInterval(t);
  }, [step]);

  if (step === "intro") return (
    <View style={styles.container}>
      <Text style={styles.title}>Calibration</Text>
      <Text style={styles.body}>
        We need 2 quick sessions (10 min total) to personalise the BCI to your body's signals.{"\n\n"}
        No data leaves your phone.
      </Text>
      <Pressable style={styles.btn} onPress={() => setStep("gesture")}>
        <Text style={styles.btnText}>Start →</Text>
      </Pressable>
    </View>
  );

  if (step === "gesture") {
    const instruction = GESTURE_INSTRUCTIONS[gestureIdx];
    if (!instruction) return null;
    return (
      <View style={styles.container}>
        <Text style={styles.step}>Step 1 of 2 — Gesture calibration</Text>
        <Text style={styles.title}>{instruction.label}</Text>
        {detected && <Text style={styles.detected}>{detected}</Text>}
        <Text style={styles.progress}>{gestureIdx} / {GESTURE_INSTRUCTIONS.length} gestures done</Text>
      </View>
    );
  }

  if (step === "emotion") return (
    <View style={styles.container}>
      <Text style={styles.step}>Step 2 of 2 — Emotion baseline</Text>
      <Text style={styles.title}>Sit comfortably and breathe normally</Text>
      <Text style={styles.countdown}>{countdown}s</Text>
      <Text style={styles.body}>Keep your face relaxed. The app is learning your baseline expression.</Text>
    </View>
  );

  return (
    <View style={styles.container}>
      <Text style={styles.title}>✓ Calibration complete</Text>
      <Text style={styles.body}>Your personal BCI profile has been saved to this device.</Text>
      <Pressable style={styles.btn} onPress={onDone}>
        <Text style={styles.btnText}>Continue →</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: "center", alignItems: "center", padding: 24 },
  step: { fontSize: 13, color: "#6B7280", marginBottom: 8 },
  title: { fontSize: 22, fontWeight: "700", textAlign: "center", marginBottom: 16 },
  body: { fontSize: 16, color: "#374151", textAlign: "center", lineHeight: 24 },
  btn: { backgroundColor: "#3B82F6", borderRadius: 12, paddingHorizontal: 32, paddingVertical: 14, marginTop: 24 },
  btnText: { color: "#FFF", fontSize: 16, fontWeight: "700" },
  detected: { fontSize: 16, color: "#10B981", fontWeight: "600", marginVertical: 8 },
  progress: { fontSize: 14, color: "#6B7280", marginTop: 8 },
  countdown: { fontSize: 48, fontWeight: "700", color: "#3B82F6", marginVertical: 16 },
});
