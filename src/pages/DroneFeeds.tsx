// src/pages/DroneFeeds.tsx
import { useEffect, useRef, useState } from "react";
import Hls from "hls.js";
import { API_BASE, type Stream } from "../config";

const REFRESH_MS = 8000; // poll live streams every 8s

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

function StreamCard({ stream }: { stream: Stream }) {
  const videoRef = useHlsPlayer(stream.hlsUrl);

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
        <span className="live-pill">LIVE</span>
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
          controls={false}
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

    const fetchLive = async () => {
      try {
        setLoading(true);
        setError(null);
        const res = await fetch(`${API_BASE}/streams?status=LIVE`);
        if (!res.ok) throw new Error("Failed to fetch live streams");
        const json: Stream[] = await res.json();
        if (!cancelled) setStreams(json);
      } catch (err: any) {
        console.error(err);
        if (!cancelled) {
          setError(err.message || "Failed to fetch live streams");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetchLive();
    const id = window.setInterval(fetchLive, REFRESH_MS);
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
          All currently active RTMP streams from field pilots. Tiles disappear
          automatically the moment a pilot stops streaming.
        </p>
      </div>

      {loading && <div className="loading">Refreshing streams…</div>}
      {error && <div className="error-box">{error}</div>}
      {!loading && streams.length === 0 && !error && (
        <div className="empty-state">No live streams at the moment.</div>
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
