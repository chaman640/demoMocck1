import React from "react";
import { useLanguage } from "../context/LanguageContext";

const OPTIONS = [
  { value: "hindi", label: "हिंदी" },
  { value: "english", label: "English" },
  { value: "hinglish", label: "Hinglish" },
];

// 🆕 Compact 3-way toggle — Profile pages mein use hota hai. Design
// baaki app jaisa hi (dark card, purple active-state).
const LanguageSwitcher = ({ className = "" }) => {
  const { language, setLanguage } = useLanguage();

  return (
    <div className={`flex gap-1.5 bg-[#0A0D14] border border-gray-800 rounded-xl p-1 ${className}`}>
      {OPTIONS.map((opt) => (
        <button
          key={opt.value}
          onClick={() => setLanguage(opt.value)}
          className={`flex-1 py-2 rounded-lg text-xs font-medium transition-colors ${
            language === opt.value ? "bg-[#7C3AED] text-white" : "text-gray-400 hover:text-gray-200"
          }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
};

export default LanguageSwitcher;
