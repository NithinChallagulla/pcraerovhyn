import { useEffect, useRef } from "react";
import Hls from "hls.js";
import type { Stream } from "../config";

interface Props {
  stream: Stream;
}

export default function StreamCard({ stream }: Props) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const hlsRef = useRef<Hls | null>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const url = stream.hlsUrl;
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

      hls.on(Hls.Events.ERROR, (_event, data) => {
        console.error("HLS error for", stream.streamKey, data);
      });
    } else if (video.canPlayType("application/vnd.apple.mpegurl")) {
      video.src = url;
      video.addEventListener("canplay", () => {
        video
          .play()
          .then(() => console.log("Native HLS playing", stream.streamKey))
          .catch((err) => console.error("Native HLS autoplay error", err));
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
      <div className="stream-header">
        <span className="live-pill">LIVE</span>
        <div className="stream-meta">
          <div className="stream-title">{stream.pilotName || "Unknown Pilot"}</div>
          <div className="stream-subtitle">{stream.place || "Unknown Location"}</div>
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
          <button onClick={handlePiP}>Pop-out</button>
        </div>
      </div>

      <div className="stream-footer">
        <span className="stream-key-label">Key:</span>
        <span className="stream-key-value">{stream.streamKey}</span>
      </div>
    </div>
  );
}
