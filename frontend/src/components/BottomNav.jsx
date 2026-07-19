import React from "react";
import { useNavigate, useLocation } from "react-router-dom";

// 👇 Har item ka apna route hai — click karne pe wahan navigate hoga
const NAV_ITEMS = [
  { key: "home", label: "Home", path: "/HomePage" },
  { key: "test", label: "Test", path: "/MockTest" },
  { key: "analysis", label: "Analysis", path: "/UserAllAnalysis" },
  { key: "profile", label: "Profile", path: "/ProfilePage" },
];

// 👇 Current URL dekh kar decide karta hai kaunsa tab "active" (purple) dikhega
// Analysis ke teeno pages (UserAllAnalysis, UserSubjectAnallysis, UserTopicAnalysis)
// pe bhi "Analysis" hi highlight hoga, kyunki teeno ke naam mein "Analysis" aata hai
const isActivePath = (pathname, key) => {
  const lower = pathname.toLowerCase();
  switch (key) {
    case "home":
      return lower === "/" || lower === "/homepage";
    case "test":
      return lower.startsWith("/mocktest");
    case "analysis":
      return lower.includes("analysis");
    case "profile":
      return lower.startsWith("/profilepage");
    default:
      return false;
  }
};

const ICONS = {
  home: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
    </svg>
  ),
  test: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
    </svg>
  ),
  analysis: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
    </svg>
  ),
  profile: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
    </svg>
  ),
};

// 👇 IMPORTANT: "fixed" ka matlab hai ye screen (viewport) ke bottom se hamesha
// chipka rahega — page chahe kitna bhi lamba ho, scroll kahin pe bhi ho,
// ye button bar hamesha visible rahega. Scroll karne ki koi zaroorat nahi.
const BottomNav = () => {
  const navigate = useNavigate();
  const location = useLocation();

  return (
    <nav className="fixed bottom-0 left-0 right-0 h-14 bg-[#0A0D14]/95 backdrop-blur-lg border-t border-gray-800 flex justify-around items-center z-50">
      {NAV_ITEMS.map((item) => {
        const active = isActivePath(location.pathname, item.key);
        return (
          <button
            key={item.key}
            onClick={() => navigate(item.path)}
            className={`flex flex-col items-center gap-0.5 py-1.5 px-3 ${
              active ? "text-[#A78BFA]" : "text-gray-500"
            }`}
          >
            {ICONS[item.key]}
            <span className="text-[10px] font-medium">{item.label}</span>
          </button>
        );
      })}
    </nav>
  );
};

export default BottomNav;