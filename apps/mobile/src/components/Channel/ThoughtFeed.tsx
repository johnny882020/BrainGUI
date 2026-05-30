import React from "react";
import { FlatList, View, Text, StyleSheet } from "react-native";
import type { ThoughtPacket, MentalState, MotorIntent } from "@brainlink/types";
import { useChannelStore } from "../../stores/channelStore";

const STATE_EMOJI: Record<MentalState, string> = {
  focused: "🎯", relaxed: "😌", excited: "⚡", stressed: "😰", neutral: "😐",
};
const INTENT_SYMBOL: Record<MotorIntent, string> = {
  confirm: "✓", reject: "✗", left: "←", right: "→", idle: "",
};

function PacketRow({ packet, peerName }: { packet: ThoughtPacket; peerName: string }) {
  const time = new Date(packet.timestamp).toLocaleTimeString();
  return (
    <View style={styles.row}>
      <Text style={styles.emoji}>{STATE_EMOJI[packet.state]}</Text>
      <View style={styles.body}>
        <Text style={styles.name}>{peerName}</Text>
        <Text style={styles.content}>
          {packet.state}
          {packet.intent !== "idle" ? `  ${INTENT_SYMBOL[packet.intent]}` : ""}
        </Text>
      </View>
      <Text style={styles.time}>{time}</Text>
    </View>
  );
}

export function ThoughtFeed() {
  const { received, peers } = useChannelStore();

  return (
    <FlatList
      data={[...received].reverse()}
      keyExtractor={(p) => p.id}
      renderItem={({ item }) => (
        <PacketRow
          packet={item}
          peerName={peers[item.senderId]?.username ?? "peer"}
        />
      )}
      ListEmptyComponent={<Text style={styles.empty}>No thoughts received yet</Text>}
      contentContainerStyle={{ padding: 12 }}
    />
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", paddingVertical: 10, borderBottomWidth: StyleSheet.hairlineWidth, borderColor: "#E5E7EB" },
  emoji: { fontSize: 28, marginRight: 12 },
  body: { flex: 1 },
  name: { fontSize: 12, color: "#6B7280", fontWeight: "600" },
  content: { fontSize: 16, color: "#111827", marginTop: 2 },
  time: { fontSize: 11, color: "#9CA3AF" },
  empty: { textAlign: "center", color: "#6B7280", marginTop: 40 },
});
