import React, { useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { vibrateReward } from "../utils/vibrate";

const Bolts = ({ big }) => (
  <>
    <div className="bolt-main absolute select-none" style={{ fontSize: big ? "9rem" : "6rem" }}>⚡</div>
    {big && (
      <>
        <div className="bolt-side absolute select-none text-6xl" style={{ left: "12%", top: "28%" }}>⚡</div>
        <div className="bolt-side absolute select-none text-6xl" style={{ right: "12%", top: "34%", animationDelay: "0.12s" }}>⚡</div>
      </>
    )}
  </>
);

const CoinRewardListener = () => {
  const queryClient = useQueryClient();
  const [popup, setPopup] = useState(null);
  const timerRef = useRef(null);

  useEffect(() => {
    const show = (payload) => {
      setPopup({ ...payload, id: Date.now() });
      vibrateReward();
      clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => setPopup(null), 2600);
    };
    const onCoins = (e) => {
      queryClient.invalidateQueries({ queryKey: ["rewards-summary"] });
      show({ kind: "coins", ...e.detail });
    };
    const onBoost = (e) => {
      queryClient.invalidateQueries({ queryKey: ["rewards-summary"] });
      show({ kind: "boost", minutes: e.detail?.minutes });
    };
    window.addEventListener("coin-earned", onCoins);
    window.addEventListener("boost-activated", onBoost);
    return () => {
      window.removeEventListener("coin-earned", onCoins);
      window.removeEventListener("boost-activated", onBoost);
      clearTimeout(timerRef.current);
    };
  }, [queryClient]);

  if (!popup) return null;

  const big = popup.kind === "boost" || popup.isBoosted || popup.isStreakBonus;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center pointer-events-none overflow-hidden">
      <style>{`
        @keyframes coinPopIn {
          0% { transform: scale(0.4) translateY(20px); opacity: 0; }
          55% { transform: scale(1.08) translateY(0); opacity: 1; }
          75% { transform: scale(0.97); }
          100% { transform: scale(1); opacity: 1; }
        }
        @keyframes coinPopOut { to { transform: scale(0.85) translateY(-10px); opacity: 0; } }
        @keyframes boltStrike {
          0% { transform: scale(0.2) rotate(-12deg); opacity: 0; }
          25% { transform: scale(1.15) rotate(6deg); opacity: 1; }
          45% { opacity: 0.25; }
          60% { opacity: 1; }
          100% { transform: scale(1.5) rotate(14deg); opacity: 0; }
        }
        @keyframes screenFlash { 0% { opacity: 0.55; } 100% { opacity: 0; } }
        .coin-card { animation: coinPopIn 0.45s cubic-bezier(0.34, 1.56, 0.64, 1) forwards, coinPopOut 0.4s ease-in forwards 2.1s; }
        .bolt-main { animation: boltStrike 0.85s ease-out forwards; }
        .bolt-side { animation: boltStrike 0.85s ease-out forwards; }
        .screen-flash { animation: screenFlash 0.5s ease-out forwards; }
        @media (prefers-reduced-motion: reduce) {
          .bolt-main, .bolt-side, .screen-flash { animation: none; opacity: 0; }
          .coin-card { animation: none; }
        }
      `}</style>

      <div className="absolute inset-0 bg-black/40" />
      <div key={`flash-${popup.id}`} className="screen-flash absolute inset-0 bg-cyan-200" />
      <div key={`bolt-${popup.id}`} className="absolute inset-0 flex items-center justify-center">
        <Bolts big={big} />
      </div>

      <div
        key={popup.id}
        className="coin-card relative bg-gradient-to-br from-[#7C3AED] to-[#5B21B6] rounded-3xl px-8 py-7 shadow-2xl shadow-purple-900/50 text-center border border-white/10 mx-6"
      >
        {popup.kind === "boost" ? (
          <>
            <div className="text-5xl mb-2">⚡</div>
            <p className="text-2xl font-extrabold text-white mb-1">2x Boost ON!</p>
            <p className="text-sm text-purple-200 font-medium">
              {popup.minutes ? `Agle ${popup.minutes} minute tak double coins` : "Double coins active"}
            </p>
          </>
        ) : (
          <>
            <div className="text-5xl mb-2">🪙</div>
            <p className="text-3xl font-extrabold text-white mb-1">+{popup.amount}</p>
            <p className="text-sm text-purple-200 font-medium">Coins mile!</p>
            {popup.isStreakBonus && (
              <div className="mt-3 inline-flex items-center gap-1.5 bg-orange-500/20 border border-orange-400/40 rounded-full px-3 py-1">
                <span className="text-base">🔥</span>
                <span className="text-xs font-bold text-orange-300">{popup.newStreak}-din streak!</span>
              </div>
            )}
            {popup.isBoosted && (
              <div className="mt-2 inline-flex items-center gap-1 bg-cyan-500/20 border border-cyan-400/40 rounded-full px-3 py-1 ml-2">
                <span className="text-xs font-bold text-cyan-300">⚡ 2x Boost</span>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default CoinRewardListener;
