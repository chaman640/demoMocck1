import React, { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import api from "../api/api";

const HomePage = () => {
  const navigate = useNavigate();

  // User data
  const { data: user, isLoading: userLoading, isError: userError } = useQuery({
    queryKey: ["me"],
    queryFn: async () => {
      const res = await api.get("/me");
      return res.data.data;
    },
    retry: false,
  });

  useEffect(() => {
    if (userError) navigate("/Singup");
  }, [userError, navigate]);

  const examName = user?.exam;

  // Performance overview
  const { data: overview, isLoading: overviewLoading } = useQuery({
    queryKey: ["overview", examName],
    queryFn: async () => {
      const res = await api.get(`/analysis/overview/active_user/${encodeURIComponent(examName)}`);
      return res.data.data;
    },
    enabled: !!examName,
    retry: false,
  });

  const averageScore = overview?.averageScore ?? null;
  const totalTests = overview?.totalTestsGiven ?? 0;

  // Rank predictor
  const { data: rankPredictor, isLoading: rankLoading } = useQuery({
    queryKey: ["rank-predictor-data", examName],
    queryFn: async () => {
      const res = await api.get(`/rank-predictor-data/${encodeURIComponent(examName)}`);
      return res.data;
    },
    enabled: !!examName,
    retry: false,
  });

  const rankData = rankPredictor?.available ? rankPredictor.data : null;

  // Auto rank
  const { data: autoRank, isLoading: autoRankLoading } = useQuery({
    queryKey: ["rank-predictor-auto", examName, averageScore],
    queryFn: async () => {
      const res = await api.get(`/rank-predictor/${encodeURIComponent(examName)}?score=${averageScore}`);
      return res.data.data;
    },
    enabled: !!examName && averageScore !== null && !!rankData,
    retry: false,
  });

  const isLoading = userLoading || overviewLoading;

  // Navigation items
  const mainActions = [
    {
      icon: "📝",
      title: "Full Mock Test",
      desc: "Real exam jaisa",
      primary: true,
      onClick: () => navigate('/MockTest', { state: { mockType: "Full" } }),
    },
    {
      icon: "📚",
      title: "Previous Papers",
      desc: "Purane saal ke",
      primary: false,
      onClick: () => navigate("/PreviousYearTests"),
    },
    {
      icon: "📰",
      title: "Current Affairs",
      desc: "Roz ki khabrein",
      primary: false,
      onClick: () => navigate("/CurrentAffairs"),
    },
    {
      icon: "⚔️",
      title: "Challenge",
      desc: "Dost se compete",
      primary: false,
      onClick: () => navigate("/Challenge"),
    },
  ];

  const navItems = [
    { label: "Home", active: true, icon: "home" },
    { label: "Test", icon: "test", onClick: () => navigate('/MockTest') },
    { label: "Analysis", icon: "analysis", onClick: () => navigate('/UserAllAnalysis') },
    { label: "Profile", icon: "profile", onClick: () => navigate('/ProfilePage') },
  ];

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#0A0D14] text-white flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-gray-700 border-t-[#8B5CF6] rounded-full animate-spin" />
          <p className="text-gray-400 text-sm">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0A0D14] text-white font-sans pb-20">
      {/* Header */}
      <header className="flex items-center px-5 py-4 border-b border-gray-800">
        <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-[#8B5CF6] to-[#6D28D9] flex items-center justify-center font-bold text-sm">
          mt
        </div>
        <span className="ml-3 text-lg font-bold tracking-tight">mockTest.in</span>
      </header>

      <main className="px-5 py-6 max-w-lg mx-auto">
        {/* Welcome */}
        <section className="mb-6">
          <h1 className="text-[28px] leading-tight font-extrabold mb-2">
            Padhai Shuru<br />
            <span className="text-[#A78BFA]">Karo Yahan Se</span>
          </h1>
          <p className="text-gray-400 text-sm leading-relaxed">
            Mock test do, score badhao, selection pakka karo
          </p>
        </section>

        {/* Score Card - Sabse Important */}
        <section 
          className="mb-6 bg-gradient-to-br from-[#1E1B4B] to-[#312E81] rounded-2xl p-6 text-center relative overflow-hidden cursor-pointer active:scale-[0.98] transition-transform"
          onClick={() => navigate('/UserAllAnalysis')}
        >
          <div className="absolute top-0 right-0 w-32 h-32 bg-[#8B5CF6] opacity-10 rounded-full -translate-y-1/2 translate-x-1/2" />
          
          <p className="text-xs text-[#A5B4FC] uppercase tracking-wider mb-2 relative z-10">
            Aapka Average Score
          </p>
          <p className="text-5xl font-extrabold text-white mb-1 relative z-10">
            {averageScore !== null ? `${averageScore}%` : "--"}
          </p>
          <p className="text-sm text-[#C4B5FD] mb-4 relative z-10">
            {totalTests > 0 ? `${totalTests} test diye hain` : "Abhi koi test nahi diya"}
          </p>
          <span className="inline-block px-4 py-2 bg-white/10 border border-white/20 rounded-full text-sm font-medium relative z-10">
            Analysis Dekho →
          </span>
        </section>

        {/* Main Actions - 4 Big Buttons */}
        <section className="mb-6">
          <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold mb-3">
            Kya Karna Hai?
          </p>
          <div className="grid grid-cols-2 gap-3">
            {mainActions.map((action) => (
              <button
                key={action.title}
                onClick={action.onClick}
                className={`text-left p-4 rounded-2xl border transition-all active:scale-[0.97] ${
                  action.primary
                    ? "bg-gradient-to-br from-[#7C3AED] to-[#6D28D9] border-transparent text-white shadow-lg shadow-purple-900/20"
                    : "bg-[#111827] border-gray-800 text-gray-300 hover:border-gray-600"
                }`}
              >
                <span className="text-2xl mb-2 block">{action.icon}</span>
                <span className={`text-sm font-bold block mb-0.5 ${action.primary ? "text-white" : "text-white"}`}>
                  {action.title}
                </span>
                <span className={`text-xs block ${action.primary ? "text-purple-200" : "text-gray-500"}`}>
                  {action.desc}
                </span>
              </button>
            ))}
          </div>
        </section>

        {/* Rank Predictor - Simple Number */}
        {!rankLoading && rankData && (
          <section className="mb-6 bg-[#111827] border border-gray-800 rounded-2xl p-5">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-semibold">Expected Rank</span>
              <span className="text-[10px] px-2 py-1 bg-[#7C3AED]/20 text-[#A78BFA] rounded-md font-medium">
                {rankData.year}
              </span>
            </div>
            
            {averageScore === null ? (
              <p className="text-sm text-gray-400">
                Rank dekhne ke liye pehle ek test do
              </p>
            ) : autoRankLoading ? (
              <div className="h-8 bg-gray-800 rounded animate-pulse w-32" />
            ) : autoRank ? (
              <div>
                <p className="text-3xl font-extrabold text-[#A78BFA]">
                  #{autoRank.rankRangeLow?.toLocaleString("en-IN")} – {autoRank.rankRangeHigh?.toLocaleString("en-IN")}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  Aapke {averageScore}% score ke hisaab se
                </p>
                {autoRank.selectionChance && (
                  <p className={`text-xs mt-2 font-medium ${
                    autoRank.selectionChance === "strong" ? "text-green-400" :
                    autoRank.selectionChance === "borderline" ? "text-yellow-400" : "text-red-400"
                  }`}>
                    {autoRank.selectionChance === "strong" ? "✅ Achi sambhavna" :
                     autoRank.selectionChance === "borderline" ? "⚠️ Borderline" : "❌ Kam sambhavna"}
                  </p>
                )}
              </div>
            ) : (
              <p className="text-sm text-gray-400">Data available nahi hai</p>
            )}
          </section>
        )}
      </main>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 h-16 bg-[#0A0D14]/95 backdrop-blur-lg border-t border-gray-800 flex justify-around items-center z-50">
        {navItems.map((item) => (
          <button
            key={item.label}
            onClick={item.onClick}
            className={`flex flex-col items-center gap-1 py-2 px-4 ${item.active ? "text-[#A78BFA]" : "text-gray-500"}`}
          >
            {item.icon === "home" && (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
              </svg>
            )}
            {item.icon === "test" && (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
              </svg>
            )}
            {item.icon === "analysis" && (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" stroke-linejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            )}
            {item.icon === "profile" && (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            )}
            <span className="text-[10px] font-medium">{item.label}</span>
          </button>
        ))}
      </nav>
    </div>
  );
};

export default HomePage;