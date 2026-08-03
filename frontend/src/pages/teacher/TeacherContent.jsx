import React from "react";
import { useNavigate } from "react-router-dom";
import TeacherBottomNav from "../../components/TeacherBottomNav";

const options = [
  { title: "Question Add Karein", desc: "Coupon/subject ke liye naye sawaal daalein", path: "/TeacherAddQuestion", icon: "➕" },
  { title: "Previous Year Papers", desc: "Paper-shell banayein ya apna subject fill karein", path: "/TeacherPYQPapers", icon: "📚" },
  { title: "Custom Tests", desc: "Weekly/chapter-wise test banayein", path: "/TeacherCustomTests", icon: "📝" },
  { title: "Class Analysis", desc: "Poori class ka topic-wise weak-area breakdown", path: "/TeacherClassAnalysis", icon: "📊" },
];

const TeacherContent = () => {
  const navigate = useNavigate();
  return (
    <div className="min-h-screen bg-[#0A0D14] text-white px-4 sm:px-6 py-8 pb-24">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-2xl font-bold mb-1">Content Manage Karein</h1>
        <p className="text-gray-400 text-sm mb-8">Apne active batch ke liye content banayein</p>

        <div className="space-y-3">
          {options.map((o) => (
            <button
              key={o.path}
              onClick={() => navigate(o.path)}
              className="w-full text-left bg-[#111827] border border-gray-800 hover:border-[#7C3AED]/60 rounded-2xl p-5 flex items-center gap-4 transition-colors"
            >
              <span className="text-2xl flex-shrink-0">{o.icon}</span>
              <div className="min-w-0">
                <p className="font-semibold text-sm">{o.title}</p>
                <p className="text-xs text-gray-500 mt-0.5">{o.desc}</p>
              </div>
              <span className="ml-auto text-[#A78BFA] flex-shrink-0">→</span>
            </button>
          ))}
        </div>
      </div>
      <TeacherBottomNav />
    </div>
  );
};

export default TeacherContent;