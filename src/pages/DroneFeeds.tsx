// src/pages/DroneFeeds.tsx
import { useEffect, useRef, useState } from "react";
import Hls from "hls.js";
import { API_BASE, type Stream } from "../config";

const REFRESH_MS = 8000; // poll every 8s

function useHlsPlayer(hlsUrl: string) {
  const videoRef = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    let hls: Hls | null = null;

    // loop last 5 min forever when the playlist ends
    video.loop = true;

    const safePlay = () => {
      try {
        video.muted = true;
        const p = video.play();
        if (p && (p as any).catch) {
          (p as any).catch(() => {
            // autoplay might be blocked, user can click manually
          });
        }
      } catch {
        // ignore
      }
    };

    if (Hls.isSupported()) {
      hls = new Hls({
        enableWorker: true,
        lowLatencyMode: false,       // smoother playback, less stutter
        backBufferLength: 90,
        maxBufferLength: 30,
        maxMaxBufferLength: 60,
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

function StreamCard({ stream }: { stream: Stream }) {
  const videoRef = useHlsPlayer(stream.hlsUrl);
  const isLive = stream.status === "LIVE";

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
        <span className="live-pill">{isLive ? "LIVE" : "REPLAY"}</span>
        <div className="stream-meta">
          <div className="stream-title">{stream.pilotName || "Unknown Pilot"}</div>
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
          controls   // ✅ show native seek bar, etc.
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
        if (cancelled) return;

        // ✅ keep all tiles permanently (except PENDING)
        const visible = json.filter((s) => s.status !== "PENDING");
        setStreams(visible);
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
        <h2>Live Drone Feeds</h2>
        <p>
          All active and recorded drone streams. LIVE shows realtime, REPLAY loops the last 5 minutes.
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
