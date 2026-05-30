import { create } from "zustand";
import type { ThoughtPacket, ChannelMember } from "@brainlink/types";

const MAX_PACKETS = 50;

interface ChannelStore {
  channelId: string | null;
  channelName: string | null;
  peers: Record<string, ChannelMember>; // userId → ChannelMember
  received: ThoughtPacket[];
  sent: ThoughtPacket[];
  setChannel: (id: string, name: string) => void;
  leaveChannel: () => void;
  addPeer: (member: ChannelMember) => void;
  removePeer: (userId: string) => void;
  addReceived: (packet: ThoughtPacket) => void;
  addSent: (packet: ThoughtPacket) => void;
}

export const useChannelStore = create<ChannelStore>((set) => ({
  channelId: null,
  channelName: null,
  peers: {},
  received: [],
  sent: [],
  setChannel: (id, name) => set({ channelId: id, channelName: name }),
  leaveChannel: () => set({ channelId: null, channelName: null, peers: {}, received: [], sent: [] }),
  addPeer: (member) =>
    set((s) => ({ peers: { ...s.peers, [member.userId]: member } })),
  removePeer: (userId) =>
    set((s) => {
      const { [userId]: _, ...rest } = s.peers;
      return { peers: rest };
    }),
  addReceived: (packet) =>
    set((s) => ({ received: [...s.received.slice(-(MAX_PACKETS - 1)), packet] })),
  addSent: (packet) =>
    set((s) => ({ sent: [...s.sent.slice(-(MAX_PACKETS - 1)), packet] })),
}));
