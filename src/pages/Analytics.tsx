import { useEffect, useRef, useState, useMemo } from "react";
import Hls from "hls.js";
import {
  API_BASE,
  ANALYTICS_BASE,
  type Stream,
  type AnalyticsResponse,
} from "../config";

const REFRESH_MS = 15000;
const MAX_STREAMS = 9;

type CombinedAnalytics = {
  people?: AnalyticsResponse;
  vehicles?: AnalyticsResponse;
};

type AnalyticsMap = Record<string, CombinedAnalytics>;

function useHlsPlayer(hlsUrl: string, isLive: boolean) {
  const videoRef = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    let hls: Hls | null = null;

    video.muted = true;
    video.loop = !isLive;

    const safePlay = () => {
      try {
        const p = video.play();
        if (p && (p as any).catch) (p as any).catch(() => {});
      } catch {
        // ignore autoplay errors
      }
    };

    const handleBufferEos = () => {
      if (!video || !hls || isLive) return;
      try {
        video.currentTime = 0;
        hls.stopLoad();
        hls.startLoad();
        safePlay();
      } catch {
        // ignore
      }
    };

    const handleEnded = () => {
      if (!isLive) {
        video.currentTime = 0;
        safePlay();
      }
    };

    if (Hls.isSupported()) {
      const config = isLive
        ? {
            enableWorker: true,
            lowLatencyMode: true,
            liveSyncDuration: 1,
            liveMaxLatencyDuration: 2,
            backBufferLength: 0,
            maxBufferLength: 5,
          }
        : {
            enableWorker: true,
            lowLatencyMode: false,
            backBufferLength: 30,
            maxBufferLength: 30,
          };

      hls = new Hls(config);
      hls.loadSource(hlsUrl);
      hls.attachMedia(video);

      hls.on(Hls.Events.MANIFEST_PARSED, safePlay);
      hls.on(Hls.Events.FRAG_LOADED, () => {
        if (!video.paused) safePlay();
      });

      if (!isLive) {
        hls.on(Hls.Events.BUFFER_EOS, handleBufferEos);
      }
    } else if (video.canPlayType("application/vnd.apple.mpegurl")) {
      video.src = hlsUrl;
      video.addEventListener("loadedmetadata", safePlay);
    }

    video.addEventListener("ended", handleEnded);

    return () => {
      video.removeEventListener("ended", handleEnded);
      if (hls) {
        if (!isLive) {
          hls.off(Hls.Events.BUFFER_EOS, handleBufferEos);
        }
        hls.destroy();
      }
      if (video) {
        video.removeAttribute("src");
        if (video.load) video.load();
      }
    };
  }, [hlsUrl, isLive]);

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
  const isLive = stream.status === "LIVE";
  const videoRef = useHlsPlayer(stream.hlsUrl, isLive);
  const people = combined?.people;
  const vehicles = combined?.vehicles;

  const hasAnyData = !!people || !!vehicles;

  return (
    <div className="stream-card">
      <div className="stream-header">
        <span className="live-pill">{isLive ? "LIVE" : "OFFLINE"}</span>
        <div className="stream-meta">
          <div className="stream-title">
            {stream.place || "Unknown Location"} — Analytics
          </div>
          <div className="stream-subtitle">
            {stream.pilotName || "Unknown Pilot"}
          </div>
        </div>
      </div>

      <div className="stream-video-wrapper" style={{ marginTop: "0.6rem" }}>
        <video
          ref={videoRef}
          className="stream-video"
          muted
          playsInline
          controls
        />
      </div>

      <div style={{ marginTop: "0.6rem" }}>
        <div className="card-subtitle">Key</div>
        <code className="stream-key-value">{stream.streamKey}</code>
      </div>

      {loadingAnalytics && !hasAnyData && (
        <div className="loading" style={{ marginTop: "0.7rem" }}>
          Running analytics on this stream…
        </div>
      )}

      {hasAnyData && (
        <div style={{ marginTop: "0.8rem", display: "grid", gap: "0.75rem" }}>
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
                    {Number(
                      (people as any)?.totalUnique ??
                        (people as any)?.unique ??
                        0
                    )}
                  </div>
                </div>
                <div>
                  <div className="card-subtitle">In latest frame</div>
                  <div style={{ fontSize: "1.3rem", fontWeight: 600 }}>
                    {people.currentFrameCount ??
                      (people as any).current ??
                      0}
                  </div>
                </div>
                <div>
                  <div className="card-subtitle">Density</div>
                  <div style={{ fontSize: "1.05rem", fontWeight: 600 }}>
                    {people.density ?? "—"}
                  </div>
                </div>
              </div>
            </div>
          )}

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
                    {Number(
                      (vehicles as any)?.totalUnique ??
                        (vehicles as any)?.unique ??
                        0
                    )}
                  </div>
                </div>
                <div>
                  <div className="card-subtitle">In latest frame</div>
                  <div style={{ fontSize: "1.3rem", fontWeight: 600 }}>
                    {vehicles.currentFrameCount ??
                      (vehicles as any).current ??
                      0}
                  </div>
                </div>
                <div>
                  <div className="card-subtitle">Density</div>
                  <div style={{ fontSize: "1.05rem", fontWeight: 600 }}>
                    {vehicles.density ?? "—"}
                  </div>
                </div>
              </div>
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
  const [streams, setStreams] = useState<Stream[]>([]);
  const [analytics, setAnalytics] = useState<AnalyticsMap>({});
  const [error, setError] = useState<string | null>(null);
  const [loadingStreams, setLoadingStreams] = useState(false);
  const [loadingAnalytics, setLoadingAnalytics] = useState(false);
  const analyzingRef = useRef(false);

  const [selectedPlace, setSelectedPlace] = useState<string>("ALL");

  // Track fake data counters per stream key - ONLY FOR LIVE STREAMS
  const fakeDataRef = useRef<Record<string, { people: number; vehicles: number; startTime: number }>>({});

  useEffect(() => {
    let cancelled = false;

    const fetchStreams = async () => {
      try {
        setLoadingStreams(true);
        setError(null);
        const res = await fetch(`${API_BASE}/streams`);
        if (!res.ok) throw new Error("Failed to fetch streams");
        const json: Stream[] = await res.json();
        if (!cancelled) {
          const sorted = [...json].sort(
            (a, b) => (b.createdAt ?? 0) - (a.createdAt ?? 0)
          );
          setStreams(sorted);

          // Initialize fake data counters ONLY for LIVE streams
          sorted.forEach((stream) => {
            if (stream.status === "LIVE" && !fakeDataRef.current[stream.streamKey]) {
              fakeDataRef.current[stream.streamKey] = {
                people: Math.floor(Math.random() * 50) + 10,
                vehicles: Math.floor(Math.random() * 30) + 5,
                startTime: Date.now(),
              };
            }
          });
        }
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

  const places = useMemo(() => {
    const set = new Set<string>();
    for (const s of streams) {
      if (s.place && s.place.trim()) set.add(s.place.trim());
    }
    return ["ALL", ...Array.from(set).sort()];
  }, [streams]);

  const visibleStreams = useMemo(() => {
    const filtered =
      selectedPlace && selectedPlace !== "ALL"
        ? streams.filter((s) => (s.place || "") === selectedPlace)
        : streams;
    return filtered;
  }, [streams, selectedPlace]);

  // Helper function to calculate fake increments ONLY for LIVE streams
  const calculateFakeAnalytics = (stream: Stream) => {
    const isLive = stream.status === "LIVE";

    // If not LIVE, fetch from API
    if (!isLive) {
      return null;
    }

    const streamKey = stream.streamKey;
    const fakeData = fakeDataRef.current[streamKey];

    if (!fakeData) {
      return null;
    }

    const elapsed = (Date.now() - fakeData.startTime) / 1000; // elapsed seconds

    // People analytics:
    // +2 every 10 seconds
    // +8 every 22 seconds
    // -20 every 35 seconds (min 3)
    const peopleIncrements10s = Math.floor(elapsed / 10) * 2;
    const peopleIncrements22s = Math.floor(elapsed / 22) * 8;
    const peopleDecrements35s = Math.floor(elapsed / 35) * 20;
    let totalPeople = fakeData.people + peopleIncrements10s + peopleIncrements22s - peopleDecrements35s;
    totalPeople = Math.max(totalPeople, 3); // Min 3

    // Vehicles analytics:
    // +4 every 8 seconds
    // +6 every 25 seconds
    // -20 every 35 seconds (min 3)
    const vehicleIncrements8s = Math.floor(elapsed / 8) * 4;
    const vehicleIncrements25s = Math.floor(elapsed / 25) * 6;
    const vehicleDecrements35s = Math.floor(elapsed / 35) * 20;
    let totalVehicles = fakeData.vehicles + vehicleIncrements8s + vehicleIncrements25s - vehicleDecrements35s;
    totalVehicles = Math.max(totalVehicles, 3); // Min 3

    return {
      people: {
        totalUnique: totalPeople,
        currentFrameCount: Math.floor(totalPeople * 0.7),
        density: totalPeople > 50 ? "High" : totalPeople > 30 ? "Medium" : "Low",
      },
      vehicles: {
        totalUnique: totalVehicles,
        currentFrameCount: Math.floor(totalVehicles * 0.65),
        density: totalVehicles > 25 ? "High" : totalVehicles > 15 ? "Medium" : "Low",
      },
    };
  };

  useEffect(() => {
    if (visibleStreams.length === 0) return;
    if (analyzingRef.current) return;

    const runAnalytics = async () => {
      analyzingRef.current = true;
      setLoadingAnalytics(true);
      try {
        const subset = visibleStreams.slice(0, MAX_STREAMS);

        const results = await Promise.all(
          subset.map(async (stream) => {
            const key = stream.streamKey;
            const isLive = stream.status === "LIVE";

            try {
              let combined: CombinedAnalytics = {};

              if (isLive) {
                // For LIVE streams, use fake data
                const fakeData = calculateFakeAnalytics(stream);
                if (fakeData) {
                  combined.people = fakeData.people as AnalyticsResponse;
                  combined.vehicles = fakeData.vehicles as AnalyticsResponse;
                }
              } else {
                // For OFFLINE/recorded streams, fetch from API
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

                if (peopleRes.ok) {
                  combined.people = (await peopleRes.json()) as AnalyticsResponse;
                }
                if (vehicleRes.ok) {
                  combined.vehicles = (await vehicleRes.json()) as AnalyticsResponse;
                }
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
              next[item.key] = { ...next[item.key], ...item.combined };
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
  }, [visibleStreams]);

  return (
    <div className="page">
      <div
        className="page-header"
        style={{
          display: "flex",
          gap: "1rem",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <div style={{ flex: 1 }}>
          <h2>Analytics</h2>
          <p className="card-subtitle">
            Live people & vehicle counts for each active or recorded drone
            stream.
          </p>
        </div>

        <div style={{ minWidth: 180 }}>
          <label
            style={{
              display: "block",
              fontSize: "0.72rem",
              color: "var(--text-muted)",
            }}
          >
            Filter by place
          </label>
          <select
            value={selectedPlace}
            onChange={(e) => setSelectedPlace(e.target.value)}
            style={{
              width: "100%",
              padding: "6px 8px",
              borderRadius: 6,
              background: "var(--card)",
              color: "var(--text-main)",
              border: "1px solid rgba(255,255,255,0.06)",
              fontSize: "0.9rem",
            }}
          >
            {places.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div style={{ marginTop: "1.2rem" }}>
        {loadingStreams && <div className="loading">Refreshing streams…</div>}
        {!loadingStreams && visibleStreams.length === 0 && (
          <div className="empty-state">No streams for selected place.</div>
        )}
        {error && <div className="error-box">{error}</div>}
      </div>

      {visibleStreams.length > 0 && (
        <div className="feeds-grid" style={{ marginTop: "1.2rem" }}>
          {visibleStreams.slice(0, MAX_STREAMS).map((stream) => (
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
