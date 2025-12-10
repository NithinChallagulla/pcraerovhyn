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

    // 🔐 Build final HLS URL
    //  - In dev: use whatever backend sent (full http://34.93...)
    //  - In Netlify: ALWAYS use /hls/<streamKey>.m3u8 so it goes
    //    through our Netlify proxy and stays HTTPS for the browser.
    const url = isProd
      ? `/hls/${stream.streamKey}.m3u8`
      : stream.hlsUrl;

    console.log("Final HLS URL being used:", url);

    if (Hls.isSupported()) {
      const hls = new Hls({
        maxBufferLength: 10,
        liveDurationInfinity: true,
      });

      hlsRef.current = hls;
      hls.loadSource(url);
      hls.attachMedia(video);

      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        video
          .play()
          .then(() => console.log("HLS playing", stream.streamKey))
          .catch((err) =>
            console.error("HLS autoplay error", stream.streamKey, err)
          );
      });

      hls.on(Hls.Events.ERROR, (_event, data) => {
        console.error("HLS error for", stream.streamKey, data);
      });
    } else if (video.canPlayType("application/vnd.apple.mpegurl")) {
      video.src = url;
      const onCanPlay = () => {
        video
          .play()
          .then(() => console.log("Native HLS playing", stream.streamKey))
          .catch((err) =>
            console.error("Native HLS autoplay error", stream.streamKey, err)
          );
      };
      video.addEventListener("canplay", onCanPlay);

      const onError = () => {
        console.error("Native HLS video error", video.error);
      };
      video.addEventListener("error", onError);

      return () => {
        video.removeEventListener("canplay", onCanPlay);
        video.removeEventListener("error", onError);
      };
    } else {
      console.error("HLS not supported in this browser");
    }

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
