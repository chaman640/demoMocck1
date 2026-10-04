// utils/classFormat.js — small display helpers shared by the video class pages

export const formatClassTime = (iso) => {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const now = new Date();
  const tomorrow = new Date(now);
  tomorrow.setDate(now.getDate() + 1);
  const time = d.toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit" });
  if (d.toDateString() === now.toDateString()) return `Today, ${time}`;
  if (d.toDateString() === tomorrow.toDateString()) return `Tomorrow, ${time}`;
  return `${d.toLocaleDateString("en-IN", { day: "numeric", month: "short" })}, ${time}`;
};

/** "2026-10-05T18:30" for <input type="datetime-local"> from an ISO date */
export const toLocalInputValue = (iso) => {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

export const classStatusBadge = (c) => {
  if (c.status === "live") return { text: "🔴 LIVE", cls: "bg-red-500/15 text-red-400 border-red-500/30" };
  if (c.status === "scheduled") return { text: `🗓 ${formatClassTime(c.scheduledAt)}`, cls: "bg-amber-500/10 text-amber-300 border-amber-500/30" };
  if (c.status === "cancelled") return { text: "Cancelled", cls: "bg-gray-500/10 text-gray-400 border-gray-600" };
  return { text: c.kind === "live" ? "▶ Recording" : "▶ Video", cls: "bg-[#7C3AED]/15 text-[#C4B5FD] border-[#7C3AED]/30" };
};
