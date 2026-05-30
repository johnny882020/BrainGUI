import { useEffect, useRef, useCallback } from "react";
import type { ThoughtPacket, WsIncoming, WsOutgoing, ChannelMember } from "@brainlink/types";
import { useUserStore } from "../stores/userStore";
import { useChannelStore } from "../stores/channelStore";
import { encryptForPeer, decryptFromPeer, getOrCreateKeyPair } from "../crypto/E2EEncryption";

const RECONNECT_DELAYS = [2000, 4000, 8000, 16000, 60000];
const WS_BASE = process.env.EXPO_PUBLIC_WS_URL ?? "ws://localhost:8000";

export function useThoughtChannel(channelId: string | null): {
  sendThought: (packet: ThoughtPacket) => void;
} {
  const { accessToken, userId } = useUserStore();
  const { peers, addPeer, removePeer, addReceived, addSent } = useChannelStore();
  const wsRef = useRef<WebSocket | null>(null);
  const retryRef = useRef(0);
  const privKeyRef = useRef<string | null>(null);

  // Load private key once
  useEffect(() => {
    getOrCreateKeyPair().then((kp) => { privKeyRef.current = kp.privateKey; });
  }, []);

  const connect = useCallback(() => {
    if (!channelId || !accessToken) return;
    const ws = new WebSocket(`${WS_BASE}/api/v1/channels/${channelId}/ws?token=${accessToken}`);
    wsRef.current = ws;

    ws.onopen = () => { retryRef.current = 0; };

    ws.onmessage = (event) => {
      const msg = JSON.parse(event.data) as WsIncoming;
      if (msg.type === "peer_joined") {
        addPeer({ userId: msg.userId, username: msg.username, publicKey: msg.publicKey, joinedAt: new Date().toISOString() });
      } else if (msg.type === "peer_left") {
        removePeer(msg.userId);
      } else if (msg.type === "thought") {
        // Decrypt and add to received
        const senderPub = peers[msg.packet.senderId]?.publicKey;
        if (!senderPub || !privKeyRef.current) return;
        const decrypted = decryptFromPeer(
          (msg as any).encryptedPayload,
          (msg as any).nonce,
          senderPub,
          privKeyRef.current,
        );
        if (decrypted) addReceived(decrypted as ThoughtPacket);
      }
    };

    ws.onclose = () => {
      const delay = RECONNECT_DELAYS[Math.min(retryRef.current, RECONNECT_DELAYS.length - 1)] ?? 60000;
      retryRef.current++;
      setTimeout(connect, delay);
    };

    ws.onerror = () => ws.close();
  }, [channelId, accessToken]);

  useEffect(() => {
    connect();
    return () => {
      wsRef.current?.close();
    };
  }, [connect]);

  const sendThought = useCallback(
    (packet: ThoughtPacket) => {
      if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN || !privKeyRef.current) return;

      // Encrypt individually for each peer in the channel
      const peerList = Object.values(peers);
      for (const peer of peerList) {
        if (peer.userId === userId) continue;
        const { encryptedPayload, nonce } = encryptForPeer(packet, peer.publicKey, privKeyRef.current);
        const msg: WsOutgoing = {
          type: "thought",
          encryptedPayload,
          nonce,
          recipientId: peer.userId,
        };
        wsRef.current.send(JSON.stringify(msg));
      }
      addSent(packet);
    },
    [peers, userId]
  );

  return { sendThought };
}
