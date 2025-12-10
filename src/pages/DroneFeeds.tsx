// src/pages/DroneFeeds.tsx
import { useEffect, useRef, useState } from "react";
import Hls from "hls.js";
import { API_BASE, type Stream } from "../config";

const REFRESH_MS = 8000; // refresh list every 8s

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
        // autoplay may be blocked; user can tap play
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
        // @ts-ignore
        if (video.load) video.load();
      }
    };
  }, [hlsUrl, isLive]);

  return videoRef;
}


function StreamCard({ stream }: { stream: Stream }) {
  const isLive = stream.status === "LIVE";
  const videoRef = useHlsPlayer(stream.hlsUrl, isLive);

  const handleFullscreen = () => {
    const video = videoRef.current;
    if (!video) return;
    if (video.requestFullscreen) {
      video.requestFullscreen().catch(() => {});
    }
  };

  const handlePopOut = async () => {
    const video = videoRef.current;
    if (!video) return;

    try {
      if (document.pictureInPictureElement) {
        // @ts-ignore
        await document.exitPictureInPicture();
      }
      if (video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) {
        // @ts-ignore
        await video.requestPictureInPicture();
      }
    } catch (err) {
      console.error("PiP error", err);
    }
  };

  return (
    <div className="stream-card">
      <div className="stream-header">
        <span className="live-pill">{isLive ? "LIVE" : "OFFLINE"}</span>
        <div className="stream-meta">
          <div className="stream-title">
            {stream.pilotName || "Unknown Pilot"}
          </div>
          <div className="stream-subtitle">
            {stream.place || "Unknown Location"}
          </div>
        </div>
      </div>

      <div className="stream-video-wrapper">
        <video
          ref={videoRef}
          className="stream-video"
          muted
          playsInline
          controls   // seek bar visible
        />
        <div className="stream-controls">
          <button onClick={handleFullscreen}>Fullscreen</button>
          <button onClick={handlePopOut}>Pop-out</button>
        </div>
      </div>

      <div className="stream-footer">
        <div>
          <span className="stream-key-label">Key: </span>
          <span className="stream-key-value">{stream.streamKey}</span>
        </div>
      </div>
    </div>
  );
}

export default function DroneFeeds() {
  const [streams, setStreams] = useState<Stream[]>([]);
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
        const json: Stream[] = await res.json();
        if (!cancelled) {
          const sorted = [...json].sort(
            (a, b) => (b.createdAt ?? 0) - (a.createdAt ?? 0)
          );
          setStreams(sorted);
        }
      } catch (err: any) {
        console.error(err);
        if (!cancelled) {
          setError(err.message || "Failed to fetch streams");
        }
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

  return (
    <div className="page">
      <div className="page-header">
        <h2>Live & Recorded Drone Feeds</h2>
        <p>
          All drone streams for this event. Live streams switch to recorded
          playback automatically when pilots stop.
        </p>
      </div>

      {loading && <div className="loading">Refreshing streams…</div>}
      {error && <div className="error-box">{error}</div>}
      {!loading && streams.length === 0 && !error && (
        <div className="empty-state">No streams yet.</div>
      )}

      {streams.length > 0 && (
        <div className="feeds-grid">
          {streams.map((stream) => (
            <StreamCard key={stream.streamKey} stream={stream} />
          ))}
        </div>
      )}
    </div>
  );
}
