// src/pages/VehicleAnalytics.tsx
import { useEffect, useRef, useState } from "react";
import Hls from "hls.js";
import {
  API_BASE,
  ANALYTICS_BASE,
  type Stream,
  type AnalyticsResponse,
} from "../config";

const REFRESH_MS = 15000;
const MAX_STREAMS = 6;

type AnalyticsMap = Record<string, AnalyticsResponse>;

function useHlsPlayer(hlsUrl: string) {
  const videoRef = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    let hls: Hls | null = null;

    const safePlay = () => {
      try {
        video.muted = true;
        const p = video.play();
        if (p && (p as any).catch) (p as any).catch(() => {});
      } catch {}
    };

    if (Hls.isSupported()) {
      hls = new Hls({
        enableWorker: true,
        lowLatencyMode: true,
        liveSyncDuration: 1,
        liveMaxLatencyDuration: 2,
        backBufferLength: 0,
        maxBufferLength: 5,
      });

      hls.loadSource(hlsUrl);
      hls.attachMedia(video);
      hls.on(Hls.Events.MANIFEST_PARSED, safePlay);
      hls.on(Hls.Events.FRAG_LOADED, safePlay);
    } else if (video.canPlayType("application/vnd.apple.mpegurl")) {
      video.src = hlsUrl;
      video.addEventListener("loadedmetadata", safePlay);
    }

    return () => {
      if (hls) hls.destroy();
      if (video) {
        video.removeAttribute("src");
        // @ts-ignore
        if (video.load) video.load();
      }
    };
  }, [hlsUrl]);

  return videoRef;
}

function VehicleAnalyticsCard({
  stream,
  data,
  loadingAnalytics,
}: {
  stream: Stream;
  data?: AnalyticsResponse;
  loadingAnalytics: boolean;
}) {
  const videoRef = useHlsPlayer(stream.hlsUrl);

  return (
    <div className="stream-card">
      <div className="stream-header">
        <span className="live-pill">LIVE</span>
        <div className="stream-meta">
          <div className="stream-title">{stream.pilotName || "Unknown Pilot"}</div>
          <div className="stream-subtitle">
            {stream.place || "Unknown Location"} — Vehicle Analytics
          </div>
        </div>
      </div>

      {/* Live video */}
      <div className="stream-video-wrapper" style={{ marginTop: "0.6rem" }}>
        <video
          ref={videoRef}
          className="stream-video"
          muted
          playsInline
          controls={false}
        />
      </div>

      {/* Stream key */}
      <div style={{ marginTop: "0.6rem" }}>
        <div className="card-subtitle">Stream Key</div>
        <code className="stream-key-value">{stream.streamKey}</code>
      </div>

      {/* Analytics */}
      {loadingAnalytics && !data && (
        <div className="loading" style={{ marginTop: "0.7rem" }}>
          Running analysis on this stream…
        </div>
      )}

      {data && (
        <div style={{ marginTop: "0.8rem", display: "grid", gap: "0.5rem" }}>
          <div style={{ display: "flex", gap: "1.2rem", flexWrap: "wrap" }}>
            <div>
              <div className="card-subtitle">Unique Vehicles (window)</div>
              <div style={{ fontSize: "1.4rem", fontWeight: 600 }}>
                {data.totalUnique}
              </div>
            </div>
            <div>
              <div className="card-subtitle">Vehicles in Latest Frame</div>
              <div style={{ fontSize: "1.4rem", fontWeight: 600 }}>
                {data.currentFrameCount}
              </div>
            </div>
            <div>
              <div className="card-subtitle">Density</div>
              <div style={{ fontSize: "1.1rem", fontWeight: 600 }}>
                {data.density}
              </div>
            </div>
          </div>

          <div style={{ display: "flex", gap: "1.2rem", flexWrap: "wrap" }}>
            <div>
              <div className="card-subtitle">Analyzed Frames</div>
              <div>{data.analyzedFrames}</div>
            </div>
            <div>
              <div className="card-subtitle">Window</div>
              <div>{data.windowSeconds.toFixed(1)} s</div>
            </div>
            <div>
              <div className="card-subtitle">Model</div>
              <div>{data.model}</div>
            </div>
          </div>

          <div className="hint">
            Updated at {new Date(data.timestamp * 1000).toLocaleTimeString()}
          </div>
        </div>
      )}

      {!data && !loadingAnalytics && (
        <div className="empty-state" style={{ marginTop: "0.7rem" }}>
          Waiting for first analytics run…
        </div>
      )}
    </div>
  );
}

