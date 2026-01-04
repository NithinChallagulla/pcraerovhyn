// src/config.ts

// Detect if we're on Netlify (build / production) or local dev
const isProd = import.meta.env.PROD;

// ===== STREAMING VM (HLS + REPLAY) =====
// Single source of truth (NO duplicates)
export const STREAM_SERVER = "http://35.193.55.170";

// ===== API BACKEND =====
export const API_BASE = isProd
  ? "/api"
  : "http://35.244.22.167:4000";

// ===== ANALYTICS BACKEND =====
export const ANALYTICS_BASE = "http://34.93.170.150:8001";

// ===== TYPES =====
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
