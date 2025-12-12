// src/config.ts

// Detect if we're on Netlify (build / production) or local dev
const isProd = import.meta.env.PROD;

// Backend for RTMP / streams
export const API_BASE = isProd
  ? "/api"                            // Netlify → proxy to VM
  : "http://34.93.170.150:4000";      // Local dev → direct VM

// Backend for analytics
export const ANALYTICS_BASE = isProd
  ? "/analytics-api"                  // Netlify → proxy to analytics VM
  : "http://35.244.22.167:8000";      // Local dev → direct VM

export type StreamStatus = "PENDING" | "LIVE" | "ENDED";

export interface Stream {
  id: string;
  pilotName?: string;
  place?: string;
  streamKey: string;
  rtmpUrl?: string;
  hlsUrl?: string;
  status?: StreamStatus;
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
