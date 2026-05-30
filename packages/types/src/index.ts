// ─── Mental State ────────────────────────────────────────────────────────────

export type MentalState =
  | "focused"
  | "relaxed"
  | "excited"
  | "stressed"
  | "neutral";

export type MotorIntent = "confirm" | "reject" | "left" | "right" | "idle";

export type SensorName = "camera" | "audio" | "imu" | "touch";

export interface BandPowers {
  delta: number;
  theta: number;
  alpha: number;
  beta: number;
  gamma: number;
}

/** Unified output from the on-device state fusion engine. */
export interface MindSnapshot {
  state: MentalState;
  intent: MotorIntent;
  /** 0–1 arousal (calm → activated) */
  arousal: number;
  /** 0–1 valence (negative → positive) */
  valence: number;
  /** 0–1 overall fusion confidence */
  confidence: number;
  activeSensors: SensorName[];
  timestamp: string; // ISO-8601
}

// ─── Thought Communication ───────────────────────────────────────────────────

/**
 * Encrypted packet transmitted to peers.
 * Never contains raw sensor values, arousal/valence floats, or biometrics.
 */
export interface ThoughtPacket {
  id: string;
  senderId: string;
  channelId: string;
  timestamp: string;
  state: MentalState;
  intent: MotorIntent;
  /** 0–1 — lets receiver gauge signal reliability */
  confidence: number;
}

// ─── Calibration ─────────────────────────────────────────────────────────────

export interface GestureThresholds {
  confirmPeakZ: number; // z-axis acceleration threshold for nod
  rejectOscAmp: number; // x-axis oscillation amplitude for shake
  tiltAngleDeg: number; // sustained roll angle for left/right tilt
}

export interface EmotionBaselines {
  restingBlinkRate: number; // blinks per minute at rest
  restingAU4: number; // brow furrow baseline
  restingAU12: number; // lip corner baseline
}

export interface CalibrationProfile {
  userId: string;
  gestureThresholds: GestureThresholds;
  emotionBaselines: EmotionBaselines;
  audioArousalMean: number;
  audioArousalStd: number;
  touchLoadBaseline: number;
  createdAt: string;
  version: number;
}

// ─── Auth / API ───────────────────────────────────────────────────────────────

export interface RegisterRequest {
  username: string;
  email: string;
  password: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface AuthResponse {
  userId: string;
  accessToken: string;
  refreshToken: string;
}

export interface RefreshRequest {
  refreshToken: string;
}

export interface RefreshResponse {
  accessToken: string;
}

// ─── Channels ────────────────────────────────────────────────────────────────

export interface Channel {
  id: string;
  name: string;
  inviteCode: string;
  memberCount: number;
  createdAt: string;
}

export interface ChannelMember {
  userId: string;
  username: string;
  publicKey: string; // X25519 base64 public key
  joinedAt: string;
}

export interface CreateChannelRequest {
  name: string;
}

export interface JoinChannelRequest {
  inviteCode: string;
}

// ─── WebSocket messages ───────────────────────────────────────────────────────

export type WsIncoming =
  | { type: "thought"; packet: ThoughtPacket }
  | { type: "peer_joined"; userId: string; username: string; publicKey: string }
  | { type: "peer_left"; userId: string }
  | { type: "error"; message: string };

export type WsOutgoing =
  | { type: "thought"; encryptedPayload: string; nonce: string; recipientId: string }
  | { type: "ping" };
