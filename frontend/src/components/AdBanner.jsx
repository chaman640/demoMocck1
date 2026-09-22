import React, { useEffect, useRef, useState } from "react";

const AD_CLIENT = "ca-pub-XXXXXXXXXXXXXXXX";
const MIN_REFRESH_GAP_MS = 5000;

const AdBanner = ({ adSlot, refreshTrigger, className = "" }) => {
  const [instanceKey, setInstanceKey] = useState(0);
  const lastPushRef = useRef(0);
  const isFirstRender = useRef(true);
  const pendingRefreshRef = useRef(false);

  const pushAd = () => {
    try {
      (window.adsbygoogle = window.adsbygoogle || []).push({});
      lastPushRef.current = Date.now();
    } catch (e) {}
  };

  useEffect(() => {
    pushAd();
  }, [instanceKey]);

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
    const wait = MIN_REFRESH_GAP_MS - elapsed;
    const t = setTimeout(() => {
      pendingRefreshRef.current = false;
      setInstanceKey((k) => k + 1);
    }, wait);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refreshTrigger]);

  return (
    <div className={className}>
      <ins
        key={instanceKey}
        className="adsbygoogle"
        style={{ display: "block" }}
        data-ad-client={AD_CLIENT}
        data-ad-slot={adSlot}
        data-ad-format="auto"
        data-full-width-responsive="true"
      />
    </div>
  );
};

export default AdBanner;
