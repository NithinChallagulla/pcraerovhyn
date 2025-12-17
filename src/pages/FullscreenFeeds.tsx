// src/pages/FullscreenFeeds.tsx
import { useEffect, useRef, useState } from "react";
import Hls from "hls.js";
import { API_BASE, type Stream } from "../config";
import "./fullscreen-feeds.css";

const REFRESH_MS = 8000;
const MAX_STREAMS = 16;

function useHlsPlayer(hlsUrl: string, isLive: boolean) {
  const videoRef = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    let hls: Hls | null = null;

    video.muted = true;
    video.playsInline = true;

    const safePlay = () => {
      try {
        const p = video.play();
        if (p && (p as any).catch) (p as any).catch(() => {});
      } catch {}
    };

    if (Hls.isSupported()) {
      hls = new Hls({
        enableWorker: true,
        lowLatencyMode: isLive,
        backBufferLength: isLive ? 0 : 30,
        maxBufferLength: isLive ? 5 : 30,
      });
      hls.loadSource(hlsUrl);
      hls.attachMedia(video);
      hls.on(Hls.Events.MANIFEST_PARSED, safePlay);
    } else if (video.canPlayType("application/vnd.apple.mpegurl")) {
      video.src = hlsUrl;
      video.addEventListener("loadedmetadata", safePlay);
    }

    return () => {
      if (hls) hls.destroy();
      if (video) {
        video.removeAttribute("src");
        // @ts-ignore
        video.load?.();
      }
    };
  }, [hlsUrl, isLive]);

  return videoRef;
}

function StreamTile({ stream }: { stream: Stream }) {
  const isLive = stream.status === "LIVE";
  const videoRef = useHlsPlayer(stream.hlsUrl, isLive);

  return (
    <div className="fs-tile">
      <video
        ref={videoRef}
        className="fs-video"
        muted
        autoPlay
        playsInline
      />
      <div className="fs-overlay">
        <div className="fs-overlay-left">
          <div className="fs-pill live">LIVE</div>
          <div className="fs-place">{stream.place}</div>
        </div>
      </div>
    </div>
  );
}

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
        console.error(err);
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

  /* 🔥 CORE LOGIC — FIXED */
  const liveStreams = streams
    .filter((s) => s.status === "LIVE")
    .slice(0, MAX_STREAMS);

  const count = liveStreams.length;

  const columns =
    count >= 13 ? 4 :
    count >= 7  ? 3 :
    count >= 3  ? 2 : 1;

  return (
    <div className="fs-page">
      <div
        className="fs-grid"
        style={{ gridTemplateColumns: `repeat(${columns}, 1fr)` }}
      >
        {count === 0 && !loading && !error ? (
          <div className="fs-empty">No LIVE streams</div>
        ) : (
          liveStreams.map((s) => (
            <StreamTile key={s.streamKey} stream={s} />
          ))
        )}
      </div>
    </div>
  );
}
