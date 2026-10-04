// components/YouTubeClassPlayer.jsx
//
// Plays a class video (YouTube live or recording) inside the app and reports
// how long the student actually watched. It talks to the embedded player with
// postMessage (the same protocol the YouTube IFrame API uses), so no external
// script is loaded and the site's Content-Security-Policy stays strict.
import { useEffect, useRef } from "react";

const PLAYER_ORIGIN = "https://www.youtube-nocookie.com";
const FLUSH_EVERY_MS = 20000;
const PLAYING = 1;

const isYouTubeOrigin = (origin) => /^https:\/\/(www\.)?youtube(-nocookie)?\.com$/.test(origin);

const YouTubeClassPlayer = ({ videoId, startAt = 0, live = false, onProgress }) => {
  const iframeRef = useRef(null);
  const state = useRef({ playing: false, heardFromPlayer: false, position: 0, duration: 0, watched: 0 });
  const onProgressRef = useRef(onProgress);

  useEffect(() => {
    onProgressRef.current = onProgress;
  }, [onProgress]);

  useEffect(() => {
    const s = state.current;
    s.playing = false;
    s.heardFromPlayer = false;
    s.watched = 0;

    const post = (payload) => {
      try {
        iframeRef.current?.contentWindow?.postMessage(JSON.stringify(payload), PLAYER_ORIGIN);
      } catch {
        /* player not ready yet */
      }
    };

    // Ask the player to start sending updates; repeat until it answers
    const listen = () => post({ event: "listening", id: 1, channel: "widget" });
    const handshake = setInterval(() => {
      if (s.heardFromPlayer) clearInterval(handshake);
      else listen();
    }, 1000);

    const onMessage = (e) => {
      if (!isYouTubeOrigin(e.origin) || e.source !== iframeRef.current?.contentWindow) return;
      let data;
      try {
        data = typeof e.data === "string" ? JSON.parse(e.data) : e.data;
      } catch {
        return;
      }
      if (!data || typeof data !== "object") return;
      s.heardFromPlayer = true;
      if (data.event === "onStateChange" && typeof data.info === "number") s.playing = data.info === PLAYING;
      if ((data.event === "infoDelivery" || data.event === "initialDelivery") && data.info) {
        if (typeof data.info.playerState === "number") s.playing = data.info.playerState === PLAYING;
        if (typeof data.info.currentTime === "number") s.position = data.info.currentTime;
        if (typeof data.info.duration === "number" && data.info.duration > 0) s.duration = data.info.duration;
      }
    };
    window.addEventListener("message", onMessage);

    const startedAt = Date.now();
    const tick = setInterval(() => {
      if (document.visibilityState !== "visible") return;
      // If the player never talks to us (blocked/old browser), count visible time instead
      const fallback = !s.heardFromPlayer && Date.now() - startedAt > 15000;
      if (s.playing || fallback) s.watched += 1;
    }, 1000);

    const flush = () => {
      if (s.watched < 1) return;
      const watched = s.watched;
      s.watched = 0;
      onProgressRef.current?.({ watched, position: s.position, duration: s.duration });
    };
    const flusher = setInterval(flush, FLUSH_EVERY_MS);
    const onHide = () => {
      if (document.visibilityState === "hidden") flush();
    };
    document.addEventListener("visibilitychange", onHide);

    return () => {
      clearInterval(handshake);
      clearInterval(tick);
      clearInterval(flusher);
      window.removeEventListener("message", onMessage);
      document.removeEventListener("visibilitychange", onHide);
      flush();
    };
  }, [videoId]);

  const params = new URLSearchParams({
    enablejsapi: "1",
    rel: "0",
    modestbranding: "1",
    playsinline: "1",
    origin: window.location.origin,
  });
  if (live) params.set("autoplay", "1");
  if (!live && startAt > 5) params.set("start", String(Math.floor(startAt)));

  return (
    <div className="relative w-full aspect-video bg-black rounded-2xl overflow-hidden border border-gray-800">
      <iframe
        ref={iframeRef}
        title="Class video"
        src={`${PLAYER_ORIGIN}/embed/${videoId}?${params.toString()}`}
        className="absolute inset-0 w-full h-full"
        allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture; fullscreen"
        allowFullScreen
        referrerPolicy="strict-origin-when-cross-origin"
        onLoad={() => {
          try {
            iframeRef.current?.contentWindow?.postMessage(JSON.stringify({ event: "listening", id: 1, channel: "widget" }), PLAYER_ORIGIN);
          } catch {
            /* ignore */
          }
        }}
      />
    </div>
  );
};

export default YouTubeClassPlayer;
