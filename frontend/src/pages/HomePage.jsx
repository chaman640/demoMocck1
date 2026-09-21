import React, { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import api from "../api/api";
// 👆 top imports mein add karo
import BottomNav from "../components/BottomNav";

// 🆕 Naya logo (BatchMock.in rebrand)
const LOGO_URL = "/logo.svg";

// ... HomePage function ke andar, navItems array aur uska use pura hata do ...
// ─────────────────────────────────────────────
// Skeleton building blocks — baaki app mein jaisa pattern hai
// ─────────────────────────────────────────────
const SkeletonBlock = ({ className = "" }) => (
  <div className={`bg-gray-800/70 rounded animate-pulse ${className}`} />
);

// 👇 NAYA: Poore HomePage ka skeleton — spinner ki jagah
const HomePageSkeleton = () => (
  <div className="min-h-screen bg-[#0A0D14] text-white font-sans pb-16">
    {/* Header */}
    <header className="flex items-center px-4 py-3.5 border-b border-gray-800">
      <SkeletonBlock className="w-8 h-8 rounded-lg" />
      <SkeletonBlock className="ml-2.5 w-28 h-4" />
    </header>

    <main className="px-4 py-5 max-w-lg mx-auto">
      {/* Welcome */}
      <section className="mb-5 space-y-2.5">
        <SkeletonBlock className="w-52 h-7" />
        <SkeletonBlock className="w-40 h-7" />
        <SkeletonBlock className="w-60 h-4 mt-1" />
      </section>

      {/* Score Card */}
      <section className="mb-5 rounded-2xl p-5 bg-[#111827] border border-gray-800 flex flex-col items-center">
        <SkeletonBlock className="w-36 h-3 mb-3" />
        <SkeletonBlock className="w-24 h-10 mb-2" />
        <SkeletonBlock className="w-32 h-3 mb-4" />
        <SkeletonBlock className="w-28 h-7 rounded-full" />
      </section>

      {/* Quick Actions row */}
      <section className="mb-5">
        <SkeletonBlock className="w-20 h-3 mb-2.5" />
        <div className="flex gap-2">
          <SkeletonBlock className="w-32 h-12 rounded-xl flex-shrink-0" />
          <SkeletonBlock className="w-32 h-12 rounded-xl flex-shrink-0" />
        </div>
      </section>

      {/* Main Actions grid */}
      <section className="mb-5">
        <SkeletonBlock className="w-24 h-3 mb-2.5" />
        <div className="grid grid-cols-2 gap-2.5">
          {[1, 2, 3, 4].map((i) => (
            <SkeletonBlock key={i} className="h-24 rounded-2xl" />
          ))}
        </div>
      </section>

      {/* Rank Predictor placeholder */}
      <section className="rounded-2xl p-4 bg-[#111827] border border-gray-800">
        <SkeletonBlock className="w-28 h-4 mb-3" />
        <SkeletonBlock className="w-40 h-7" />
      </section>
    </main>

    {/* Bottom Nav */}
    <nav className="fixed bottom-0 left-0 right-0 h-14 bg-[#0A0D14]/95 backdrop-blur-lg border-t border-gray-800 flex justify-around items-center z-50">
      {[1, 2, 3, 4].map((i) => (
        <SkeletonBlock key={i} className="w-6 h-6 rounded" />
      ))}
    </nav>
  </div>
);

const HomePage = () => {
  const navigate = useNavigate();

  // 👇 NAYA: 30 second staleTime — is duration ke andar agar user wapas
  // Home page pe aata hai, to cache se turant purana data dikhega,
  // dobara loading/spinner nahi dikhega. 30s ke baad background mein
  // refresh ho jayega (data dikhte hue hi).

  // User data
  const { data: user, isLoading: userLoading, isError: userError } = useQuery({
    queryKey: ["me"],
    queryFn: async () => {
      const res = await api.get("/me");
      return res.data.data;
    },
    staleTime: 30 * 1000,
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
    staleTime: 30 * 1000,
    retry: false,
  });

  const averageScore = overview?.averageScore ?? null;
  const averageScoreOutOf = overview?.averageScoreOutOf ?? null; // 👈 NAYA
  const totalTests = overview?.totalTestsGiven ?? 0;

  // Rank predictor
  const { data: rankPredictor, isLoading: rankLoading } = useQuery({
    queryKey: ["rank-predictor-data", examName],
    queryFn: async () => {
      const res = await api.get(`/rank-predictor-data/${encodeURIComponent(examName)}`);
      return res.data;
    },
    enabled: !!examName,
    staleTime: 30 * 1000,
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
    staleTime: 30 * 1000,
    retry: false,
  });

  const isLoading = userLoading || overviewLoading;

  // Quick actions — swipe row mein dikhne wale
  const quickActions = [
    {
      icon: "📰",
      label: "Current Affairs",
      sub: "Daily updates",
      onClick: () => navigate("/CurrentAffairs"),
    },
    // 👇 NAYA: teacher ke banaye Custom Tests ka link. Pehle backend mein
    // ye feature poora bana tha lekin student ke liye koi entry point hi
    // nahi tha — teacher test banata tha aur wo kabhi kisi tak pahunchta hi nahi tha.
    {
      icon: "📋",
      label: "Batch Tests",
      sub: "From your teacher",
      onClick: () => navigate("/CustomTests"),
    },
    {
      icon: "👥",
      label: "My Batch",
      sub: "Coupon & teacher",
      onClick: () => navigate("/MyBatch"),
    },
    {
      icon: "🏆",
      label: "My Challenges",
      sub: "View",
      onClick: () => navigate("/MyChallenges"),
    },
  ];

  // Main grid — bade buttons
  const mainActions = [
    {
      icon: "📝",
      title: "Full Mock",
      desc: "Real exam experience",
      primary: true,
      onClick: () => navigate('/MockTest', { state: { mockType: "Full" } }),
    },
    {
      icon: "⚡",
      title: "Mini Mock",
      desc: "10-min practice",
      primary: true,
      onClick: () => navigate('/MockTest', { state: { mockType: "Mini" } }),
    },
    {
      icon: "📚",
      title: "Prev. Papers",
      desc: "From past years",
      primary: false,
      onClick: () => navigate("/PreviousYearTests"),
    },
    {
      icon: "⚔️",
      title: "Challenge",
      desc: "Challenge a friend",
      primary: false,
      onClick: () => navigate("/Challenge"),
    },
  ];

  // (unused `navItems` hata diya gaya — bottom nav ab <BottomNav /> se aata hai)

  // 👇 UPDATED: spinner ki jagah ab skeleton layout dikhega
  if (isLoading) {
    return <HomePageSkeleton />;
  }

  return (
    <div className="min-h-screen bg-[#0A0D14] text-white font-sans pb-16">
      {/* Header */}
      <header className="flex items-center px-4 py-3.5 border-b border-gray-800">
        <img src={LOGO_URL} alt="BatchMock.in" className="w-8 h-8 object-contain rounded-lg" />
        <span className="ml-2.5 text-base font-bold tracking-tight">BatchMock.in</span>
      </header>

      <main className="px-4 py-5 max-w-lg mx-auto">
        {/* Welcome */}
        <section className="mb-5">
          <h1 className="text-[26px] leading-tight font-extrabold mb-1.5">
            Start Studying<br />
            <span className="text-[#A78BFA]">Right Here</span>
          </h1>
          <p className="text-gray-400 text-sm">
            Take mock tests, raise your score, and secure your selection
          </p>
        </section>

        {/* Score Card */}
        <section 
          className="mb-5 bg-gradient-to-br from-[#1E1B4B] to-[#312E81] rounded-2xl p-5 text-center relative overflow-hidden cursor-pointer active:scale-[0.98] transition-transform"
          onClick={() => navigate('/UserAllAnalysis')}
        >
          <div className="absolute top-0 right-0 w-28 h-28 bg-[#8B5CF6] opacity-10 rounded-full -translate-y-1/2 translate-x-1/2" />
          
          <p className="text-[11px] text-[#A5B4FC] uppercase tracking-wider mb-1.5 relative z-10">
            Your Average Score
          </p>
          <p className="text-[44px] font-extrabold text-white mb-1 relative z-10 leading-none">
            {averageScore === null
              ? "--"
              : averageScoreOutOf
              ? `${averageScore}/${averageScoreOutOf}`
              : averageScore}
          </p>
          <p className="text-xs text-[#C4B5FD] mb-3 relative z-10">
            {totalTests > 0 ? `${totalTests} tests taken` : "No tests taken yet"}
          </p>
          <span className="inline-block px-4 py-1.5 bg-white/10 border border-white/20 rounded-full text-xs font-medium relative z-10">
            View Analysis →
          </span>
        </section>

        {/* Quick Actions — Horizontal Scroll Row */}
        <section className="mb-5">
          <p className="text-[11px] text-gray-500 uppercase tracking-wider font-semibold mb-2.5">
            Quick Actions
          </p>
          <div className="flex gap-2 overflow-x-auto pb-1 -mx-4 px-4 scrollbar-hide">
            {quickActions.map((action) => (
              <button
                key={action.label}
                onClick={action.onClick}
                className="flex-shrink-0 flex items-center gap-2 px-3.5 py-2.5 bg-[#111827] border border-gray-800 rounded-xl text-gray-300 hover:border-[#7C3AED]/50 hover:text-white transition-all active:scale-95"
              >
                <span className="text-base">{action.icon}</span>
                <div className="text-left">
                  <span className="text-xs font-semibold text-white block leading-tight">{action.label}</span>
                  <span className="text-[10px] text-gray-500 block leading-tight">{action.sub}</span>
                </div>
              </button>
            ))}
          </div>
        </section>

        {/* Main Actions — 4 Big Buttons */}
        <section className="mb-5">
          <p className="text-[11px] text-gray-500 uppercase tracking-wider font-semibold mb-2.5">
            Explore More
          </p>
          <div className="grid grid-cols-2 gap-2.5">
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
                <span className="text-2xl mb-1.5 block">{action.icon}</span>
                <span className="text-sm font-bold text-white block mb-0.5">{action.title}</span>
                <span className={`text-[11px] block ${action.primary ? "text-purple-200" : "text-gray-500"}`}>
                  {action.desc}
                </span>
              </button>
            ))}
          </div>
        </section>

        {/* Rank Predictor */}
        {!rankLoading && rankData && (
          <section className="bg-[#111827] border border-gray-800 rounded-2xl p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-semibold">Expected Rank</span>
              <span className="text-[10px] px-2 py-0.5 bg-[#7C3AED]/20 text-[#A78BFA] rounded-md font-medium">
                {rankData.year}
              </span>
            </div>
            
            {averageScore === null ? (
              <p className="text-sm text-gray-400">Take a test first to see your rank</p>
            ) : autoRankLoading ? (
              <div className="h-7 bg-gray-800 rounded animate-pulse w-28" />
            ) : autoRank ? (
              <div>
                <p className="text-[28px] font-extrabold text-[#A78BFA] leading-tight">
                  #{autoRank.rankRangeLow?.toLocaleString("en-IN")} – {autoRank.rankRangeHigh?.toLocaleString("en-IN")}
                </p>
                <p className="text-[11px] text-gray-500 mt-0.5">
                  Based on your score of {averageScoreOutOf ? `${averageScore}/${averageScoreOutOf}` : averageScore}
                </p>
                {autoRank.selectionChance && (
                  <p className={`text-[11px] mt-1.5 font-medium ${
                    autoRank.selectionChance === "strong" ? "text-green-400" :
                    autoRank.selectionChance === "borderline" ? "text-yellow-400" : "text-red-400"
                  }`}>
                    {autoRank.selectionChance === "strong" ? "✅ Strong chance" :
                     autoRank.selectionChance === "borderline" ? "⚠️ Borderline" : "❌ Low chance"}
                  </p>
                )}
              </div>
            ) : (
              <p className="text-sm text-gray-400">No data available</p>
            )}
          </section>
        )}
      </main>

      {/* Bottom Navigation */}
      <BottomNav />
    </div>
  );
};

export default HomePage;
