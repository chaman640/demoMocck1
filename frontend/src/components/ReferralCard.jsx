// components/ReferralCard.jsx — Profile page par "Dost ko bulao, 50 coins pao"
import { useState } from "react";
import { referralShareText, useReferral } from "../utils/referral";

const ReferralCard = () => {
  const { data: ref, isLoading, isError } = useReferral();
  const [copied, setCopied] = useState("");

  if (isLoading) return <div className="h-40 rounded-2xl bg-gray-800/70 animate-pulse mb-3" />;
  if (isError || !ref) return null;

  const copy = async (text, which) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(which);
      setTimeout(() => setCopied(""), 2000);
    } catch {
      window.prompt("Copy karein:", text);
    }
  };

  const shareNative = async () => {
    const text = referralShareText(ref);
    if (navigator.share) {
      try {
        await navigator.share({ title: "AntimPrayash.in", text });
        return;
      } catch {
        /* user ne cancel kiya — WhatsApp par bhej dete hain */
      }
    }
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank", "noopener");
  };

  return (
    <div className="bg-gradient-to-br from-[#7C3AED]/20 to-[#111827] border border-[#7C3AED]/30 rounded-2xl p-4 mb-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-bold text-white">🎁 Dost ko bulao, {ref.bonusCoins} coins pao</p>
          <p className="text-[11px] text-gray-400 mt-1 leading-relaxed">
            Dost aapke code se signup kare aur apna pehla test poora kare — aapko {ref.bonusCoins} coins milenge.
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2 mt-4">
        <div className="flex-1 px-3 py-2.5 rounded-xl bg-[#0A0D14] border border-gray-700 text-center">
          <p className="text-[10px] text-gray-500 uppercase tracking-wider">Aapka code</p>
          <p className="text-lg font-bold font-mono tracking-widest text-[#C4B5FD]">{ref.code}</p>
        </div>
        <button
          onClick={() => copy(ref.code, "code")}
          className="px-3 py-3 rounded-xl border border-gray-700 text-xs font-semibold text-gray-200"
        >
          {copied === "code" ? "Copied!" : "Copy"}
        </button>
      </div>

      <div className="grid grid-cols-2 gap-2 mt-3">
        <button
          onClick={() => window.open(`https://wa.me/?text=${encodeURIComponent(referralShareText(ref))}`, "_blank", "noopener")}
          className="py-2.5 rounded-xl bg-[#25D366] text-black text-xs font-bold"
        >
          WhatsApp par bhejein
        </button>
        <button onClick={shareNative} className="py-2.5 rounded-xl bg-[#7C3AED] text-white text-xs font-bold">
          Share / Link
        </button>
      </div>
      <button
        onClick={() => copy(ref.link, "link")}
        className="w-full mt-2 py-2 rounded-xl text-[11px] text-gray-400 hover:text-gray-200 truncate"
      >
        {copied === "link" ? "Link copy ho gaya!" : ref.link}
      </button>

      <div className="grid grid-cols-3 gap-2 mt-3 text-center">
        <div className="rounded-xl bg-[#0A0D14]/70 py-2">
          <p className="text-base font-bold text-white">{ref.joinedCount}</p>
          <p className="text-[10px] text-gray-500">Dost jude</p>
        </div>
        <div className="rounded-xl bg-[#0A0D14]/70 py-2">
          <p className="text-base font-bold text-amber-300">{ref.pendingCount}</p>
          <p className="text-[10px] text-gray-500">Test baaki</p>
        </div>
        <div className="rounded-xl bg-[#0A0D14]/70 py-2">
          <p className="text-base font-bold text-green-400">🪙 {ref.coinsEarned}</p>
          <p className="text-[10px] text-gray-500">Coins mile</p>
        </div>
      </div>
    </div>
  );
};

export default ReferralCard;
