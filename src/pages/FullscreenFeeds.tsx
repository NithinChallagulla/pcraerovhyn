// src/pages/FullscreenFeeds.tsx
import { useEffect, useRef, useState } from "react";
import Hls from "hls.js";
import { API_BASE, type Stream } from "../config";
import "./fullscreen-feeds.css";

const REFRESH_MS = 8000;

/* ---------------------------------------
   HLS PLAYER HOOK
--------------------------------------- */
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
      } catch {}
    };

    const handleBufferEos = () => {
      if (!video || !hls || isLive) return;
      try {
        video.currentTime = 0;
        hls.stopLoad();
        hls.startLoad();
        safePlay();
      } catch {}
    };

    const handleEnded = () => {
      if (!isLive) {
        video.currentTime = 0;
        safePlay();
      }
    };

    if (Hls.isSupported()) {
      hls = new Hls(
        isLive
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
            }
      );

      hls.loadSource(hlsUrl);
      hls.attachMedia(video);

      hls.on(Hls.Events.MANIFEST_PARSED, safePlay);
      hls.on(Hls.Events.FRAG_LOADED, safePlay);

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
        try {
          hls.destroy();
        } catch {}
      }
      video.removeAttribute("src");
      video.load?.();
    };
  }, [hlsUrl, isLive]);

  return videoRef;
}

/* ---------------------------------------
   STREAM TILE
--------------------------------------- */
function StreamTile({
  stream,
}: {
  stream: Stream & { lat?: number; lon?: number };
}) {
  const isLive = stream.status === "LIVE";
  const videoRef = useHlsPlayer(stream.hlsUrl, isLive);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const togglePlay = async () => {
    const video = videoRef.current;
    if (!video) return;
    try {
      video.paused ? await video.play() : video.pause();
    } catch {}
  };

  const openFullscreen = async () => {
    try {
      await containerRef.current?.requestFullscreen();
    } catch {}
  };

  const openMaps = () => {
    if (stream.lat != null && stream.lon != null) {
      window.open(
        `https://www.google.com/maps/search/?api=1&query=${stream.lat},${stream.lon}`,
        "_blank",
        "noopener,noreferrer"
      );
    }
  };

  return (
    <div
      className="fs-tile"
      ref={containerRef}
      onClick={togglePlay}
      onDoubleClick={openFullscreen}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter") togglePlay();
        if (e.key.toLowerCase() === "f") openFullscreen();
      }}
    >
      <video
        ref={videoRef}
        className="fs-video"
        muted
        autoPlay
        playsInline
      />

      <div className="fs-overlay">
        <div className="fs-overlay-left">
          <div className={`fs-pill ${isLive ? "live" : "offline"}`}>
            {isLive ? "LIVE" : "OFFLINE"}
          </div>
          <div className="fs-place">
            {stream.place ??
              (stream.lat && stream.lon
                ? `${stream.lat.toFixed(5)}, ${stream.lon.toFixed(5)}`
                : "Unknown")}
          </div>
        </div>

        {stream.lat != null && stream.lon != null && (
          <div className="fs-overlay-right">
            <button
              className="fs-map-btn"
              onClick={(e) => {
                e.stopPropagation();
                openMaps();
              }}
            >
              Map
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

/* ---------------------------------------
   FULLSCREEN FEEDS PAGE
--------------------------------------- */
export default function FullscreenFeeds() {
  const [streams, setStreams] = useState<
    (Stream & { lat?: number; lon?: number })[]
  >([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /* lock navbar */
  useEffect(() => {
    document.body.classList.add("__fullscreen-navbar-fixed");
    return () =>
      document.body.classList.remove("__fullscreen-navbar-fixed");
  }, []);

  /* fetch streams */
  useEffect(() => {
    let cancelled = false;

    const fetchAll = async () => {
      try {
        setLoading(true);
        const res = await fetch(`${API_BASE}/streams`);
        if (!res.ok) throw new Error("Fetch failed");
        const data = await res.json();
        if (!cancelled) {
          setStreams(
            [...data].sort(
              (a, b) => (b.createdAt ?? 0) - (a.createdAt ?? 0)
            )
          );
        }
      } catch (e: any) {
        if (!cancelled) setError(e.message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetchAll();
    const id = setInterval(fetchAll, REFRESH_MS);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, []);

  /* fullscreen shortcut */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() === "f") {
        document.documentElement.requestFullscreen?.().catch(() => {});
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <div className="fs-page">
      <div
        className="fs-grid"
        aria-live="polite"
        style={{ "--stream-count": streams.length } as React.CSSProperties}
      >
        {streams.length === 0 && !loading && !error ? (
          <div className="fs-empty">No streams yet</div>
        ) : (
          streams.map((s) => (
            <StreamTile key={s.streamKey} stream={s} />
          ))
        )}
      </div>
    </div>
  );
}
