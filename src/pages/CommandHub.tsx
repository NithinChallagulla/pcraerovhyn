// src/pages/CommandHub.tsx
import { useEffect, useMemo, useRef, useState } from "react";
import Hls from "hls.js";
import { API_BASE, type Stream } from "../config";
import "../styles.css";

const REFRESH_MS = 8000; // same refresh cadence

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
      } catch {}
    };

    if (Hls.isSupported()) {
      hls = new Hls({
        enableWorker: true,
        lowLatencyMode: !!isLive,
        backBufferLength: isLive ? 0 : 30,
        maxBufferLength: isLive ? 5 : 30,
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
  }, [hlsUrl, isLive]);

  return videoRef;
}

export default function StreamsGrid() {
  const [streams, setStreams] = useState<Stream[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const fetchAll = async () => {
      try {
        const res = await fetch(`${API_BASE}/streams`);
        if (!res.ok) throw new Error("Failed to fetch streams");
        const json: Stream[] = await res.json();
        if (!cancelled) {
          // Keep top 9 streams (most recent)
          const sorted = [...json].sort((a, b) => (b.createdAt ?? 0) - (a.createdAt ?? 0));
          setStreams(sorted.slice(0, 9));
        }
      } catch (err: any) {
        if (!cancelled) setError(err.message || String(err));
      }
    };

    fetchAll();
    const id = window.setInterval(fetchAll, REFRESH_MS);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, []);

  const cells = useMemo(() => {
    // ensure exactly 9 placeholders (fill with empty placeholders if less)
    const out = streams.slice(0, 9);
    while (out.length < 9) out.push({
      id: `empty-${out.length}`,
      streamKey: `EMPTY-${out.length}`,
      place: "",
      pilotName: "",
      hlsUrl: "",
      status: "OFFLINE",
    } as Stream);
    return out;
  }, [streams]);

  return (
    <div className="fullscreen-grid-root">
      <div className="fullscreen-grid">
        {cells.map((s, i) => {
          const isLive = s.status === "LIVE";
          const videoRef = useHlsPlayer(s.hlsUrl || "", isLive);
          return (
            <div key={s.streamKey + i} className="fullscreen-tile">
              <div className="tile-overlay">
                <div className="tile-title">{s.place || s.pilotName || "No feed"}</div>
                <div className={`tile-status ${isLive ? "live" : "offline"}`}>
                  {isLive ? "LIVE" : "OFFLINE"}
                </div>
              </div>

              {s.hlsUrl ? (
                <video ref={videoRef} className="tile-video" muted playsInline autoPlay />
              ) : (
                <div className="tile-empty">No stream</div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
