import { useEffect, useRef, useState } from "react";
import { useAdsConfig } from "../ads/adsConfig";

const MIN_REFRESH_GAP_MS = 5000;

/**
 * Google AdSense banner.
 * slot: "inline" | "bottom" (ad unit IDs come from the server's ad settings)
 * refreshTrigger: change it to load a new ad (at most once every 5 seconds)
 * Renders nothing when ads are off or the ad unit ID is not set.
 */
const AdBanner = ({ slot = "inline", refreshTrigger, className = "", compact = false }) => {
  const ads = useAdsConfig();
  const slotId = ads.enabled ? ads.slots?.[slot] : "";
  const [instanceKey, setInstanceKey] = useState(0);
  const lastPushRef = useRef(0);
  const isFirstRender = useRef(true);
  const pendingRefreshRef = useRef(false);

  useEffect(() => {
    if (!slotId) return;
    try {
      (window.adsbygoogle = window.adsbygoogle || []).push({});
      lastPushRef.current = Date.now();
    } catch {
      /* ad blocker or script not loaded — nothing to do */
    }
  }, [instanceKey, slotId]);

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    const elapsed = Date.now() - lastPushRef.current;
    if (elapsed >= MIN_REFRESH_GAP_MS) {
      setInstanceKey((k) => k + 1);
      return;
    }
    if (pendingRefreshRef.current) return;
    pendingRefreshRef.current = true;
    const t = setTimeout(() => {
      pendingRefreshRef.current = false;
      setInstanceKey((k) => k + 1);
    }, MIN_REFRESH_GAP_MS - elapsed);
    return () => clearTimeout(t);
  }, [refreshTrigger]);

  if (!slotId) return null;

  return (
    <div className={className}>
      <ins
        key={instanceKey}
        className="adsbygoogle"
        style={compact ? { display: "block", width: "100%", height: 50 } : { display: "block" }}
        data-ad-client={ads.client}
        data-ad-slot={slotId}
        {...(compact ? { "data-ad-format": "horizontal", "data-full-width-responsive": "false" } : { "data-ad-format": "auto", "data-full-width-responsive": "true" })}
      />
    </div>
  );
};

export default AdBanner;
