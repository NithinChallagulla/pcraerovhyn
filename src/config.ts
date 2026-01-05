// src/config.ts

// ================= STREAMING (via Netlify proxy) =================
export const STREAM_SERVER = ""; 
// ⬆️ NOT used directly in browser anymore

// ================= API SERVER (Netlify redirect) =================
export const API_BASE = "/api";

// ================= ANALYTICS =================
export const ANALYTICS_BASE = "/analytics-api";

// ================= TYPES =================
export type StreamStatus = "PENDING" | "LIVE" | "ENDED";

export interface Stream {
  id: string;
  pilotName: string;
  place: string;
  streamKey: string;
  rtmpUrl: string;
  hlsUrl: string;
  status: StreamStatus;
  createdAt?: number;
  startedAt?: number | null;
  endedAt?: number | null;
}

export interface AnalyticsResponse {
  streamKey: string;
  windowSeconds: number;
  totalUnique: number;
  currentFrameCount: number;
  density: string;
  model: string;
  analyzedFrames: number;
  timestamp: number;
}
