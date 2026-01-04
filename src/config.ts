// src/config.ts


// ================= STREAMING SERVER =================
// RTMP + HLS + Replay VM
export const API_BASE = "/api";

// ================= HLS (via Netlify proxy) =================
export const HLS_BASE = "/hls";

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
