// src/components/StreamCard.tsx
import { useEffect, useRef } from "react";
import Hls from "hls.js";
import type { Stream } from "../config";

interface Props {
  stream: Stream;
}

const isProd = import.meta.env.PROD;

export default function StreamCard({ stream }: Props) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const hlsRef = useRef<Hls | null>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    // 🔐 Build a browser-safe HLS URL
    let url = stream.hlsUrl;

    if (isProd) {
      // In Netlify, convert "http://34.93.170.150/hls/....m3u8"
      // into just "/hls/....m3u8" so Netlify can proxy it over HTTPS.
      try {
        const parsed = new URL(stream.hlsUrl);
        url = parsed.pathname; // e.g. "/hls/EVT-2XL7-KA45.m3u8"
      } catch (err) {
        console.warn("Failed to parse HLS URL, using raw", stream.hlsUrl, err);
      }
    }

    console.log("Attaching HLS for:", stream.streamKey, url);

    if (Hls.isSupported()) {
      const hls = new Hls({
        maxBufferLength: 10,
        liveDurationInfinity: true,
      });

      hlsRef.current = hls;
      hls.loadSource(url);
      hls.attachMedia(video);

      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        console.log("Manifest parsed for", stream.streamKey);
        video
          .play()
          .then(() => {
            console.log("Video playing for", stream.streamKey);
          })
          .catch((err) => {
            console.error("Autoplay error for", stream.streamKey, err);
          });
      });

      // mark event as intentionally unused
      hls.on(Hls.Events.ERROR, (_event, data) => {
        console.error("HLS error for", stream.streamKey, data);
      });
    } else if (video.canPlayType("application/vnd.apple.mpegurl")) {
      // Native HLS (Safari, some browsers)
      video.src = url;
      video.addEventListener("canplay", () => {
        video
          .play()
          .then(() =>
            console.log("Native HLS playing", stream.streamKey)
          )
          .catch((err) =>
            console.error("Native HLS autoplay error", err)
          );
      });
      video.addEventListener("error", () => {
        console.error("Native HLS video error", video.error);
      });
    } else {
      console.error("HLS not supported in this browser");
    }

    // basic error listener
    const onVideoError = () => {
      console.error("Video element error", video.error);
    };
    video.addEventListener("error", onVideoError);

    return () => {
      video.removeEventListener("error", onVideoError);
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
    };
  }, [stream.hlsUrl, stream.streamKey]);

  const handleFullscreen = () => {
    const video = videoRef.current;
    if (!video) return;
    if (video.requestFullscreen) video.requestFullscreen();
  };

  const handlePiP = async () => {
    const video = videoRef.current as any;
    if (!video) return;
    try {
      if (document.pictureInPictureElement) {
        // @ts-ignore
        await document.exitPictureInPicture();
      } else if (video.requestPictureInPicture) {
        await video.requestPictureInPicture();
      }
    } catch (err) {
      console.error("PiP error", err);
    }
  };

  return (
    <div className="stream-card">
      <div className="stream-card-header">
        <span className="status-pill live">LIVE</span>
        <div className="stream-meta">
          <h3>{stream.pilotName || "Unknown Pilot"}</h3>
          <p>{stream.place || "Unknown Location"}</p>
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
        <div className="stream-video-actions">
          <button onClick={handleFullscreen}>Fullscreen</button>
          <button onClick={handlePiP}>Pop-out</button>
        </div>
      </div>

      <div className="stream-footer">
        <span className="label">Key:</span>{" "}
        <span className="mono">{stream.streamKey}</span>
      </div>
    </div>
  );
}
