// components/CodePicker.jsx
//
// Apna code chunne ka box (teacher ka batch code, promoter code). Type karte
// hi server se check hota hai: available ✓ / unavailable ✗ + milte-julte
// available sujhav jinhe tap karke chuna ja sakta hai.
import { useEffect, useMemo, useState } from "react";
import api from "../api/api";

const clean = (v) => String(v || "").toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 12);

/**
 * value / onChange  — chuna hua code
 * exam              — sujhav mein exam ke initials (jaise SG = SSC GD)
 * onStatusChange    — "idle" | "checking" | "available" | "unavailable" | "invalid" | "error"
 * currentCode       — promoter ka abhi wala code (wahi dobara likhne par "aapka hi hai")
 */
const CodePicker = ({ value, onChange, exam = "", onStatusChange, currentCode = "", label = "Apna code (optional)", optional = true, dark = true }) => {
  // Server ka jawab — kis code ke liye tha, taaki purana jawab naye code par na dikhe
  const [remote, setRemote] = useState({ code: "", status: "", message: "", suggestions: [] });
  const code = clean(value);

  // Jo bina server ke pata hai (khaali, chhota, apna hi code)
  const local = useMemo(() => {
    if (!code) return { status: "idle", message: "" };
    if (currentCode && code === currentCode) return { status: "available", message: "Ye aapka abhi wala code hai." };
    if (code.length < 4) return { status: "invalid", message: "Kam se kam 4 akshar." };
    return null;
  }, [code, currentCode]);

  const view = local || (remote.code === code ? remote : { status: "checking", message: "", suggestions: [] });
  const { status, message } = view;
  const suggestions = view.suggestions || [];

  useEffect(() => {
    if (local) return undefined;
    let cancelled = false;
    const timer = setTimeout(async () => {
      try {
        const res = await api.get("/codes/check", { params: { code, exam } });
        const d = res.data.data;
        if (!cancelled) {
          setRemote({ code, status: d.available ? "available" : "unavailable", message: d.message, suggestions: d.suggestions || [] });
        }
      } catch (err) {
        if (!cancelled) setRemote({ code, status: "error", message: err.response?.data?.message || "Check nahi ho paya.", suggestions: [] });
      }
    }, 450);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [code, exam, local]);

  useEffect(() => {
    onStatusChange?.(status);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);

  const tone =
    status === "available"
      ? "text-green-400"
      : status === "unavailable" || status === "invalid" || status === "error"
        ? "text-red-400"
        : "text-gray-500";
  const border =
    status === "available" ? "border-green-500/60" : status === "unavailable" || status === "invalid" ? "border-red-500/60" : dark ? "border-gray-700" : "border-gray-300";

  return (
    <div>
      <label className="block text-xs font-medium text-gray-400 mb-1.5">{label}</label>
      <div className="relative">
        <input
          value={value}
          onChange={(e) => onChange(clean(e.target.value))}
          placeholder={optional ? "Jaise RAHULSSC — khaali chhodein to apne aap banega" : "Jaise RAHUL2026"}
          className={`w-full px-4 py-2.5 pr-10 text-sm font-mono tracking-wider rounded-xl outline-none border ${border} ${dark ? "bg-[#0A0D14] text-white placeholder-gray-600" : "bg-white text-gray-900"}`}
          autoCapitalize="characters"
          spellCheck={false}
        />
        <span className="absolute inset-y-0 right-3 flex items-center text-sm">
          {status === "checking" && <span className="w-4 h-4 rounded-full border-2 border-gray-600 border-t-[#A78BFA] animate-spin" />}
          {status === "available" && <span className="text-green-400">✓</span>}
          {(status === "unavailable" || status === "invalid") && <span className="text-red-400">✗</span>}
        </span>
      </div>
      {message && <p className={`text-[11px] mt-1.5 ${tone}`}>{message}</p>}
      {status === "unavailable" && suggestions.length > 0 && (
        <div className="mt-2">
          <p className="text-[11px] text-gray-400 mb-1.5">Ye available hain — tap karke chunein:</p>
          <div className="flex flex-wrap gap-2">
            {suggestions.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => onChange(s)}
                className="px-3 py-1 rounded-full border border-[#7C3AED]/50 bg-[#7C3AED]/10 text-[#C4B5FD] text-xs font-mono hover:bg-[#7C3AED]/20"
              >
                {s}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default CodePicker;
