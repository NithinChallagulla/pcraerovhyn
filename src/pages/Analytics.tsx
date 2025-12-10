// src/pages/Analytics.tsx
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

function AnalyticsCard({
  stream,
  combined,
  loadingAnalytics,
}: {
  stream: Stream;
  combined?: CombinedAnalytics;
  loadingAnalytics: boolean;
}) {
  const videoRef = useHlsPlayer(stream.hlsUrl);
  const people = combined?.people;
  const vehicles = combined?.vehicles;

  const hasAnyData = !!people || !!vehicles;

  return (
    <div className="stream-card">
      <div className="stream-header">
        <span className="live-pill">LIVE</span>
        <div className="stream-meta">
          <div className="stream-title">{stream.pilotName || "Unknown Pilot"}</div>
          <div className="stream-subtitle">
            {stream.place || "Unknown Location"} — Analytics
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

      {loadingAnalytics && !hasAnyData && (
        <div className="loading" style={{ marginTop: "0.7rem" }}>
          Running analytics on this stream…
        </div>
      )}

      {hasAnyData && (
        <div style={{ marginTop: "0.8rem", display: "grid", gap: "0.75rem" }}>
          {/* People block */}
          {people && (
            <div>
              <div className="card-subtitle" style={{ fontWeight: 600 }}>
                People
              </div>
              <div
                style={{
                  display: "flex",
                  gap: "1.2rem",
                  flexWrap: "wrap",
                  marginTop: "0.3rem",
                }}
              >
                <div>
                  <div className="card-subtitle">Unique (window)</div>
                  <div style={{ fontSize: "1.3rem", fontWeight: 600 }}>
                    {people.totalUnique}
                  </div>
                </div>
                <div>
                  <div className="card-subtitle">In latest frame</div>
                  <div style={{ fontSize: "1.3rem", fontWeight: 600 }}>
                    {people.currentFrameCount}
                  </div>
                </div>
                <div>
                  <div className="card-subtitle">Density</div>
                  <div style={{ fontSize: "1.05rem", fontWeight: 600 }}>
                    {people.density}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Vehicles block */}
          {vehicles && (
            <div>
              <div className="card-subtitle" style={{ fontWeight: 600 }}>
                Vehicles
              </div>
              <div
                style={{
                  display: "flex",
                  gap: "1.2rem",
                  flexWrap: "wrap",
                  marginTop: "0.3rem",
                }}
              >
                <div>
                  <div className="card-subtitle">Unique (window)</div>
                  <div style={{ fontSize: "1.3rem", fontWeight: 600 }}>
                    {vehicles.totalUnique}
                  </div>
                </div>
                <div>
                  <div className="card-subtitle">In latest frame</div>
                  <div style={{ fontSize: "1.3rem", fontWeight: 600 }}>
                    {vehicles.currentFrameCount}
                  </div>
                </div>
                <div>
                  <div className="card-subtitle">Density</div>
                  <div style={{ fontSize: "1.05rem", fontWeight: 600 }}>
                    {vehicles.density}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Meta row */}
          <div style={{ display: "flex", gap: "1.2rem", flexWrap: "wrap" }}>
            {people && (
              <div>
                <div className="card-subtitle">People frames</div>
                <div>{people.analyzedFrames}</div>
              </div>
            )}
            {vehicles && (
              <div>
                <div className="card-subtitle">Vehicle frames</div>
                <div>{vehicles.analyzedFrames}</div>
              </div>
            )}
            {(people || vehicles) && (
              <div>
                <div className="card-subtitle">Window</div>
                <div>
                  {(
                    (people?.windowSeconds ?? vehicles?.windowSeconds ?? 0)
                  ).toFixed(1)}{" "}
                  s
                </div>
              </div>
            )}
            {vehicles && (
              <div>
                <div className="card-subtitle">Vehicle model</div>
                <div>{vehicles.model}</div>
              </div>
            )}
            {people && (
              <div>
                <div className="card-subtitle">People model</div>
                <div>{people.model}</div>
              </div>
            )}
          </div>

          {(people || vehicles) && (
            <div className="hint">
              Updated at{" "}
              {new Date(
                1000 *
                  Math.max(people?.timestamp ?? 0, vehicles?.timestamp ?? 0)
              ).toLocaleTimeString()}
            </div>
          )}
        </div>
      )}

      {!hasAnyData && !loadingAnalytics && (
        <div className="empty-state" style={{ marginTop: "0.7rem" }}>
          Waiting for first analytics run…
        </div>
      )}
    </div>
  );
}

export default function Analytics() {
  const [liveStreams, setLiveStreams] = useState<Stream[]>([]);
  const [analytics, setAnalytics] = useState<AnalyticsMap>({});
  const [error, setError] = useState<string | null>(null);
  const [loadingStreams, setLoadingStreams] = useState(false);
  const [loadingAnalytics, setLoadingAnalytics] = useState(false);
  const analyzingRef = useRef(false);

  // Fetch LIVE streams
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
        if (!cancelled) {
          setError(err.message || "Failed to load live streams");
        }
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

  // Run analytics for both people + vehicles
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
            const key = stream.streamKey;
            try {
              const [peopleRes, vehicleRes] = await Promise.all([
                fetch(
                  `${ANALYTICS_BASE}/analytics/people?streamKey=${encodeURIComponent(
                    key
                  )}`
                ),
                fetch(
                  `${ANALYTICS_BASE}/analytics/vehicles?streamKey=${encodeURIComponent(
                    key
                  )}`
                ),
              ]);

              const combined: CombinedAnalytics = {};

              if (peopleRes.ok) {
                combined.people = (await peopleRes.json()) as AnalyticsResponse;
              } else {
                console.warn("People analytics error", key, await peopleRes.text());
              }

              if (vehicleRes.ok) {
                combined.vehicles = (await vehicleRes.json()) as AnalyticsResponse;
              } else {
                console.warn(
                  "Vehicle analytics error",
                  key,
                  await vehicleRes.text()
                );
              }

              return { key, combined };
            } catch (err) {
              console.error("Analytics error for stream", key, err);
              return null;
            }
          })
        );

        setAnalytics((prev) => {
          const next: AnalyticsMap = { ...prev };
          for (const item of results) {
            if (item && item.combined) {
              next[item.key] = {
                ...next[item.key],
                ...item.combined,
              };
            }
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
        <h2>Analytics</h2>
        <p className="card-subtitle">
          Live people & vehicle counts for each active drone stream.
        </p>
      </div>

      <div style={{ marginTop: "1.2rem" }}>
        {loadingStreams && <div className="loading">Refreshing live streams…</div>}
        {!loadingStreams && liveStreams.length === 0 && (
          <div className="empty-state">No live streams at the moment.</div>
        )}
        {error && <div className="error-box">{error}</div>}
      </div>

      {liveStreams.length > 0 && (
        <div className="feeds-grid" style={{ marginTop: "1.2rem" }}>
          {liveStreams.slice(0, MAX_STREAMS).map((stream) => (
            <AnalyticsCard
              key={stream.streamKey}
              stream={stream}
              combined={analytics[stream.streamKey]}
              loadingAnalytics={loadingAnalytics}
            />
          ))}
        </div>
      )}
    </div>
  );
}
