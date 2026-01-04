// src/config.ts

export const STREAM_SERVER = "http://35.193.55.170";

// ================= API SERVER =================
export const API_BASE = "http://35.193.55.170:4000";

// ================= ANALYTICS =================
export const ANALYTICS_BASE = "http://34.93.170.150:8001";

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
