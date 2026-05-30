import React from "react";
import { View, Text, StyleSheet } from "react-native";
import type { MentalState } from "@brainlink/types";
import { useMindStore } from "../../stores/mindStore";

const STATE_COLORS: Record<MentalState, string> = {
  focused: "#3B82F6",
  relaxed: "#10B981",
  excited: "#F59E0B",
  stressed: "#EF4444",
  neutral: "#6B7280",
};

const STATE_LABELS: Record<MentalState, string> = {
  focused: "Focused",
  relaxed: "Relaxed",
  excited: "Excited",
  stressed: "Stressed",
  neutral: "Neutral",
};

export const MindStateGauge = React.memo(function MindStateGauge() {
  const current = useMindStore((s) => s.current);

  if (!current) {
    return (
      <View style={styles.container}>
        <Text style={styles.idle}>Initialising sensors...</Text>
      </View>
    );
  }

  const color = STATE_COLORS[current.state];
  const pct = Math.round(current.confidence * 100);

  return (
    <View style={[styles.container, { borderColor: color }]}>
      <View style={[styles.dot, { backgroundColor: color }]} />
      <Text style={[styles.label, { color }]}>{STATE_LABELS[current.state]}</Text>
      <Text style={styles.confidence}>{pct}% confidence</Text>
      <Text style={styles.sensors}>
        Active: {current.activeSensors.join(", ")}
      </Text>
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    borderWidth: 2,
    borderRadius: 16,
    padding: 20,
    marginHorizontal: 16,
  },
  dot: { width: 48, height: 48, borderRadius: 24, marginBottom: 8 },
  label: { fontSize: 24, fontWeight: "700" },
  confidence: { fontSize: 14, color: "#9CA3AF", marginTop: 4 },
  sensors: { fontSize: 12, color: "#6B7280", marginTop: 8 },
  idle: { color: "#6B7280", fontSize: 16 },
});
