// components/ShareResultButton.jsx
//
// Test ke baad "Result share karo" — ek sundar image (score, sahi/galat,
// accuracy + student ka referral code) banti hai jo WhatsApp / Instagram par
// seedhe share ho sakti hai. Har share = naye students ka rasta.
import { useState } from "react";
import { useReferral } from "../utils/referral";

const W = 1080;
const H = 1350;

const roundRect = (ctx, x, y, w, h, r) => {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
};

const fitText = (ctx, text, maxWidth, startSize, weight = "700") => {
  let size = startSize;
  do {
    ctx.font = `${weight} ${size}px system-ui, -apple-system, "Segoe UI", Roboto, sans-serif`;
    size -= 2;
  } while (ctx.measureText(text).width > maxWidth && size > 20);
};

const drawCard = ({ title, score, maxScore, correct, wrong, unattempted, extraLine, refCode }) => {
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d");

  const bg = ctx.createLinearGradient(0, 0, W, H);
  bg.addColorStop(0, "#1E1145");
  bg.addColorStop(0.55, "#0F1221");
  bg.addColorStop(1, "#0A0D14");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);

  // Glow
  const glow = ctx.createRadialGradient(W * 0.8, 160, 20, W * 0.8, 160, 520);
  glow.addColorStop(0, "rgba(124,58,237,0.45)");
  glow.addColorStop(1, "rgba(124,58,237,0)");
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, W, H);

  ctx.textAlign = "left";
  ctx.fillStyle = "#C4B5FD";
  ctx.font = "700 40px system-ui, -apple-system, Segoe UI, Roboto, sans-serif";
  ctx.fillText("AntimPrayash.in", 90, 130);

  ctx.fillStyle = "#94A3B8";
  ctx.font = "500 34px system-ui, -apple-system, Segoe UI, Roboto, sans-serif";
  ctx.fillText("Mera test result", 90, 250);

  ctx.fillStyle = "#FFFFFF";
  fitText(ctx, title || "Mock Test", W - 180, 60);
  ctx.fillText(title || "Mock Test", 90, 325);

  // Score panel
  roundRect(ctx, 90, 390, W - 180, 360, 40);
  ctx.fillStyle = "rgba(255,255,255,0.06)";
  ctx.fill();
  ctx.strokeStyle = "rgba(167,139,250,0.35)";
  ctx.lineWidth = 3;
  ctx.stroke();

  ctx.textAlign = "center";
  ctx.fillStyle = "#A78BFA";
  const scoreText = maxScore ? `${score}` : `${score}`;
  ctx.font = "800 190px system-ui, -apple-system, Segoe UI, Roboto, sans-serif";
  ctx.fillText(scoreText, W / 2, 620);
  ctx.fillStyle = "#94A3B8";
  ctx.font = "500 40px system-ui, -apple-system, Segoe UI, Roboto, sans-serif";
  ctx.fillText(maxScore ? `Score (out of ${maxScore})` : "Total Score", W / 2, 700);

  // Stat tiles
  const attempted = (correct || 0) + (wrong || 0);
  const accuracy = attempted ? Math.round(((correct || 0) / attempted) * 100) : 0;
  const tiles = [
    { label: "Sahi", value: correct ?? 0, color: "#4ADE80" },
    { label: "Galat", value: wrong ?? 0, color: "#F87171" },
    { label: "Chhode", value: unattempted ?? 0, color: "#CBD5E1" },
    { label: "Accuracy", value: `${accuracy}%`, color: "#FBBF24" },
  ];
  const gap = 24;
  const tileW = (W - 180 - gap * 3) / 4;
  tiles.forEach((t, i) => {
    const x = 90 + i * (tileW + gap);
    roundRect(ctx, x, 790, tileW, 190, 28);
    ctx.fillStyle = "rgba(255,255,255,0.05)";
    ctx.fill();
    ctx.fillStyle = t.color;
    ctx.font = "800 64px system-ui, -apple-system, Segoe UI, Roboto, sans-serif";
    ctx.fillText(String(t.value), x + tileW / 2, 890);
    ctx.fillStyle = "#94A3B8";
    ctx.font = "500 30px system-ui, -apple-system, Segoe UI, Roboto, sans-serif";
    ctx.fillText(t.label, x + tileW / 2, 945);
  });

  if (extraLine) {
    ctx.fillStyle = "#FDE68A";
    fitText(ctx, extraLine, W - 180, 44, "700");
    ctx.fillText(extraLine, W / 2, 1050);
  }

  // Footer — invite
  roundRect(ctx, 90, 1110, W - 180, 160, 36);
  ctx.fillStyle = "#7C3AED";
  ctx.fill();
  ctx.fillStyle = "#FFFFFF";
  ctx.font = "700 40px system-ui, -apple-system, Segoe UI, Roboto, sans-serif";
  ctx.fillText("Tum bhi try karo — free mock tests!", W / 2, 1180);
  ctx.font = "600 34px system-ui, -apple-system, Segoe UI, Roboto, sans-serif";
  ctx.fillStyle = "#EDE9FE";
  ctx.fillText(refCode ? `Signup par code daalo: ${refCode}` : "AntimPrayash.in", W / 2, 1235);

  return canvas;
};

