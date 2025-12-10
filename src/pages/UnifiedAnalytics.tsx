// src/pages/UnifiedAnalytics.tsx
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

type CombinedAnalytics = {
  people?: AnalyticsResponse;
  vehicles?: AnalyticsResponse;
};

type AnalyticsMap = Record<string, CombinedAnalytics>;

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
      } catch {
        // ignore
      }
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

function UnifiedAnalyticsCard({
  stream,
  data,
  loadingAnalytics,
}: {
  stream: Stream;
  data?: CombinedAnalytics;
  loadingAnalytics: boolean;
}) {
  const videoRef = useHlsPlayer(stream.hlsUrl);

  const people = data?.people;
  const vehicles = data?.vehicles;

  return (
    <div className="stream-card">
      <div className="stream-header">
        <span className="live-pill">LIVE</span>
        <div className="stream-meta">
          <div className="stream-title">{stream.pilotName || "Unknown Pilot"}</div>
          <div className="stream-subtitle">
            {stream.place || "Unknown Location"} — People & Vehicle Analytics
          </div>
        </div>
      </div>

      {/* Video */}
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
        <div style={{ marginTop: "0.8rem", display: "grid", gap: "0.75rem" }}>
          {/* People vs Vehicles side by side */}
          <div
            style={{
              display: "flex",
              gap: "1.4rem",
              flexWrap: "wrap",
            }}
          >
            {/* People block */}
            <div style={{ minWidth: "180px" }}>
              <div className="card-subtitle" style={{ fontWeight: 600 }}>
                People
              </div>
              {people ? (
                <>
                  <div style={{ display: "flex", gap: "1.2rem", marginTop: "0.3rem" }}>
                    <div>
                      <div className="card-subtitle">Unique IDs (window)</div>
                      <div style={{ fontSize: "1.3rem", fontWeight: 600 }}>
                        {people.totalUnique}
                      </div>
                    </div>
                    <div>
                      <div className="card-subtitle">In Latest Frame</div>
                      <div style={{ fontSize: "1.3rem", fontWeight: 600 }}>
                        {people.currentFrameCount}
                      </div>
                    </div>
                  </div>
                  <div style={{ marginTop: "0.4rem" }}>
                    <div className="card-subtitle">Density</div>
                    <div style={{ fontSize: "1rem", fontWeight: 600 }}>
                      {people.density}
                    </div>
                  </div>
                  <div
                    style={{
                      marginTop: "0.4rem",
                      display: "flex",
                      gap: "1.2rem",
                      fontSize: "0.85rem",
                    }}
                  >
                    <div>
                      <div className="card-subtitle">Analyzed Frames</div>
                      <div>{people.analyzedFrames}</div>
                    </div>
                    <div>
                      <div className="card-subtitle">Window</div>
                      <div>{people.windowSeconds.toFixed(1)} s</div>
                    </div>
                    <div>
                      <div className="card-subtitle">Model</div>
                      <div>{people.model}</div>
                    </div>
                  </div>
                </>
              ) : (
                <div className="empty-state" style={{ marginTop: "0.4rem" }}>
                  No people analytics yet…
                </div>
              )}
            </div>

            {/* Vehicles block */}
            <div style={{ minWidth: "180px" }}>
              <div className="card-subtitle" style={{ fontWeight: 600 }}>
                Vehicles
              </div>
              {vehicles ? (
                <>
                  <div style={{ display: "flex", gap: "1.2rem", marginTop: "0.3rem" }}>
                    <div>
                      <div className="card-subtitle">Unique IDs (window)</div>
                      <div style={{ fontSize: "1.3rem", fontWeight: 600 }}>
                        {vehicles.totalUnique}
                      </div>
                    </div>
                    <div>
                      <div className="card-subtitle">In Latest Frame</div>
                      <div style={{ fontSize: "1.3rem", fontWeight: 600 }}>
                        {vehicles.currentFrameCount}
                      </div>
                    </div>
                  </div>
                  <div style={{ marginTop: "0.4rem" }}>
                    <div className="card-subtitle">Density</div>
                    <div style={{ fontSize: "1rem", fontWeight: 600 }}>
                      {vehicles.density}
                    </div>
                  </div>
                  <div
                    style={{
                      marginTop: "0.4rem",
                      display: "flex",
                      gap: "1.2rem",
                      fontSize: "0.85rem",
                    }}
                  >
                    <div>
                      <div className="card-subtitle">Analyzed Frames</div>
                      <div>{vehicles.analyzedFrames}</div>
                    </div>
                    <div>
                      <div className="card-subtitle">Window</div>
                      <div>{vehicles.windowSeconds.toFixed(1)} s</div>
                    </div>
                    <div>
                      <div className="card-subtitle">Model</div>
                      <div>{vehicles.model}</div>
                    </div>
                  </div>
                </>
              ) : (
                <div className="empty-state" style={{ marginTop: "0.4rem" }}>
                  No vehicle analytics yet…
                </div>
              )}
            </div>
          </div>

          {/* Timestamp line – prefer latest of the two */}
          {(() => {
            const ts =
              vehicles?.timestamp && people?.timestamp
                ? Math.max(vehicles.timestamp, people.timestamp)
                : vehicles?.timestamp || people?.timestamp;
            return ts ? (
              <div className="hint">
                Updated at {new Date(ts * 1000).toLocaleTimeString()}
              </div>
            ) : null;
          })()}
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

export default function UnifiedAnalytics() {
  const [streams, setStreams] = useState<Stream[]>([]);
  const [analytics, setAnalytics] = useState<AnalyticsMap>({});
  const [error, setError] = useState<string | null>(null);
  const [loadingStreams, setLoadingStreams] = useState(false);
  const [loadingAnalytics, setLoadingAnalytics] = useState(false);
  const analyzingRef = useRef(false);

  // NOTE: we fetch /streams (no ?status=LIVE) so tiles don't disappear
  useEffect(() => {
    let cancelled = false;

    const fetchStreams = async () => {
      try {
        setLoadingStreams(true);
        setError(null);
        const res = await fetch(`${API_BASE}/streams`);
        if (!res.ok) throw new Error("Failed to fetch streams");
        const json: Stream[] = await res.json();
        if (!cancelled) setStreams(json);
      } catch (err: any) {
        console.error(err);
        if (!cancelled) setError(err.message || "Failed to load streams");
      } finally {
        if (!cancelled) setLoadingStreams(false);
      }
    };

    fetchStreams();
    const id = window.setInterval(fetchStreams, REFRESH_MS);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, []);

  // Analytics polling – both people + vehicles for each stream
  useEffect(() => {
    if (streams.length === 0) return;
    if (analyzingRef.current) return;

    const runAnalytics = async () => {
      analyzingRef.current = true;
      setLoadingAnalytics(true);
      try {
        const subset = streams.slice(0, MAX_STREAMS);

        const results = await Promise.all(
          subset.map(async (stream) => {
            const key = stream.streamKey;
            const peopleUrl = `${ANALYTICS_BASE}/analytics/people?streamKey=${encodeURIComponent(
              key
            )}`;
            const vehiclesUrl = `${ANALYTICS_BASE}/analytics/vehicles?streamKey=${encodeURIComponent(
              key
            )}`;

            const [peopleRes, vehiclesRes] = await Promise.allSettled([
              fetch(peopleUrl),
              fetch(vehiclesUrl),
            ]);

            let peopleData: AnalyticsResponse | undefined;
            let vehiclesData: AnalyticsResponse | undefined;

            // People
            if (peopleRes.status === "fulfilled" && peopleRes.value.ok) {
              try {
                peopleData = (await peopleRes.value.json()) as AnalyticsResponse;
              } catch (e) {
                console.error("Failed to parse people analytics JSON", key, e);
              }
            }

            // Vehicles
            if (vehiclesRes.status === "fulfilled" && vehiclesRes.value.ok) {
              try {
                vehiclesData = (await vehiclesRes.value.json()) as AnalyticsResponse;
              } catch (e) {
                console.error("Failed to parse vehicle analytics JSON", key, e);
              }
            }

            if (!peopleData && !vehiclesData) return null;

            return { key, people: peopleData, vehicles: vehiclesData };
          })
        );

        setAnalytics((prev) => {
          const next: AnalyticsMap = { ...prev };
          for (const item of results) {
            if (!item) continue;
            next[item.key] = {
              people: item.people ?? next[item.key]?.people,
              vehicles: item.vehicles ?? next[item.key]?.vehicles,
            };
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
  }, [streams]);

  return (
    <div className="page">
      <div className="page-header">
        <h2>Live People & Vehicle Analytics</h2>
        <p className="card-subtitle">
          Combined counts per drone stream — people and vehicles estimated in near real-time.
        </p>
      </div>

      <div style={{ marginTop: "1.2rem" }}>
        {loadingStreams && <div className="loading">Refreshing streams…</div>}
        {!loadingStreams && streams.length === 0 && (
          <div className="empty-state">No streams registered yet.</div>
        )}
        {error && <div className="error-box">{error}</div>}
      </div>

      {streams.length > 0 && (
        <div className="feeds-grid" style={{ marginTop: "1.2rem" }}>
          {streams.slice(0, MAX_STREAMS).map((stream) => (
            <UnifiedAnalyticsCard
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
