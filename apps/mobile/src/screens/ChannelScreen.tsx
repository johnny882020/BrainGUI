import React, { useState, useCallback } from "react";
import {
  View, Text, TextInput, Pressable, SafeAreaView, StyleSheet, Alert,
} from "react-native";
import { ThoughtFeed } from "../components/Channel/ThoughtFeed";
import { useThoughtChannel } from "../hooks/useThoughtChannel";
import { useChannelStore } from "../stores/channelStore";
import { useMindStore } from "../stores/mindStore";
import { useUserStore } from "../stores/userStore";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { RootStackParamList } from "../navigation/AppNavigator";
import type { ThoughtPacket } from "@brainlink/types";

type Props = NativeStackScreenProps<RootStackParamList, "Channel">;

const API_BASE = process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:8000";

export function ChannelScreen({ navigation }: Props) {
  const [inviteCode, setInviteCode] = useState("");
  const [channelName, setChannelName] = useState("");
  const [creating, setCreating] = useState(false);
  const [joining, setJoining] = useState(false);

  const { channelId, setChannel, leaveChannel } = useChannelStore();
  const current = useMindStore((s) => s.current);
  const { userId, accessToken } = useUserStore();

  const { sendThought } = useThoughtChannel(channelId);

  const broadcast = useCallback(() => {
    if (!current || !userId || !channelId) return;
    const packet: ThoughtPacket = {
      id: `tp_${Date.now()}`,
      senderId: userId,
      channelId,
      timestamp: current.timestamp,
      state: current.state,
      intent: current.intent,
      confidence: current.confidence,
    };
    sendThought(packet);
  }, [current, userId, channelId, sendThought]);

  // Auto-broadcast every 2s when in a channel
  React.useEffect(() => {
    if (!channelId) return;
    const t = setInterval(broadcast, 2000);
    return () => clearInterval(t);
  }, [channelId, broadcast]);

  const createChannel = async () => {
    if (!channelName.trim()) return;
    setCreating(true);
    try {
      const res = await fetch(`${API_BASE}/api/v1/channels`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${accessToken}` },
        body: JSON.stringify({ name: channelName }),
      });
      const data = await res.json();
      setChannel(data.id, data.name);
      Alert.alert("Channel created", `Invite code: ${data.inviteCode}`);
    } catch {
      Alert.alert("Error", "Could not create channel");
    } finally {
      setCreating(false);
    }
  };

  const joinChannel = async () => {
    if (!inviteCode.trim()) return;
    setJoining(true);
    try {
      const res = await fetch(`${API_BASE}/api/v1/channels/join`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${accessToken}` },
        body: JSON.stringify({ invite_code: inviteCode }),
      });
      const data = await res.json();
      setChannel(data.channelId, data.name);
    } catch {
      Alert.alert("Error", "Invalid invite code");
    } finally {
      setJoining(false);
    }
  };

  if (!channelId) {
    return (
      <SafeAreaView style={styles.safe}>
        <Text style={styles.heading}>Thought Channel</Text>

        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Create a new channel</Text>
          <TextInput
            style={styles.input}
            placeholder="Channel name"
            value={channelName}
            onChangeText={setChannelName}
            autoCapitalize="none"
          />
          <Pressable style={styles.btn} onPress={createChannel} disabled={creating}>
            <Text style={styles.btnText}>{creating ? "Creating..." : "Create"}</Text>
          </Pressable>
        </View>

        <View style={styles.divider} />

        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Join with invite code</Text>
          <TextInput
            style={styles.input}
            placeholder="8-letter code"
            value={inviteCode}
            onChangeText={(v) => setInviteCode(v.toUpperCase())}
            autoCapitalize="characters"
            maxLength={8}
          />
          <Pressable style={styles.btn} onPress={joinChannel} disabled={joining}>
            <Text style={styles.btnText}>{joining ? "Joining..." : "Join"}</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <Text style={styles.heading}>#{channelId.slice(-6)}</Text>
        <Pressable onPress={leaveChannel}>
          <Text style={styles.leave}>Leave</Text>
        </Pressable>
      </View>
      <ThoughtFeed />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#F9FAFB" },
  header: { flexDirection: "row", justifyContent: "space-between", padding: 16 },
  heading: { fontSize: 20, fontWeight: "700", padding: 16 },
  section: { padding: 16 },
  sectionLabel: { fontSize: 14, color: "#6B7280", marginBottom: 8, fontWeight: "600" },
  input: { borderWidth: 1, borderColor: "#D1D5DB", borderRadius: 8, padding: 12, fontSize: 16, backgroundColor: "#FFF", marginBottom: 8 },
  btn: { backgroundColor: "#3B82F6", borderRadius: 8, padding: 14, alignItems: "center" },
  btnText: { color: "#FFF", fontWeight: "700", fontSize: 15 },
  divider: { height: 1, backgroundColor: "#E5E7EB", marginVertical: 8 },
  leave: { color: "#EF4444", fontWeight: "600", fontSize: 14, padding: 16 },
});
