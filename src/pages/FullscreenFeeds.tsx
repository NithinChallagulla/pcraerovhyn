// src/pages/FullscreenFeeds.tsx
import { useEffect, useRef, useState } from "react";
import Hls from "hls.js";
import { API_BASE, type Stream } from "../config";
import "./fullscreen-feeds.css";

/**
 * NOTE: Stream type from config.ts is used; this component will also tolerate
 * optional `lat` and `lon` fields on the stream objects if your backend provides them.
 */

const REFRESH_MS = 8000;

function useHlsPlayer(hlsUrl: string, isLive: boolean) {
  const videoRef = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    let hls: Hls | null = null;

    video.muted = true;
    video.loop = !isLive;
    video.playsInline = true;

    const safePlay = () => {
      try {
        const p = video.play();
        if (p && (p as any).catch) (p as any).catch(() => {});
      } catch {
        // autoplay blocked — user can click tile to play
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
        try {
          hls.destroy();
        } catch {}
      }
      if (video) {
        video.removeAttribute("src");
        // @ts-ignore
        if (video.load) video.load();
      }
    };
  }, [hlsUrl, isLive]);

  return videoRef;
}

function StreamTile({ stream }: { stream: Stream & { lat?: number; lon?: number } }) {
  const isLive = stream.status === "LIVE";
  const videoRef = useHlsPlayer(stream.hlsUrl, isLive);
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Toggle play/pause on click; also request fullscreen for an individual tile
  const onTileClick = async () => {
    const video = videoRef.current;
    if (!video) return;

    try {
      if (video.paused) {
        await video.play().catch(() => {});
      } else {
        video.pause();
      }
    } catch {}

    // If user clicked while pressing ctrl or meta, open tile fullscreen
    // (also allow double-click)
  };

  const openTileFullscreen = async () => {
    const container = containerRef.current;
    if (!container) return;
    try {
      if (container.requestFullscreen) {
        await container.requestFullscreen();
      }
    } catch {}
  };

  const openMaps = () => {
    if (stream.lat != null && stream.lon != null) {
      const url = `https://www.google.com/maps/search/?api=1&query=${stream.lat},${stream.lon}`;
      window.open(url, "_blank", "noopener,noreferrer");
    }
  };

  return (
    <div
      className="fs-tile"
      ref={containerRef}
      onClick={onTileClick}
      onDoubleClick={openTileFullscreen}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter") onTileClick();
        if (e.key === "f" || e.key === "F") openTileFullscreen();
      }}
    >
      <video
        ref={videoRef}
        className="fs-video"
        muted
        playsInline
        // we hide native controls for a full-screen clean look
      />
      <div className="fs-overlay">
        <div className="fs-overlay-left">
          <div className={`fs-pill ${isLive ? "live" : "offline"}`}>
            {isLive ? "LIVE" : "OFFLINE"}
          </div>
          <div className="fs-meta">
            <div className="fs-title">{stream.pilotName || "Unknown Pilot"}</div>
            <div className="fs-place">
              {stream.place || (stream.lat && stream.lon ? `${stream.lat.toFixed(5)}, ${stream.lon.toFixed(5)}` : "Unknown Location")}
            </div>
          </div>
        </div>

        <div className="fs-overlay-right">
          {stream.lat != null && stream.lon != null ? (
            <button className="fs-map-btn" onClick={(e) => { e.stopPropagation(); openMaps(); }}>
              Map
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}

export default function FullscreenFeeds() {
  const [streams, setStreams] = useState<(Stream & { lat?: number; lon?: number })[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const fetchAll = async () => {
      try {
        setLoading(true);
        setError(null);
        const res = await fetch(`${API_BASE}/streams`);
        if (!res.ok) throw new Error("Failed to fetch streams");
        const json: (Stream & { lat?: number; lon?: number })[] = await res.json();
        if (!cancelled) {
          const sorted = [...json].sort(
            (a, b) => (b.createdAt ?? 0) - (a.createdAt ?? 0)
          );
          setStreams(sorted);
        }
      } catch (err: any) {
        console.error(err);
        if (!cancelled) setError(err.message || "Failed to fetch streams");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetchAll();
    const id = window.setInterval(fetchAll, REFRESH_MS);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, []);

  // Enter page fullscreen
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "F" || e.key === "f") {
        const el = document.documentElement;
        if (el.requestFullscreen) {
          // eslint-disable-next-line @typescript-eslint/no-floating-promises
          el.requestFullscreen().catch(() => {});
        }
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <div className="fs-page">
      <div className="fs-topbar">
        <div className="fs-topbar-left">
          <h3 className="fs-heading">Fullscreen Drone Grid</h3>
          <p className="fs-sub">Borderless tiles · double-click a tile for fullscreen · F to fullscreen page</p>
        </div>
        <div className="fs-topbar-right">
          {loading ? <div className="fs-status">Refreshing…</div> : null}
          {error ? <div className="fs-error">{error}</div> : null}
        </div>
      </div>

      <div className="fs-grid" aria-live="polite">
        {streams.length === 0 && !loading && !error ? (
          <div className="fs-empty">No streams yet.</div>
        ) : (
          streams.slice(0, 9).map((s) => <StreamTile key={s.streamKey} stream={s} />)
        )}
      </div>
    </div>
  );
}
