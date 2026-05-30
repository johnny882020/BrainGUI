import React, { useEffect } from "react";
import { View, Text, SafeAreaView, Pressable, StyleSheet } from "react-native";
import { useMindState } from "../hooks/useMindState";
import { MindStateGauge } from "../components/Dashboard/MindStateGauge";
import { IntentIndicator } from "../components/Dashboard/IntentIndicator";
import { useMindStore } from "../stores/mindStore";
import { useChannelStore } from "../stores/channelStore";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { RootStackParamList } from "../navigation/AppNavigator";

type Props = NativeStackScreenProps<RootStackParamList, "Dashboard">;

export function DashboardScreen({ navigation }: Props) {
  useMindState(); // start all sensor pipelines

  const channelId = useChannelStore((s) => s.channelId);
  const channelName = useChannelStore((s) => s.channelName);

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <Text style={styles.heading}>BrainLink</Text>
        {channelId && (
          <Pressable onPress={() => navigation.navigate("Channel")}>
            <Text style={styles.channelBadge}>#{channelName ?? "channel"}</Text>
          </Pressable>
        )}
      </View>

      <MindStateGauge />
      <IntentIndicator />

      <View style={styles.actions}>
        {!channelId ? (
          <Pressable style={styles.btn} onPress={() => navigation.navigate("Channel")}>
            <Text style={styles.btnText}>Connect to channel</Text>
          </Pressable>
        ) : (
          <Pressable style={[styles.btn, styles.btnSecondary]} onPress={() => navigation.navigate("Channel")}>
            <Text style={styles.btnText}>Open channel →</Text>
          </Pressable>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#F9FAFB" },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", padding: 16 },
  heading: { fontSize: 20, fontWeight: "700" },
  channelBadge: { fontSize: 14, color: "#3B82F6", fontWeight: "600" },
  actions: { marginTop: 40, paddingHorizontal: 16 },
  btn: { backgroundColor: "#3B82F6", borderRadius: 12, padding: 16, alignItems: "center" },
  btnSecondary: { backgroundColor: "#6B7280" },
  btnText: { color: "#FFF", fontSize: 16, fontWeight: "600" },
});
