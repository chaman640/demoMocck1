import React from "react";
import { useNavigate } from "react-router-dom";

const LOGO_URL = "/logo.svg";
const POSTER_URL = "/poster.svg";

const FEATURES = [
  {
    icon: "📝",
    title: "Full & Mini Mock Tests",
    desc: "Asli exam pattern ke hisaab se, topic-wise weightage ke saath — jitni practice chahiye utni.",
  },
  {
    icon: "📚",
    title: "Previous Year Papers",
    desc: "Purane saalon ke asli paper, solved — pata chale ki exam mein kaisa poocha jaata hai.",
  },
  {
    icon: "📰",
    title: "Daily Current Affairs",
    desc: "Roz ki GK updates, seedhe quiz ke saath — apne batch ke hisaab se bhi.",
  },
  {
    icon: "📊",
    title: "Detailed Analysis",
    desc: "Kaunsa topic kamzor hai, kaunsa strong — sab kuch graph aur number ke saath saamne.",
  },
  {
    icon: "🎯",
    title: "Rank Predictor",
    desc: "Apna score daalo, andaza lagao ki kitni rank aa sakti hai — purane data ke aadhar par.",
  },
  {
    icon: "👨‍🏫",
    title: "Apna Batch, Apna Teacher",
    desc: "Teacher apna khud ka batch banata hai, apne students ke liye custom content deta hai.",
  },
];

const Landing = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-[#0A0D14] text-white overflow-x-hidden">
      {/* ── Nav ── */}
      <header className="flex items-center justify-between px-4 sm:px-8 py-4 max-w-6xl mx-auto">
        <div className="flex items-center gap-2.5">
          <img src={LOGO_URL} alt="BatchMock.in" className="w-9 h-9 object-contain" />
          <span className="text-lg font-bold tracking-tight">BatchMock.in</span>
        </div>
        <div className="flex items-center gap-2 sm:gap-3">
          <button
            onClick={() => navigate("/TeacherLogin")}
            className="hidden sm:block px-4 py-2 text-sm font-medium text-gray-300 hover:text-white transition-colors"
          >
            Teacher Login
          </button>
          <button
            onClick={() => navigate("/Login")}
            className="px-4 sm:px-5 py-2 rounded-lg bg-[#7C3AED] hover:bg-[#6D28D9] text-sm font-semibold transition-colors"
          >
            Student Login
          </button>
        </div>
      </header>

      {/* ── Hero ── */}
      <section className="max-w-6xl mx-auto px-4 sm:px-8 pt-10 sm:pt-16 pb-16 sm:pb-24 grid lg:grid-cols-2 gap-10 items-center">
        <div>
          <span className="inline-block px-3 py-1 rounded-full bg-[#7C3AED]/10 border border-[#7C3AED]/30 text-[#A78BFA] text-xs font-medium mb-5">
            Sarkari Exam Ki Taiyari, Ab Smart Tareeke Se
          </span>
          <h1 className="text-3xl sm:text-5xl font-bold leading-tight mb-5">
            Har Mock Test Ke Saath, <span className="text-[#A78BFA]">Apni Kamzori</span> Pehchano
          </h1>
          <p className="text-gray-400 text-base sm:text-lg leading-relaxed mb-8 max-w-md">
            UPSSSC PET, SSC, aur doosre sarkari exams ke liye — mock tests, previous year papers, current affairs aur detailed analysis, sab ek hi jagah.
          </p>
          <div className="flex flex-col sm:flex-row gap-3">
            <button
              onClick={() => navigate("/Singup")}
              className="px-6 py-3 rounded-xl bg-[#7C3AED] hover:bg-[#6D28D9] font-semibold transition-colors"
            >
              Free Mein Shuru Karein
            </button>
            <button
              onClick={() => navigate("/Login")}
              className="px-6 py-3 rounded-xl border border-gray-700 hover:border-gray-500 font-medium transition-colors"
            >
              Pehle Se Account Hai? Login
            </button>
          </div>
        </div>
        <div className="flex justify-center">
          <img src={POSTER_URL} alt="Student preparing for exams" className="w-full max-w-md" />
        </div>
      </section>

      {/* ── Features ── */}
      <section className="max-w-6xl mx-auto px-4 sm:px-8 py-16 sm:py-20 border-t border-gray-800">
        <div className="text-center mb-12">
          <h2 className="text-2xl sm:text-3xl font-bold mb-3">Sab Kuch Jo Taiyari Ke Liye Chahiye</h2>
          <p className="text-gray-500 text-sm sm:text-base">Ek platform, jo student aur teacher dono ke liye bana hai</p>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {FEATURES.map((f) => (
            <div key={f.title} className="bg-[#111827] border border-gray-800 rounded-2xl p-6 hover:border-[#7C3AED]/40 transition-colors">
              <div className="text-3xl mb-3">{f.icon}</div>
              <h3 className="font-semibold text-base mb-2">{f.title}</h3>
              <p className="text-sm text-gray-500 leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Teacher CTA strip ── */}
      <section className="max-w-6xl mx-auto px-4 sm:px-8 py-12">
        <div className="bg-gradient-to-br from-[#7C3AED]/15 to-transparent border border-[#7C3AED]/30 rounded-2xl p-8 sm:p-10 flex flex-col sm:flex-row items-center justify-between gap-6">
          <div>
            <h3 className="text-xl font-bold mb-2">Aap Teacher Hain?</h3>
            <p className="text-gray-400 text-sm max-w-md">Apna batch banao, apne students ke liye custom test aur content daalo — apni khud ki class online chalao.</p>
          </div>
          <button
            onClick={() => navigate("/TeacherLogin")}
            className="px-6 py-3 rounded-xl bg-white text-[#0A0D14] hover:bg-gray-200 font-semibold transition-colors flex-shrink-0"
          >
            Teacher Login →
          </button>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="border-t border-gray-800 py-8 px-4 sm:px-8">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3 text-sm text-gray-600">
          <div className="flex items-center gap-2">
            <img src={LOGO_URL} alt="BatchMock.in" className="w-5 h-5 object-contain" />
            <span>BatchMock.in</span>
          </div>
          <span>Find weaknesses, build strength.</span>
        </div>
      </footer>
    </div>
  );
};

export default Landing;
