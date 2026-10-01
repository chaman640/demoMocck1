// components/OfflineSync.jsx
//
// 1. App khulte hi / internet wapas aate hi saved books-notes ki offline
//    permission sync karta hai (15 din aage, ya access khatam to hatao).
// 2. Internet na ho to neeche chhota sa banner — "My Downloads" ka seedha rasta.
import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { syncOffline } from "../offline/offlineStore";

const HIDE_BANNER_ON = ["/Reader", "/MyDownloads", "/Notes", "/Landing", "/PrivacyPolicy"];

const OfflineSync = () => {
  const [online, setOnline] = useState(navigator.onLine);
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    syncOffline().catch(() => {});
    const goOnline = () => {
      setOnline(true);
      syncOffline().catch(() => {});
    };
    const goOffline = () => setOnline(false);
    window.addEventListener("online", goOnline);
    window.addEventListener("offline", goOffline);
    return () => {
      window.removeEventListener("online", goOnline);
      window.removeEventListener("offline", goOffline);
    };
  }, []);

  if (online || HIDE_BANNER_ON.some((p) => location.pathname.startsWith(p))) return null;

  return (
    <div className="fixed top-0 inset-x-0 z-[60] flex items-center justify-center gap-3 px-4 py-2 bg-amber-500 text-black text-xs font-semibold">
      <span>Aap offline hain.</span>
      <button onClick={() => navigate("/MyDownloads")} className="underline">
        Saved books & notes padhein →
      </button>
    </div>
  );
};

export default OfflineSync;
