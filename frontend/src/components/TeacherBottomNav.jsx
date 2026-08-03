import React from "react";
import { useNavigate, useLocation } from "react-router-dom";

const NAV_ITEMS = [
  { key: "dashboard", label: "Dashboard", path: "/TeacherDashboard" },
  { key: "coupons", label: "Batches", path: "/TeacherCoupons" },
  { key: "team", label: "Team", path: "/TeacherSubTeachers" },
  { key: "students", label: "Students", path: "/TeacherStudentSearch" },
  { key: "content", label: "Content", path: "/TeacherContent" },
];

const isActivePath = (pathname, key) => {
  const lower = pathname.toLowerCase();
  switch (key) {
    case "dashboard": return lower.startsWith("/teacherdashboard");
    case "coupons": return lower.startsWith("/teachercoupons");
    case "team": return lower.startsWith("/teachersubteachers");
    case "students": return lower.startsWith("/teacherstudent");
    case "content": return lower.startsWith("/teachercontent") || lower.startsWith("/teacheraddquestion") || lower.startsWith("/teacherpyq") || lower.startsWith("/teachercustomtest");
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
  team: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a4 4 0 00-3-3.87M9 20H4v-2a4 4 0 013-3.87m6-4a4 4 0 10-8 0 4 4 0 008 0zm6 0a4 4 0 10-8 0 4 4 0 008 0z" />
    </svg>
  ),
  students: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-4.35-4.35M17 10a7 7 0 11-14 0 7 7 0 0114 0z" />
    </svg>
  ),
  content: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
    </svg>
  ),
};

const TeacherBottomNav = () => {
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
            className={`flex flex-col items-center gap-0.5 py-1.5 px-2.5 ${active ? "text-[#A78BFA]" : "text-gray-500"}`}
          >
            {ICONS[item.key]}
            <span className="text-[9px] font-medium">{item.label}</span>
          </button>
        );
      })}
    </nav>
  );
};

export default TeacherBottomNav;