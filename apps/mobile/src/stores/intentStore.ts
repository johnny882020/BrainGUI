import { create } from "zustand";
import type { MotorIntent } from "@brainlink/types";

const MAX_QUEUE = 10;

interface IntentEvent {
  id: string;
  intent: MotorIntent;
  confidence: number;
  timestamp: string;
}

interface IntentStore {
  queue: IntentEvent[];
  last: IntentEvent | null;
  push: (intent: MotorIntent, confidence: number) => void;
  consume: (id: string) => void;
  clear: () => void;
}

let seq = 0;

export const useIntentStore = create<IntentStore>((set) => ({
  queue: [],
  last: null,
  push: (intent, confidence) => {
    if (intent === "idle") return;
    const event: IntentEvent = {
      id: `int_${++seq}`,
      intent,
      confidence,
      timestamp: new Date().toISOString(),
    };
    set((s) => ({
      last: event,
      queue: [...s.queue.slice(-(MAX_QUEUE - 1)), event],
    }));
  },
  consume: (id) => set((s) => ({ queue: s.queue.filter((e) => e.id !== id) })),
  clear: () => set({ queue: [], last: null }),
}));
