import React from "react";
import { useNavigate, Link } from "react-router-dom";
import InstallAppButton from "../components/InstallAppButton";

const LOGO_URL = "/logo.svg";

const FEATURES = [
  {
    icon: "📝",
    title: "Full-Length Mock Tests",
    desc: "Real exam-pattern mocks with accurate timing and negative marking, so exam day feels familiar.",
  },
  {
    icon: "📚",
    title: "Previous Year Papers",
    desc: "Practice actual papers from past years, organized by exam and shift.",
  },
  {
    icon: "📊",
    title: "Personalized Analysis",
    desc: "See your weak topics, accuracy trends, and how your speed compares to your batch.",
  },
  {
    icon: "📰",
    title: "Daily Current Affairs",
    desc: "Short daily updates and quizzes, curated for your exam category.",
  },
];

const buttonBase = "inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl text-sm font-semibold transition-colors whitespace-nowrap";

const Landing = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-[#0A0D14] text-white font-sans">
      <nav className="flex items-center justify-between px-4 sm:px-6 py-4 max-w-6xl mx-auto">
        <div className="flex items-center gap-2">
          <img src={LOGO_URL} alt="BatchMock.in" className="w-8 h-8 object-contain rounded" />
          <span className="text-base sm:text-xl font-semibold tracking-wide">BatchMock.in</span>
        </div>
        <div className="flex items-center gap-2 sm:gap-3">
          <button
            onClick={() => navigate("/Login")}
            className="px-4 py-2 rounded-lg text-sm font-medium text-gray-300 hover:text-white transition-colors"
          >
            Login
          </button>
          <button
            onClick={() => navigate("/Singup")}
            className="px-4 py-2 rounded-lg bg-[#7C3AED] hover:bg-[#6D28D9] text-sm font-medium transition-colors"
          >
            Sign Up
          </button>
        </div>
      </nav>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 pt-12 sm:pt-20 pb-16 text-center">
        <span className="inline-block px-3 py-1 rounded-full bg-[#7C3AED]/15 text-[#A78BFA] text-xs font-medium border border-[#7C3AED]/25 mb-6">
          Built for Government Exam Aspirants
        </span>
        <h1 className="text-3xl sm:text-5xl font-bold tracking-tight leading-tight mb-5">
          Practice Smarter.<br className="hidden sm:block" /> Track Every Improvement.
        </h1>
        <p className="text-gray-400 text-sm sm:text-base max-w-xl mx-auto mb-10 leading-relaxed">
          Mock tests, previous year papers, and detailed performance analysis — all in one place,
          built specifically for students preparing for government exams.
        </p>

        <div className="flex flex-wrap items-center justify-center gap-3">
          <button
            onClick={() => navigate("/Singup")}
            className={`${buttonBase} bg-[#7C3AED] hover:bg-[#6D28D9] text-white`}
          >
            Get Started Free
          </button>
          <button
            onClick={() => navigate("/Login")}
            className={`${buttonBase} border border-gray-700 text-gray-200 hover:border-gray-500`}
          >
            Login
          </button>
          <InstallAppButton
            className={`${buttonBase} border border-gray-700 text-gray-200 hover:border-gray-500`}
          />
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 pb-20">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {FEATURES.map((f, i) => (
            <div
              key={i}
              className="bg-[#111827] border border-gray-800 rounded-2xl p-5 hover:border-[#7C3AED]/30 transition-colors"
            >
              <div className="text-2xl mb-3">{f.icon}</div>
              <h3 className="text-sm font-semibold text-white mb-1.5">{f.title}</h3>
              <p className="text-xs text-gray-400 leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="border-t border-gray-800">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-xs text-gray-500">© {new Date().getFullYear()} BatchMock.in — All rights reserved</p>
          <Link to="/PrivacyPolicy" className="text-xs text-gray-500 hover:text-gray-300 transition-colors">
            Privacy Policy
          </Link>
        </div>
      </div>
    </div>
  );
};

export default Landing;
