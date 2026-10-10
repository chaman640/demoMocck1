// ads/adBreak.js — "ad break": a short video ad shown when a student submits a test.
// Pages call showAdBreak(); <AdBreakHost /> (mounted once in App) plays the ad.
// The submit itself never waits for the ad — the result loads behind it.
import { loadAdsConfig } from "./adsConfig";

const listeners = new Set();
const LAST_KEY = "antim-last-ad-break";

export const onAdBreak = (fn) => {
  listeners.add(fn);
  return () => listeners.delete(fn);
};

const lastShownAt = () => {
  try {
    return Number(sessionStorage.getItem(LAST_KEY)) || 0;
  } catch {
    return 0;
  }
};

/**
 * Shows a video ad if ads are set up. Resolves (true/false) when the ad is
 * over or skipped, so callers that want to wait (e.g. "watch ad for boost") can.
 * force: ignore the minimum gap between two ads. message: line shown above the ad.
 */
export const showAdBreak = async ({ force = false, message = "Your result is ready right after this ad" } = {}) => {
  const cfg = await loadAdsConfig();
  if (!cfg.enabled || !cfg.videoAdTagUrl || listeners.size === 0) return false;
  if (!force && Date.now() - lastShownAt() < (cfg.adBreakMinGapSeconds || 0) * 1000) return false;
  try {
    sessionStorage.setItem(LAST_KEY, String(Date.now()));
  } catch {
    /* ignore */
  }
  return new Promise((resolve) => {
    const [first] = listeners;
    first({ id: Date.now(), tagUrl: cfg.videoAdTagUrl, message, done: resolve });
  });
};
