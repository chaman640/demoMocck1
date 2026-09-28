import React, { useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { vibrateReward } from "../utils/vibrate";

const CoinRewardListener = () => {
  const queryClient = useQueryClient();
  const [reward, setReward] = useState(null);
  const timerRef = useRef(null);

  useEffect(() => {
    const handler = (e) => {
      setReward({ ...e.detail, id: Date.now() });
      vibrateReward();
      queryClient.invalidateQueries({ queryKey: ["rewards-summary"] });
      clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => setReward(null), 2600);
    };
    window.addEventListener("coin-earned", handler);
    return () => {
      window.removeEventListener("coin-earned", handler);
      clearTimeout(timerRef.current);
    };
  }, [queryClient]);

  if (!reward) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center pointer-events-none">
      <style>{`
        @keyframes coinPopIn {
          0% { transform: scale(0.4) translateY(20px); opacity: 0; }
          55% { transform: scale(1.08) translateY(0); opacity: 1; }
          75% { transform: scale(0.97); }
          100% { transform: scale(1); opacity: 1; }
        }
        @keyframes coinPopOut {
          to { transform: scale(0.85) translateY(-10px); opacity: 0; }
        }
        @keyframes flashRay {
          0% { transform: scale(0.2) rotate(0deg); opacity: 0.9; }
          100% { transform: scale(1.6) rotate(25deg); opacity: 0; }
        }
        .coin-card {
          animation: coinPopIn 0.45s cubic-bezier(0.34, 1.56, 0.64, 1) forwards,
                     coinPopOut 0.4s ease-in forwards 2.1s;
        }
        .coin-flash {
          animation: flashRay 0.7s ease-out forwards;
        }
      `}</style>

      <div className="absolute inset-0 bg-black/40" />

      {reward.isBoosted && (
        <div key={`flash-${reward.id}`} className="coin-flash absolute text-8xl select-none">⚡</div>
      )}

      <div
        key={reward.id}
        className="coin-card relative bg-gradient-to-br from-[#7C3AED] to-[#5B21B6] rounded-3xl px-8 py-7 shadow-2xl shadow-purple-900/50 text-center border border-white/10 mx-6"
      >
        <div className="text-5xl mb-2">🪙</div>
        <p className="text-3xl font-extrabold text-white mb-1">+{reward.amount}</p>
        <p className="text-sm text-purple-200 font-medium">Coins mile!</p>

        {reward.isStreakBonus && (
          <div className="mt-3 inline-flex items-center gap-1.5 bg-orange-500/20 border border-orange-400/40 rounded-full px-3 py-1">
            <span className="text-base">🔥</span>
            <span className="text-xs font-bold text-orange-300">{reward.newStreak}-din streak!</span>
          </div>
        )}
        {reward.isBoosted && (
          <div className="mt-2 inline-flex items-center gap-1 bg-cyan-500/20 border border-cyan-400/40 rounded-full px-3 py-1 ml-2">
            <span className="text-xs font-bold text-cyan-300">⚡ 2x Boost</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default CoinRewardListener;
