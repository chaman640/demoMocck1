import React, { useState, useRef, useEffect } from "react";
import { useLanguage } from "../context/LanguageContext";

// 🆕 SIMPLIFY — pehle 3-box toggle (Hindi/English/Hinglish) tha. Ab
// sirf Landing page ke liye ek CHHOTA button hai, jisme click karne par
// dropdown mein sirf 2 options aate hain: हिंदी aur English. Baaki poori
// site English mein hi rehti hai — wahan ye switcher kahin nahi dikhta.
const OPTIONS = [
  { value: "hindi", label: "हिंदी" },
  { value: "english", label: "English" },
];

const LanguageSwitcher = ({ className = "" }) => {
  const { language, setLanguage } = useLanguage();
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const currentLabel = OPTIONS.find((o) => o.value === language)?.label || "English";

  return (
    <div ref={ref} className={`relative ${className}`}>
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-[#111827] border border-gray-700 hover:border-[#7C3AED]/50 text-sm font-medium text-gray-200 transition-colors"
      >
        <span>🌐</span>
        <span>{currentLabel}</span>
        <svg className={`w-3.5 h-3.5 text-gray-500 transition-transform ${open ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-32 bg-[#111827] border border-gray-700 rounded-xl shadow-xl overflow-hidden z-50">
          {OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => { setLanguage(opt.value); setOpen(false); }}
              className={`w-full text-left px-4 py-2.5 text-sm transition-colors ${
                language === opt.value ? "bg-[#7C3AED]/15 text-[#A78BFA] font-medium" : "text-gray-300 hover:bg-white/5"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default LanguageSwitcher;
