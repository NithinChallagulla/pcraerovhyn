// src/components/StreamCard.tsx
import { useRef, useState } from "react";
import Hls from "hls.js";
import type { Stream } from "../config";

/** 🔴 CHANGE ONLY THIS IF VM IP CHANGES */
import { STREAM_SERVER } from "../config";

function useHlsPlayer(liveUrl: string, replayUrl: string) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const hlsRef = useRef<Hls | null>(null);
  const sourceRef = useRef<"LIVE" | "BUFFER">("LIVE");

  const attach = (url: string, isLive: boolean) => {
    const video = videoRef.current;
    if (!video) return;

    // cleanup
    if (hlsRef.current) {
      hlsRef.current.destroy();
      hlsRef.current = null;
    }

    video.muted = true;
    video.loop = !isLive;

    const safePlay = () => {
      try {
        const p = video.play();
        if (p && (p as any).catch) (p as any).catch(() => {});
      } catch {}
    };

    if (Hls.isSupported()) {
      const hls = new Hls(
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

      hlsRef.current = hls;
      hls.loadSource(url);
      hls.attachMedia(video);

      hls.on(Hls.Events.MANIFEST_PARSED, safePlay);
      hls.on(Hls.Events.FRAG_LOADED, safePlay);

      hls.on(Hls.Events.ERROR, (_, data) => {
        if (data.fatal && sourceRef.current === "LIVE") {
          console.warn("LIVE failed → switching to BUFFER");
          sourceRef.current = "BUFFER";
          attach(replayUrl, false);
        }
      });
    } else if (video.canPlayType("application/vnd.apple.mpegurl")) {
      video.src = url;
      video.addEventListener("loadedmetadata", safePlay);
    }
  };

  // initial attach + polling
  if (videoRef.current && !hlsRef.current) {
    attach(liveUrl, true);

    // poll for LIVE recovery
    setInterval(async () => {
      if (sourceRef.current === "BUFFER") {
        try {
          const res = await fetch(liveUrl, { cache: "no-store" });
          if (res.ok) {
            console.warn("LIVE back → switching");
            sourceRef.current = "LIVE";
            attach(liveUrl, true);
          }
        } catch {}
      }
    }, 5000);
  }

  return videoRef;
}


export default function StreamCard({ stream }: { stream: Stream }) {
 const isLive = stream.status === "LIVE";

const liveUrl = `${STREAM_SERVER}/hls/${stream.streamKey}.m3u8`;
const replayUrl = `${STREAM_SERVER}/buffer/fallback.m3u8`;

const videoRef = useHlsPlayer(liveUrl, replayUrl);

  const [showLinks, setShowLinks] = useState(false);

  const handleFullscreen = () => {
    videoRef.current?.requestFullscreen?.().catch(() => {});
  };

  const handlePopOut = async () => {
    const video = videoRef.current;
    if (!video) return;
    try {
      if (document.pictureInPictureElement) {
        // @ts-ignore
        await document.exitPictureInPicture();
      }
      // @ts-ignore
      await video.requestPictureInPicture();
    } catch {}
  };

  return (
    <div className="stream-card">
      <div className="stream-header">
        <span className="live-pill">{isLive ? "LIVE" : "OFFLINE"}</span>
        <div className="stream-meta">
          <div className="stream-title">{stream.place || "Unknown Location"}</div>
          <div className="stream-subtitle">{stream.pilotName || "Unknown Pilot"}</div>
        </div>
      </div>

      <div className="stream-video-wrapper">
        <video
          ref={videoRef}
          className="stream-video"
          muted
          playsInline
          controls
        />

        <div className="stream-controls">
          <button onClick={handleFullscreen}>Fullscreen</button>
          <button onClick={handlePopOut}>Pop-out</button>
          <button onClick={() => setShowLinks((s) => !s)}>
            {showLinks ? "Hide Links" : "Stream Links"}
          </button>
        </div>
      </div>

      <div className="stream-footer">
        <span className="stream-key-label">Key: </span>
        <span className="stream-key-value">{stream.streamKey}</span>
      </div>

      {showLinks && (
        <div className="stream-links-card">
          <div className="stream-links-header">Stream URLs</div>

          <div className="stream-links-row">
            <div className="stream-links-label">RTMP</div>
            <div className="stream-links-value">
              rtmp://35.193.55.170/live
            </div>
          </div>

          <div className="stream-links-row">
            <div className="stream-links-label">Stream Key</div>
            <div className="stream-links-value mono">{stream.streamKey}</div>
          </div>

          <div className="stream-links-row">
            <div className="stream-links-label">HLS (Live)</div>
            <div className="stream-links-value">{liveUrl}</div>
          </div>

          <div className="stream-links-row">
            <div className="stream-links-label">HLS (Replay)</div>
            <div className="stream-links-value">{replayUrl}</div>
          </div>
        </div>
      )}
    </div>
  );
}
