import { create } from "zustand";
import type { MindSnapshot } from "@brainlink/types";

const HISTORY_LENGTH = 60; // ~1 min at 1Hz

interface MindStore {
  current: MindSnapshot | null;
  history: MindSnapshot[];
  update: (snapshot: MindSnapshot) => void;
  clear: () => void;
}

export const useMindStore = create<MindStore>((set) => ({
  current: null,
  history: [],
  update: (snapshot) =>
    set((s) => ({
      current: snapshot,
      history: [...s.history.slice(-(HISTORY_LENGTH - 1)), snapshot],
    })),
  clear: () => set({ current: null, history: [] }),
}));
