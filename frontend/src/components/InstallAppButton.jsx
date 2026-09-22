import React, { useEffect, useState } from "react";

const InstallAppButton = ({ className = "" }) => {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [installed, setInstalled] = useState(false);
  const [showHelp, setShowHelp] = useState(false);

  useEffect(() => {
    const isStandalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      window.navigator.standalone === true;
    setInstalled(isStandalone);

    const handler = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    window.addEventListener("beforeinstallprompt", handler);

    const onInstalled = () => {
      setInstalled(true);
      setDeferredPrompt(null);
    };
    window.addEventListener("appinstalled", onInstalled);

    return () => {
      window.removeEventListener("beforeinstallprompt", handler);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  const handleClick = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      await deferredPrompt.userChoice;
      setDeferredPrompt(null);
      return;
    }
    setShowHelp(true);
  };

  if (installed) return null;

  const isIOS = /iphone|ipad|ipod/i.test(window.navigator.userAgent);

  return (
    <>
      <button onClick={handleClick} className={className}>
        <svg className="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
          <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M7 10l5 5 5-5M12 15V3" />
        </svg>
        Download App
      </button>

      {showHelp && (
        <div
          className="fixed inset-0 bg-black/70 flex items-center justify-center px-6 z-50"
          onClick={() => setShowHelp(false)}
        >
          <div
            className="bg-[#111827] border border-gray-800 rounded-2xl p-6 max-w-sm w-full"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-semibold mb-3">Install as an App</h3>
            {isIOS ? (
              <p className="text-sm text-gray-400 leading-relaxed">
                Tap the <b className="text-white">Share</b> icon in Safari's toolbar, then choose{" "}
                <b className="text-white">"Add to Home Screen"</b>.
              </p>
            ) : (
              <p className="text-sm text-gray-400 leading-relaxed">
                Open your browser's menu (⋮) and choose{" "}
                <b className="text-white">"Add to Home Screen"</b> or{" "}
                <b className="text-white">"Install App"</b>.
              </p>
            )}
            <button
              onClick={() => setShowHelp(false)}
              className="w-full mt-5 py-2.5 rounded-lg bg-[#7C3AED] hover:bg-[#6D28D9] text-sm font-medium"
            >
              Got it
            </button>
          </div>
        </div>
      )}
    </>
  );
};

export default InstallAppButton;
