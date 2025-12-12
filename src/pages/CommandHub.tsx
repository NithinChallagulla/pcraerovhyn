// src/pages/CommandHub.tsx
import React, { useEffect, useMemo, useState } from "react";
import { API_BASE, type Stream } from "../config";
import Hls from "hls.js";

const REFRESH_MS = 8000;

// small HLS hook for each tile
function useTileHls(hlsUrl: string | undefined, isLive: boolean) {
  const ref = React.useRef<HTMLVideoElement | null>(null);
  useEffect(() => {
    const video = ref.current;
    if (!video || !hlsUrl) return;
    let hls: Hls | null = null;
    video.muted = true;
    video.playsInline = true;
    try {
      if (Hls.isSupported()) {
        hls = new Hls({ enableWorker: true, lowLatencyMode: !!isLive, backBufferLength: 0 });
        hls.loadSource(hlsUrl);
        hls.attachMedia(video);
        hls.on(Hls.Events.MANIFEST_PARSED, () => {
          try { video.play(); } catch { }
        });
      } else if (video.canPlayType("application/vnd.apple.mpegurl")) {
        video.src = hlsUrl;
        video.play().catch(() => {});
      }
    } catch { /* ignore */ }

    return () => {
      if (hls) hls.destroy();
      if (video) {
        video.pause();
        video.removeAttribute("src");
        // @ts-ignore
        if (video.load) video.load();
      }
    };
  }, [hlsUrl, isLive]);

  return ref;
}

export default function CommandHub() {
  const [streams, setStreams] = useState<Stream[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const fetchStreams = async () => {
      try {
        const res = await fetch(`${API_BASE}/streams`);
        if (!res.ok) throw new Error("Failed to fetch streams");
        const json: Stream[] = await res.json();
        if (!cancelled) {
          // prefer live streams first and newest
          const sorted = [...json].sort((a, b) => {
            const aLive = a.status === "LIVE" ? 1 : 0;
            const bLive = b.status === "LIVE" ? 1 : 0;
            if (aLive !== bLive) return bLive - aLive;
            return (b.createdAt ?? 0) - (a.createdAt ?? 0);
          });
          setStreams(sorted.slice(0, 9));
        }
      } catch (err: any) {
        if (!cancelled) setError(err.message || String(err));
      }
    };
    fetchStreams();
    const id = window.setInterval(fetchStreams, REFRESH_MS);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, []);

  // ensure exactly 9 tiles (pad with empties)
  const tiles = useMemo(() => {
    const out = streams.slice(0, 9);
    while (out.length < 9) out.push({ id: `empty-${out.length}`, streamKey: `EMPTY-${out.length}`, place: "", status: "ENDED" } as Stream);
    return out;
  }, [streams]);

  return (
    <div className="hub-root">
      <div className="hub-grid">
        {tiles.map((s, idx) => {
          const isEmpty = s.streamKey?.startsWith("EMPTY-");
          const isLive = s.status === "LIVE";
          const videoRef = useTileHls(s.hlsUrl, isLive);
          return (
            <div key={s.streamKey ?? idx} className={`hub-tile ${isEmpty ? "hub-tile-empty" : ""} ${isLive ? "hub-tile-live" : ""}`}>
              {!isEmpty ? (
                <>
                  <video ref={videoRef} className="hub-video" muted playsInline />
                  <div className="hub-overlay">
                    <div className="hub-place">{s.place || s.streamKey}</div>
                    <div className="hub-status">{isLive ? "LIVE" : "RECORDED"}</div>
                  </div>
                </>
              ) : (
                <div className="hub-empty">No stream</div>
              )}
            </div>
          );
        })}
      </div>

      {error && <div className="hub-error">{error}</div>}
    </div>
  );
}
