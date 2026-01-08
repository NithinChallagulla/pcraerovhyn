// src/pages/FullscreenFeeds.tsx
import { useEffect, useRef, useState } from "react";
import Hls from "hls.js";
import { API_BASE, type Stream } from "../config";
import "./fullscreen-feeds.css";

const REFRESH_MS = 8000;
const MAX_STREAMS = 16;

// 🔒 STREAM URLS
const LIVE_URL   = "http://34.47.190.236/live/test.m3u8";
const REPLAY_URL = "http://34.47.190.236/replay/replay.m3u8";

/* =========================
   HLS PLAYER WITH FALLBACK
   ========================= */
function useHlsPlayerWithFallback() {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const hlsRef = useRef<Hls | null>(null);
  const [source, setSource] = useState<"LIVE" | "REPLAY">("LIVE");

  const attach = (url: string, lowLatency: boolean) => {
    const video = videoRef.current;
    if (!video) return;

    if (hlsRef.current) {
      hlsRef.current.destroy();
      hlsRef.current = null;
    }

    video.muted = true;
    video.playsInline = true;

    const playSafe = () => {
      try {
        const p = video.play();
        if (p && (p as any).catch) (p as any).catch(() => {});
      } catch {}
    };

    if (Hls.isSupported()) {
      const hls = new Hls({
        enableWorker: true,
        lowLatencyMode: lowLatency,
        maxBufferLength: lowLatency ? 5 : 30,
        backBufferLength: lowLatency ? 0 : 30,
      });

      hls.loadSource(url);
      hls.attachMedia(video);

      hls.on(Hls.Events.MANIFEST_PARSED, playSafe);

      hls.on(Hls.Events.ERROR, (_, data) => {
        if (data.fatal && source === "LIVE") {
          setSource("REPLAY");
        }
      });

      hlsRef.current = hls;
    } else if (video.canPlayType("application/vnd.apple.mpegurl")) {
      video.src = url;
      video.addEventListener("loadedmetadata", playSafe);
    }
  };

  // 🔁 Attach on source change
  useEffect(() => {
    attach(source === "LIVE" ? LIVE_URL : REPLAY_URL, source === "LIVE");
    return () => {
      hlsRef.current?.destroy();
    };
  }, [source]);

  // 🔄 Background LIVE checker
  useEffect(() => {
    const id = setInterval(async () => {
      if (source === "REPLAY") {
        try {
          const r = await fetch(LIVE_URL, { method: "HEAD", cache: "no-store" });
          if (r.ok) setSource("LIVE");
        } catch {}
      }
    }, 5000);

    return () => clearInterval(id);
  }, [source]);

  return { videoRef, source };
}

/* =========================
   STREAM TILE
   ========================= */
function StreamTile({ stream }: { stream: Stream }) {
  const { videoRef, source } = useHlsPlayerWithFallback();
  const containerRef = useRef<HTMLDivElement>(null);

  const handleDoubleClick = () => {
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen();
    }
  };

  return (
    <div
      className="fs-tile"
      ref={containerRef}
      onDoubleClick={handleDoubleClick}
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
          <div className={`fs-pill ${source === "LIVE" ? "live" : "replay"}`}>
            {source}
          </div>
          <div className="fs-place">{stream.place}</div>
        </div>
      </div>
    </div>
  );
}

/* =========================
   MAIN PAGE
   ========================= */
export default function FullscreenFeeds() {
  const [streams, setStreams] = useState<Stream[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    document.body.classList.add("__fullscreen-navbar-fixed");
    return () => {
      document.body.classList.remove("__fullscreen-navbar-fixed");
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    const fetchStreams = async () => {
      try {
        setLoading(true);
        setError(null);
        const res = await fetch(`${API_BASE}/streams`);
        if (!res.ok) throw new Error("Failed to fetch streams");
        const data: Stream[] = await res.json();
        if (!cancelled) setStreams(data);
      } catch (err: any) {
        if (!cancelled) setError(err.message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetchStreams();
    const id = setInterval(fetchStreams, REFRESH_MS);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, []);

  const count = Math.min(streams.length, MAX_STREAMS);

  const columns =
    count >= 10 ? 4 :
    count >= 5  ? 3 :
    count >= 2  ? 2 : 1;

  return (
    <div className="fs-page">
      <div
        className="fs-grid"
        style={{ gridTemplateColumns: `repeat(${columns}, 1fr)` }}
      >
        {count === 0 && !loading && !error ? (
          <div className="fs-empty">No streams</div>
        ) : (
          streams.slice(0, MAX_STREAMS).map((s) => (
            <StreamTile key={s.streamKey} stream={s} />
          ))
        )}
      </div>
    </div>
  );
}
