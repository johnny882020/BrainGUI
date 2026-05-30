import { create } from "zustand";
import * as SecureStore from "expo-secure-store";

interface CalibrationStatus {
  gesture: "none" | "done";
  emotion: "none" | "done";
}

interface UserStore {
  userId: string | null;
  username: string | null;
  accessToken: string | null;
  refreshToken: string | null;
  publicKey: string | null;
  calibration: CalibrationStatus;
  setAuth: (userId: string, username: string, accessToken: string, refreshToken: string) => void;
  setPublicKey: (key: string) => void;
  setCalibrationDone: (layer: keyof CalibrationStatus) => void;
  clearAuth: () => void;
  loadFromStorage: () => Promise<void>;
}

const STORAGE_KEYS = {
  accessToken: "brainlink_access_token",
  refreshToken: "brainlink_refresh_token",
  userId: "brainlink_user_id",
  username: "brainlink_username",
};

export const useUserStore = create<UserStore>((set, get) => ({
  userId: null,
  username: null,
  accessToken: null,
  refreshToken: null,
  publicKey: null,
  calibration: { gesture: "none", emotion: "none" },

  setAuth: (userId, username, accessToken, refreshToken) => {
    set({ userId, username, accessToken, refreshToken });
    // Persist tokens in OS Keychain/Keystore
    SecureStore.setItemAsync(STORAGE_KEYS.accessToken, accessToken, {
      keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
    });
    SecureStore.setItemAsync(STORAGE_KEYS.refreshToken, refreshToken, {
      keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
    });
    SecureStore.setItemAsync(STORAGE_KEYS.userId, userId);
    SecureStore.setItemAsync(STORAGE_KEYS.username, username);
  },

  setPublicKey: (key) => set({ publicKey: key }),
  setCalibrationDone: (layer) =>
    set((s) => ({ calibration: { ...s.calibration, [layer]: "done" } })),

  clearAuth: () => {
    set({ userId: null, username: null, accessToken: null, refreshToken: null });
    Object.values(STORAGE_KEYS).forEach((k) => SecureStore.deleteItemAsync(k));
  },

  loadFromStorage: async () => {
    const [accessToken, refreshToken, userId, username] = await Promise.all([
      SecureStore.getItemAsync(STORAGE_KEYS.accessToken),
      SecureStore.getItemAsync(STORAGE_KEYS.refreshToken),
      SecureStore.getItemAsync(STORAGE_KEYS.userId),
      SecureStore.getItemAsync(STORAGE_KEYS.username),
    ]);
    if (accessToken && refreshToken && userId && username) {
      set({ accessToken, refreshToken, userId, username });
    }
  },
}));
