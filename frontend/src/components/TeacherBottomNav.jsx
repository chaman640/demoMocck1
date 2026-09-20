import React from "react";
import { useNavigate, useLocation } from "react-router-dom";

// 🆕 REORGANIZE — "Team" aur "Students" bottom nav se hata diye (5 items
// se zyada mobile pe cramped ho jaata hai). Wo dono ab apni sambandhit
// jagah se ek click mein pahunchte hain:
//   • Team (sub-teachers)  → "Batches" page ke andar ek link se
//   • Students (search)    → "Analysis" page ke andar ek link se
// Aur "Analysis" (Class Analysis) ab seedha bottom nav mein hai (pehle
// "Content" ke andar chhupa hua tha, ek extra click lagta tha).
// "Profile" naya add hua.
const NAV_ITEMS = [
  { key: "dashboard", label: "Home", path: "/TeacherDashboard" },
  { key: "coupons", label: "Batches", path: "/TeacherCoupons" },
  { key: "analysis", label: "Analysis", path: "/TeacherClassAnalysis" },
  { key: "content", label: "Content", path: "/TeacherContent" },
  { key: "profile", label: "Profile", path: "/TeacherProfile" },
];

const isActivePath = (pathname, key) => {
  const lower = pathname.toLowerCase();
  switch (key) {
    case "dashboard": return lower.startsWith("/teacherdashboard");
    case "coupons": return lower.startsWith("/teachercoupons") || lower.startsWith("/teacherbatchstudents") || lower.startsWith("/teachersubteachers");
    case "analysis": return lower.startsWith("/teacherclassanalysis") || lower.startsWith("/teacherstudentanalysis") || lower.startsWith("/teacherstudenttopicanalysis") || lower.startsWith("/teacherstudentsubjectanalysis") || lower.startsWith("/teacherstudentsearch");
    case "content": return lower.startsWith("/teachercontent") || lower.startsWith("/teacherpyq") || lower.startsWith("/teachercustomtest") || lower.startsWith("/teachercurrentaffair");
    case "profile": return lower.startsWith("/teacherprofile");
    default: return false;
  }
};

const ICONS = {
  dashboard: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
    </svg>
  ),
  coupons: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z" />
    </svg>
  ),
  analysis: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2" />
    </svg>
  ),
  content: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
    </svg>
  ),
  profile: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
    </svg>
  ),
};

const TeacherBottomNav = () => {
  const navigate = useNavigate();
  const location = useLocation();

  return (
    <nav className="fixed bottom-0 left-0 right-0 h-16 bg-[#0A0D14]/95 backdrop-blur-lg border-t border-gray-800 flex justify-around items-center z-50 pb-[env(safe-area-inset-bottom,0px)]">
      {NAV_ITEMS.map((item) => {
        const active = isActivePath(location.pathname, item.key);
        return (
          <button
            key={item.key}
            onClick={() => navigate(item.path)}
            className={`flex flex-col items-center gap-0.5 py-1.5 px-3 rounded-xl transition-colors ${active ? "text-[#A78BFA]" : "text-gray-500 hover:text-gray-300"}`}
          >
            {ICONS[item.key]}
            <span className="text-[10px] font-medium">{item.label}</span>
          </button>
        );
      })}
    </nav>
  );
};

export default TeacherBottomNav;
