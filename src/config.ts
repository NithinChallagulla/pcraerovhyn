// src/config.ts

// Detect if we're on Netlify (build / production) or local dev
// src/config.ts

const isProd = import.meta.env.PROD;

// RTMP / Streams backend (ingest VM)
export const API_BASE = isProd
  ? "/api"
  : "http://35.244.22.167:4000";

// Analytics backend
// Analytics backend
/*export const ANALYTICS_BASE = isProd
  ? "/analytics-api/analytics"
  : "http://34.93.170.150:8000/analytics";
*/
export const ANALYTICS_BASE = "http://34.93.170.150:8001";





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
