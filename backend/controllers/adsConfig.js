// controllers/adsConfig.js
//
// Ad settings for the frontend, read from env at runtime so they can be
// changed on Render without rebuilding the app:
//   ADS_ENABLED               → "false" turns every ad off
//   ADSENSE_CLIENT            → AdSense publisher ID (ca-pub-...)
//   ADSENSE_SLOT_BOTTOM       → ad unit ID for the small banner at the bottom of every page
//   ADSENSE_SLOT_INLINE       → ad unit ID for banners inside pages (results, current affairs)
//   VIDEO_AD_TAG_URL          → VAST video ad tag (Google Ad Manager or any video ad network),
//                               played when a student submits a test
//   AD_BREAK_MIN_GAP_SECONDS  → minimum time between two video ads for one student (default 60)
const DEFAULT_CLIENT = "ca-pub-2902001191700540";

const env = (key) => String(process.env[key] || "").trim();
const slotId = (key) => (/^\d{6,20}$/.test(env(key)) ? env(key) : "");

export const getAdsConfig = (req, res) => {
  const enabled = env("ADS_ENABLED").toLowerCase() !== "false";
  const client = /^ca-pub-\d{10,20}$/.test(env("ADSENSE_CLIENT")) ? env("ADSENSE_CLIENT") : DEFAULT_CLIENT;
  const videoAdTagUrl = /^https:\/\//i.test(env("VIDEO_AD_TAG_URL")) ? env("VIDEO_AD_TAG_URL") : "";
  const gap = env("AD_BREAK_MIN_GAP_SECONDS") === "" ? NaN : Number(env("AD_BREAK_MIN_GAP_SECONDS"));

  res.set("Cache-Control", "public, max-age=300");
  return res.status(200).json({
    success: true,
    data: enabled
      ? {
          enabled: true,
          client,
          slots: { bottom: slotId("ADSENSE_SLOT_BOTTOM"), inline: slotId("ADSENSE_SLOT_INLINE") },
          videoAdTagUrl,
          adBreakMinGapSeconds: Number.isFinite(gap) && gap >= 0 ? Math.min(gap, 3600) : 60,
        }
      : { enabled: false, client, slots: { bottom: "", inline: "" }, videoAdTagUrl: "", adBreakMinGapSeconds: 60 },
  });
};
