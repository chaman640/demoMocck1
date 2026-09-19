import React from "react";
import { useNavigate } from "react-router-dom";
import TeacherBottomNav from "../../components/TeacherBottomNav";

const options = [
  // 🆕 HATA DIYA — "Question Add Karein" (Mock Test wala Question Bank).
  // Ab sirf Admin Question Bank mein sawaal add kar sakta hai. Teacher
  // apne students ke liye "Custom Tests" se hi sawaal daal sakta hai.
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
              className="w-full flex items-center gap-4 bg-[#111827] border border-gray-800 rounded-2xl p-4 hover:border-gray-600 transition-colors text-left"
            >
              <span className="text-2xl flex-shrink-0">{o.icon}</span>
              <div className="min-w-0">
                <p className="font-semibold text-sm">{o.title}</p>
                <p className="text-xs text-gray-500">{o.desc}</p>
              </div>
            </button>
          ))}
        </div>
      </div>
      <TeacherBottomNav />
    </div>
  );
};

export default TeacherContent;
