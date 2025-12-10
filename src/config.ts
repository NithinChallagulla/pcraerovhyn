// src/config.ts
export const API_BASE = "http://34.93.170.150:4000";          // RTMP backend VM
export const ANALYTICS_BASE = "http://35.244.22.167:8000";    // Analytics VM

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