const toBlob = (canvas) => new Promise((resolve) => canvas.toBlob(resolve, "image/png"));

const ShareResultButton = ({ title, score, maxScore, correct, wrong, unattempted, extraLine, className = "" }) => {
  const { data: ref } = useReferral();
  const [busy, setBusy] = useState(false);
  const [preview, setPreview] = useState(null); // { url, file }

  const shareText = () => {
    const base = `Maine "${title || "Mock Test"}" mein ${score}${maxScore ? `/${maxScore}` : ""} score kiya! 📚`;
    return ref ? `${base}\nTum bhi try karo — mera code: ${ref.code}\n${ref.link}` : `${base}\nAntimPrayash.in`;
  };

  const handleShare = async () => {
    setBusy(true);
    try {
      const canvas = drawCard({ title, score, maxScore, correct, wrong, unattempted, extraLine, refCode: ref?.code });
      const blob = await toBlob(canvas);
      const file = new File([blob], "my-result.png", { type: "image/png" });
      const text = shareText();

      if (navigator.canShare?.({ files: [file] })) {
        try {
          await navigator.share({ files: [file], text, title: "Mera result" });
          return;
        } catch (err) {
          if (err?.name === "AbortError") return; // user ne khud cancel kiya
        }
      }
      // Desktop / purane browser: image dikhao + download / WhatsApp
      setPreview({ url: URL.createObjectURL(blob), text });
    } finally {
      setBusy(false);
    }
  };

  const closePreview = () => {
    if (preview?.url) URL.revokeObjectURL(preview.url);
    setPreview(null);
  };

  return (
    <>
      <button
        onClick={handleShare}
        disabled={busy}
        className={`w-full py-3 rounded-xl bg-[#25D366] hover:bg-[#1FBD5A] text-black font-bold text-sm transition-colors disabled:opacity-60 ${className}`}
      >
        {busy ? "Card ban raha hai..." : "📤 Result share karein"}
      </button>

      {preview && (
        <div className="fixed inset-0 z-[70] bg-black/80 flex items-center justify-center p-4" onClick={closePreview}>
          <div className="w-full max-w-sm bg-[#111827] border border-gray-800 rounded-2xl p-4 space-y-3" onClick={(e) => e.stopPropagation()}>
            <img src={preview.url} alt="Result card" className="w-full rounded-xl" />
            <div className="grid grid-cols-2 gap-2">
              <a
                href={preview.url}
                download="my-result.png"
                className="py-2.5 rounded-xl border border-gray-700 text-center text-xs font-semibold text-gray-200"
              >
                Image download
              </a>
              <a
                href={`https://wa.me/?text=${encodeURIComponent(preview.text)}`}
                target="_blank"
                rel="noreferrer"
                className="py-2.5 rounded-xl bg-[#25D366] text-center text-xs font-bold text-black"
              >
                WhatsApp
              </a>
            </div>
            <p className="text-[11px] text-gray-500 text-center">Image download karke WhatsApp status / Instagram par lagayein.</p>
            <button onClick={closePreview} className="w-full py-2 text-xs text-gray-400">
              Band karein
            </button>
          </div>
        </div>
      )}
    </>
  );
};

export default ShareResultButton;
