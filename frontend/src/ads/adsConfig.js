// ads/adsConfig.js — ad settings come from the server (/api/ads/config, set via
// Render env), so ad unit IDs can be changed without rebuilding the app.
import { useQuery } from "@tanstack/react-query";
import api from "../api/api";

const OFF = { enabled: false, client: "", slots: { bottom: "", inline: "" }, videoAdTagUrl: "", adBreakMinGapSeconds: 60 };

let pending = null;

/** Promise version (used outside React components, e.g. the video ad break) */
export const loadAdsConfig = () => {
  if (!pending) {
    pending = api
      .get("/ads/config")
      .then((res) => ({ ...OFF, ...res.data.data }))
      .catch(() => {
        pending = null; // try again next time
        return OFF;
      });
  }
  return pending;
};

export const useAdsConfig = () =>
  useQuery({ queryKey: ["ads-config"], queryFn: loadAdsConfig, staleTime: 10 * 60 * 1000, retry: false }).data || OFF;