export default function VehicleAnalytics() {
  const [liveStreams, setLiveStreams] = useState<Stream[]>([]);
  const [analytics, setAnalytics] = useState<AnalyticsMap>({});
  const [error, setError] = useState<string | null>(null);
  const [loadingStreams, setLoadingStreams] = useState(false);
  const [loadingAnalytics, setLoadingAnalytics] = useState(false);
  const analyzingRef = useRef(false);

  // fetch LIVE streams
  useEffect(() => {
    let cancelled = false;

    const fetchLive = async () => {
      try {
        setLoadingStreams(true);
        setError(null);
        const res = await fetch(`${API_BASE}/streams?status=LIVE`);
        if (!res.ok) throw new Error("Failed to fetch live streams");
        const json: Stream[] = await res.json();
        if (!cancelled) setLiveStreams(json);
      } catch (err: any) {
        console.error(err);
        if (!cancelled) setError(err.message || "Failed to load live streams");
      } finally {
        if (!cancelled) setLoadingStreams(false);
      }
    };

    fetchLive();
    const id = window.setInterval(fetchLive, REFRESH_MS);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, []);

  // run analytics
  useEffect(() => {
    if (liveStreams.length === 0) return;
    if (analyzingRef.current) return;

    const runAnalytics = async () => {
      analyzingRef.current = true;
      setLoadingAnalytics(true);
      try {
        const subset = liveStreams.slice(0, MAX_STREAMS);
        const results = await Promise.all(
          subset.map(async (stream) => {
            try {
              const url = `${ANALYTICS_BASE}/analytics/vehicles?streamKey=${encodeURIComponent(
                stream.streamKey
              )}`;
              const res = await fetch(url);
              if (!res.ok) {
                const text = await res.text();
                throw new Error(`Analytics error: ${res.status} ${text}`);
              }
              const json: AnalyticsResponse = await res.json();
              return { key: stream.streamKey, data: json };
            } catch (err) {
              console.error("Analytics error for stream", stream.streamKey, err);
              return null;
            }
          })
        );

        setAnalytics((prev) => {
          const next: AnalyticsMap = { ...prev };
          for (const item of results) {
            if (item && item.data) next[item.key] = item.data;
          }
          return next;
        });
      } finally {
        analyzingRef.current = false;
        setLoadingAnalytics(false);
      }
    };

    runAnalytics();
    const id = window.setInterval(runAnalytics, REFRESH_MS);
    return () => window.clearInterval(id);
  }, [liveStreams]);

  return (
    <div className="page">
      <div className="page-header">
        <h2>Vehicle Analytics</h2>
        <p className="card-subtitle">
          Live vehicle counts for each active drone stream — cars, bikes, buses and trucks in
          the frame.
        </p>
      </div>

      <div style={{ marginTop: "1.2rem" }}>
        {loadingStreams && <div className="loading">Refreshing live streams…</div>}
        {!loadingStreams && liveStreams.length === 0 && !error && (
          <div className="empty-state">No live streams at the moment.</div>
        )}
        {error && <div className="error-box">{error}</div>}
      </div>

      {liveStreams.length > 0 && (
        <div className="feeds-grid" style={{ marginTop: "1.2rem" }}>
          {liveStreams.slice(0, MAX_STREAMS).map((stream) => (
            <VehicleAnalyticsCard
              key={stream.streamKey}
              stream={stream}
              data={analytics[stream.streamKey]}
              loadingAnalytics={loadingAnalytics}
            />
          ))}
        </div>
      )}
    </div>
  );
}
