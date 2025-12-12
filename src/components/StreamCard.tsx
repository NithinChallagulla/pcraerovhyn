// src/components/StreamCard.tsx
import { useRef, useState } from "react";
import Hls from "hls.js";
import type { Stream } from "../config";

function useHlsPlayer(hlsUrl: string, isLive: boolean) {
  const videoRef = useRef<HTMLVideoElement | null>(null);

  // only run if we have a non-empty url
  if (!hlsUrl) return videoRef;

  // effect moved inside a small helper to keep this file self-contained
  // Note: keep implementation minimal — the pages mostly used a copy of this
  // See pages where this hook is duplicated; this is the component-level helper.
  (function attach() {
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
        // ignore autoplay errors
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
      try {
        hls.loadSource(hlsUrl);
        hls.attachMedia(video);
        hls.on(Hls.Events.MANIFEST_PARSED, safePlay);
        hls.on(Hls.Events.FRAG_LOADED, () => {
          if (!video.paused) safePlay();
        });
      } catch (err) {
        console.error("HLS attach error:", err);
      }
    } else if (video.canPlayType("application/vnd.apple.mpegurl")) {
      video.src = hlsUrl;
      video.addEventListener("loadedmetadata", safePlay);
    }

    // cleanup (best-effort)
    const cleanup = () => {
      try {
        if (hls) hls.destroy();
      } catch (e) {}
      if (video) {
        try {
          video.removeAttribute("src");
          // @ts-ignore
          if (video.load) video.load();
        } catch (e) {}
      }
    };

    // attach cleanup to window unload (this is a cheap but safe pattern)
    window.addEventListener("beforeunload", cleanup);
  })();

  return videoRef;
}

export default function StreamCard({ stream }: { stream: Stream }) {
  const isLive = stream.status === "LIVE";
  // pass a guaranteed string to the hook (empty string if none)
  const videoRef = useHlsPlayer(stream.hlsUrl ?? "", isLive);
  const [showLinks, setShowLinks] = useState(false);

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

  const safeRtmp = stream.rtmpUrl ?? "";
  const safeHls = stream.hlsUrl ?? "";

  return (
    <div className="stream-card">
      <div className="stream-header">
        <span className="live-pill">{isLive ? "LIVE" : "OFFLINE"}</span>
        <div className="stream-meta">
          <div className="stream-title">{stream.place ?? "Unknown Location"}</div>
          <div className="stream-subtitle">{stream.pilotName ?? "Unknown Pilot"}</div>
        </div>
      </div>

      <div className="stream-video-wrapper">
        {safeHls ? (
          <video ref={videoRef} className="stream-video" muted playsInline controls />
        ) : (
          <div style={{ height: 0, paddingTop: "56.25%", background: "#000" }} />
        )}

        <div className="stream-controls">
          <button onClick={handleFullscreen}>Fullscreen</button>
          <button onClick={handlePopOut}>Pop-out</button>
          <button onClick={() => setShowLinks((s) => !s)}>{showLinks ? "Hide Links" : "Stream Links"}</button>
        </div>
      </div>

      <div className="stream-footer">
        <div>
          <span className="stream-key-label">Key: </span>
          <span className="stream-key-value">{stream.streamKey}</span>
        </div>
      </div>

      {showLinks && (
        <div className="stream-links-card">
          <div className="stream-links-header">Stream Generated</div>

          <div className="stream-links-row">
            <div className="stream-links-label">RTMP Server</div>
            <div className="stream-links-value">{safeRtmp ? safeRtmp.replace(/\/[^/]+$/, "/") : "—"}</div>
            <button
              className="copy-btn"
              onClick={() => {
                try {
                  navigator.clipboard.writeText(safeRtmp);
                } catch {
                  // noop
                }
              }}
            >
              Copy
            </button>
          </div>

          <div className="stream-links-row">
            <div className="stream-links-label">Stream Key</div>
            <div className="stream-links-value mono">{stream.streamKey}</div>
            <button className="copy-btn" onClick={() => navigator.clipboard.writeText(stream.streamKey)}>
              Copy
            </button>
          </div>

          <div className="stream-links-row">
            <div className="stream-links-label">RTMP Server + Key</div>
            <div className="stream-links-value">{safeRtmp ? `${safeRtmp}${stream.streamKey}` : "—"}</div>
            <button className="copy-btn" onClick={() => navigator.clipboard.writeText(safeRtmp ? `${safeRtmp}${stream.streamKey}` : "")}>
              Copy
            </button>
          </div>

          <div className="stream-links-row">
            <div className="stream-links-label">HLS URL</div>
            <div className="stream-links-value">{safeHls || "—"}</div>
            <button className="copy-btn" onClick={() => navigator.clipboard.writeText(safeHls || "")}>Copy</button>
          </div>
        </div>
      )}
    </div>
  );
}
