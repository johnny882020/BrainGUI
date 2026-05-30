import React, { useEffect, useState } from "react";
import { View, Text, Animated, StyleSheet } from "react-native";
import type { MotorIntent } from "@brainlink/types";
import { useIntentStore } from "../../stores/intentStore";

const INTENT_LABELS: Record<MotorIntent, string> = {
  confirm: "✓ Confirm",
  reject: "✗ Reject",
  left: "← Left",
  right: "→ Right",
  idle: "",
};

const INTENT_COLORS: Record<MotorIntent, string> = {
  confirm: "#10B981",
  reject: "#EF4444",
  left: "#3B82F6",
  right: "#8B5CF6",
  idle: "transparent",
};

export const IntentIndicator = React.memo(function IntentIndicator() {
  const last = useIntentStore((s) => s.last);
  const opacity = React.useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!last || last.intent === "idle") return;
    opacity.setValue(1);
    Animated.timing(opacity, { toValue: 0, duration: 2000, useNativeDriver: true }).start();
  }, [last?.id]);

  if (!last || last.intent === "idle") return null;

  return (
    <Animated.View style={[styles.pill, { backgroundColor: INTENT_COLORS[last.intent], opacity }]}>
      <Text style={styles.text}>{INTENT_LABELS[last.intent]}</Text>
    </Animated.View>
  );
});

const styles = StyleSheet.create({
  pill: {
    alignSelf: "center",
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 24,
    marginTop: 12,
  },
  text: { color: "#FFF", fontSize: 18, fontWeight: "700" },
});
