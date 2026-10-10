// components/AdBreakHost.jsx
//
// Plays a video ad (VAST tag via the Google IMA SDK) in a full-screen overlay
// when showAdBreak() is called — e.g. right after a test is submitted.
// Safety nets: if the SDK is blocked, there is no ad, or the ad stalls,
// the overlay closes by itself, so a student is never stuck.
import { useCallback, useEffect, useRef, useState } from "react";
import { onAdBreak } from "../ads/adBreak";

const IMA_SRC = "https://imasdk.googleapis.com/js/sdkloader/ima3.js";
const LOAD_TIMEOUT_MS = 8000; // no ad within 8s → close
const HARD_TIMEOUT_MS = 75000; // never keep the overlay longer than this
const CLOSE_BUTTON_AFTER_MS = 30000;

let imaPromise = null;
const loadIma = () => {
  if (window.google?.ima) return Promise.resolve(window.google.ima);
  if (!imaPromise) {
    imaPromise = new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.src = IMA_SRC;
      script.async = true;
      script.onload = () => (window.google?.ima ? resolve(window.google.ima) : reject(new Error("IMA missing")));
      script.onerror = () => reject(new Error("IMA blocked"));
      document.head.appendChild(script);
    }).catch((err) => {
      imaPromise = null;
      throw err;
    });
  }
  return imaPromise;
};

const AdPlayer = ({ tagUrl, message, onFinish }) => {
  const containerRef = useRef(null);
  const videoRef = useRef(null);
  const managerRef = useRef(null);
  const [started, setStarted] = useState(false);
  const [muted, setMuted] = useState(true);
  const [canClose, setCanClose] = useState(false);

  useEffect(() => {
    let finished = false;
    let loader = null;
    let display = null;
    const finish = () => {
      if (finished) return;
      finished = true;
      onFinish();
    };

    const loadTimer = setTimeout(() => {
      if (!managerRef.current) finish();
    }, LOAD_TIMEOUT_MS);
    const hardTimer = setTimeout(finish, HARD_TIMEOUT_MS);
    const closeTimer = setTimeout(() => setCanClose(true), CLOSE_BUTTON_AFTER_MS);

    loadIma()
      .then((ima) => {
        if (finished) return;
        const container = containerRef.current;
        const video = videoRef.current;
        const width = container.clientWidth || 640;
        const height = container.clientHeight || 360;

        display = new ima.AdDisplayContainer(container, video);
        display.initialize();
        loader = new ima.AdsLoader(display);
        loader.addEventListener(ima.AdErrorEvent.Type.AD_ERROR, finish, false);
        loader.addEventListener(
          ima.AdsManagerLoadedEvent.Type.ADS_MANAGER_LOADED,
          (e) => {
            if (finished) return;
            const manager = e.getAdsManager(video);
            managerRef.current = manager;
            manager.addEventListener(ima.AdErrorEvent.Type.AD_ERROR, finish);
            manager.addEventListener(ima.AdEvent.Type.ALL_ADS_COMPLETED, finish);
            manager.addEventListener(ima.AdEvent.Type.CONTENT_RESUME_REQUESTED, finish);
            manager.addEventListener(ima.AdEvent.Type.SKIPPED, finish);
            manager.addEventListener(ima.AdEvent.Type.STARTED, () => setStarted(true));
            try {
              manager.init(width, height, ima.ViewMode.NORMAL);
              manager.setVolume(0);
              manager.start();
            } catch {
              finish();
            }
          },
          false
        );

        const request = new ima.AdsRequest();
        request.adTagUrl = tagUrl;
        request.linearAdSlotWidth = width;
        request.linearAdSlotHeight = height;
        request.nonLinearAdSlotWidth = width;
        request.nonLinearAdSlotHeight = Math.round(height / 3);
        request.setAdWillAutoPlay?.(true);
        request.setAdWillPlayMuted?.(true);
        loader.requestAds(request);
      })
      .catch(finish);

    return () => {
      finished = true;
      clearTimeout(loadTimer);
      clearTimeout(hardTimer);
      clearTimeout(closeTimer);
      try {
        managerRef.current?.destroy();
        loader?.destroy();
        display?.destroy();
      } catch {
        /* ignore */
      }
      managerRef.current = null;
    };
  }, [tagUrl, onFinish]);

  const toggleSound = () => {
    const next = !muted;
    setMuted(next);
    try {
      managerRef.current?.setVolume(next ? 0 : 1);
    } catch {
      /* ignore */
    }
  };

  return (
    <div className="fixed inset-0 z-[90] bg-black/95 flex flex-col items-center justify-center px-3">
      <div className="w-full max-w-2xl flex items-center justify-between mb-2 text-xs text-gray-400">
        <span>Advertisement · {message}</span>
        {canClose && (
          <button onClick={onFinish} className="px-3 py-1 rounded-lg border border-gray-600 text-gray-200">
            Close ✕
          </button>
        )}
      </div>
      <div className="relative w-full max-w-2xl aspect-video bg-black rounded-xl overflow-hidden">
        <video ref={videoRef} className="absolute inset-0 w-full h-full" playsInline muted />
        <div ref={containerRef} className="absolute inset-0" />
        {!started && (
          <div className="absolute inset-0 flex items-center justify-center text-gray-500 text-sm pointer-events-none">
            Loading…
          </div>
        )}
      </div>
      {started && (
        <button onClick={toggleSound} className="mt-3 px-4 py-2 rounded-xl bg-white/10 text-white text-sm">
          {muted ? "🔇 Tap for sound" : "🔊 Sound on"}
        </button>
      )}
    </div>
  );
};

const AdBreakHost = () => {
  const [request, setRequest] = useState(null); // { id, tagUrl, message, done }
  const requestRef = useRef(null);

  useEffect(
    () =>
      onAdBreak((req) => {
        if (requestRef.current) {
          req.done(false); // one ad at a time
          return;
        }
        requestRef.current = req;
        setRequest(req);
      }),
    []
  );

  const finish = useCallback(() => {
    const current = requestRef.current;
    requestRef.current = null;
    current?.done(true);
    setRequest(null);
  }, []);

  if (!request) return null;
  return <AdPlayer key={request.id} tagUrl={request.tagUrl} message={request.message} onFinish={finish} />;
};

export default AdBreakHost;
