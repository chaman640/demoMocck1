// components/PageBottomAd.jsx
//
// Small ad strip at the bottom of every student page. It sits just above the
// bottom navigation bar (if the page has one) and loads a new ad every time
// the page changes. The student can close it for the current page.
import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import AdBanner from "./AdBanner";
import { useAdsConfig } from "../ads/adsConfig";

// Full-screen tools and staff pages: no bottom ad
const NO_AD_PREFIXES = [
  "/reader",
  "/admin",
  "/promoter",
  "/teacher",
  "/acceptinvite",
  "/managebooks",
  "/managebookorders",
  "/managenotes",
];

const AD_HEIGHT = 58; // 50px ad + padding

const PageBottomAd = () => {
  const { pathname } = useLocation();
  const ads = useAdsConfig();
  const [closedOn, setClosedOn] = useState(null);
  const [navHeight, setNavHeight] = useState(0);

  const lower = pathname.toLowerCase();
  const allowed = !NO_AD_PREFIXES.some((p) => lower.startsWith(p));
  const visible = allowed && ads.enabled && Boolean(ads.slots?.bottom) && closedOn !== pathname;

  // Sit above the page's bottom nav, if it has one
  useEffect(() => {
    if (!visible) return;
    const measure = () => {
      const nav = document.querySelector("[data-bottom-nav]");
      setNavHeight(nav ? Math.round(nav.getBoundingClientRect().height) : 0);
    };
    const raf = requestAnimationFrame(measure);
    const t = setInterval(measure, 1000);
    return () => {
      cancelAnimationFrame(raf);
      clearInterval(t);
    };
  }, [visible, pathname]);

  // Leave room at the end of the page so the ad never covers content
  useEffect(() => {
    if (!visible) return;
    const prev = document.body.style.paddingBottom;
    document.body.style.paddingBottom = `${AD_HEIGHT}px`;
    return () => {
      document.body.style.paddingBottom = prev;
    };
  }, [visible]);

  if (!visible) return null;

  return (
    <div
      className="fixed left-0 right-0 z-40 bg-[#0A0D14] border-t border-gray-800"
      style={{ bottom: navHeight, height: AD_HEIGHT }}
      aria-label="Advertisement"
    >
      <div className="relative max-w-3xl mx-auto h-full px-1 pt-1">
        <span className="absolute left-1 top-0 text-[8px] leading-none text-gray-600 z-10">Ad</span>
        <button
          onClick={() => setClosedOn(pathname)}
          className="absolute right-0 -top-5 w-6 h-5 rounded-t-md bg-[#0A0D14] border border-b-0 border-gray-800 text-gray-400 text-xs leading-none z-10"
          aria-label="Close ad"
        >
          ×
        </button>
        {/* key = page path → a fresh ad loads on every page change */}
        <AdBanner key={pathname} slot="bottom" compact />
      </div>
    </div>
  );
};

export default PageBottomAd;
