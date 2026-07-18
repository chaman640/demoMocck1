import React, { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import api from "../api/api";

const HomePage = () => {
  const navigate = useNavigate();

  // Logged-in user ka data
  const {
    data: user,
    isLoading: userLoading,
    isError: userError,
    error: userErrorObj,
  } = useQuery({
    queryKey: ["me"],
    queryFn: async () => {
      const res = await api.get("/me");
      return res.data.data;
    },
    retry: false,
  });

  useEffect(() => {
    if (userError && userErrorObj?.response?.status === 401) {
      navigate("/Singup");
    }
  }, [userError, userErrorObj, navigate]);

  const examName = user?.exam;

  // Overview — averageScore yahin se milta hai
  const {
    data: overview,
    isLoading: overviewLoading,
    isError: overviewIsError,
  } = useQuery({
    queryKey: ["overview", examName],
    queryFn: async () => {
      const encodedExamName = encodeURIComponent(examName);
      const res = await api.get(`/analysis/overview/active_user/${encodedExamName}`);
      return res.data.data;
    },
    enabled: !!examName,
    retry: false,
  });

  const averageScore = overview?.averageScore ?? null;

  // Rank Predictor data
  const { data: rankPredictor, isLoading: rankLoading } = useQuery({
    queryKey: ["rank-predictor-data", examName],
    queryFn: async () => {
      const encodedExamName = encodeURIComponent(examName);
      const res = await api.get(`/rank-predictor-data/${encodedExamName}`);
      return res.data;
    },
    enabled: !!examName,
    retry: false,
  });

  const rankData = rankPredictor?.available ? rankPredictor.data : null;
  const chartData = rankData?.dataPoints
    ? [...rankData.dataPoints]
        .sort((a, b) => a.rank - b.rank)
        .map((p) => ({ rank: p.rank, score: p.score }))
    : [];

  // Automatic Expected Rank
  const { data: autoRankPrediction, isLoading: autoRankLoading } = useQuery({
    queryKey: ["rank-predictor-auto", examName, averageScore],
    queryFn: async () => {
      const encodedExamName = encodeURIComponent(examName);
      const res = await api.get(
        `/rank-predictor/${encodedExamName}?score=${averageScore}`
      );
      return res.data.data;
    },
    enabled: !!examName && averageScore !== null && !!rankData,
    retry: false,
  });

  const isLoading = userLoading || overviewLoading;
  const isError = userError || overviewIsError;
  const displayedScore = isLoading || isError || averageScore === null ? "--" : `${averageScore}%`;
  const scoreDashArray = averageScore !== null ? `${averageScore}, 100` : "0, 100";

  const navBtnClass =
    "flex flex-col items-center justify-center gap-1 w-1/3 text-gray-300 active:text-[#A78BFA] transition-colors";

  const confidenceBadgeClass = (confidence) =>
    confidence === "high"
      ? "bg-green-500/10 text-green-400"
      : confidence === "medium"
      ? "bg-yellow-500/10 text-yellow-400"
      : "bg-red-500/10 text-red-400";

  const selectionChanceLabel = {
    strong: "Achi Sambhavna",
    borderline: "Borderline",
    unlikely: "Kam Sambhavna",
  };

  const selectionChanceClass = {
    strong: "text-green-400",
    borderline: "text-yellow-400",
    unlikely: "text-red-400",
  };

  // Practice options — ek jagah define kiya taaki grid clean rahe
  const practiceOptions = [
    { icon: "⚔️", title: "Dost Ko Challenge Karo", onClick: () => navigate("/Challenge") },
    { icon: "📊", title: "Apne Challenges", onClick: () => navigate("/MyChallenges") },
    { icon: "📜", title: "Previous Year Papers", onClick: () => navigate("/PreviousYearTests") },
    { icon: "📰", title: "Daily Current Affairs", onClick: () => navigate("/CurrentAffairs") },
  ];

  return (
    <div className="min-h-screen bg-[#0A0D14] text-white font-sans pb-20 selection:bg-[#7C3AED] selection:text-white">

      {/* Navbar */}
      <nav className="flex items-center px-5 py-5 border-b border-gray-800">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-md bg-gradient-to-br from-[#8B5CF6] to-[#6D28D9] flex items-center justify-center font-bold text-sm">
            mt
          </div>
          <span className="text-xl font-semibold tracking-wide">mockTest.in</span>
        </div>
      </nav>

      <main className="px-5 py-8 max-w-lg mx-auto">

        {/* Hero — sabse pehle, kyunki yahi page ka main kaam hai */}
        <section className="mb-8">
          <h1 className="text-4xl leading-tight font-bold mb-4">
            Full Practice.<br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#A78BFA] to-[#7C3AED]">
              Real Results.
            </span>
          </h1>
          <p className="text-gray-400 text-base leading-relaxed mb-6">
            Mock test do, apni performance analyze karo, aur detailed insights se improve karo.
          </p>
          <div className="flex flex-col gap-3">
            <button
              onClick={() => navigate('/MockTest', { state: { mockType: "Full" } })}
              className="py-3.5 px-6 rounded-lg text-base font-semibold flex items-center justify-center gap-2 bg-[#7C3AED] text-white active:bg-[#6D28D9]"
            >
              Start Full Mock Test <span>&rarr;</span>
            </button>
            <button
              onClick={() => navigate('/MockTest', { state: { mockType: "Mini" } })}
              className="py-3 px-6 rounded-lg text-sm font-medium flex items-center justify-center gap-2 bg-transparent border border-gray-700 text-gray-400 active:border-gray-500"
            >
              Ya ek chhota Mini Mock try karo <span>&rarr;</span>
            </button>
          </div>
        </section>

        {/* Performance Card */}
        <section className="bg-[#111827] border border-gray-800 rounded-2xl p-6 mb-8 shadow-2xl">
          <h3 className="text-sm text-gray-400 mb-6">Overall Performance</h3>

          <div className="flex justify-center mb-4">
            <div className="relative w-[150px] h-[150px]">
              <svg viewBox="0 0 36 36" className="w-full h-full transform -rotate-90">
                <path
                  className="text-gray-800"
                  strokeWidth="3"
                  stroke="currentColor"
                  fill="none"
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                />
                <path
                  className="text-[#8B5CF6]"
                  strokeDasharray={scoreDashArray}
                  strokeWidth="3"
                  strokeLinecap="round"
                  stroke="currentColor"
                  fill="none"
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-3xl font-bold">{displayedScore}</span>
                <span className="text-xs text-gray-500 mt-1">Avg. Score</span>
              </div>
            </div>
          </div>

          <button
            onClick={() => navigate('/UserAllAnalysis')}
            className="w-full text-center text-sm text-[#A78BFA] font-medium py-2"
          >
            Poori Analysis Dekhein &rarr;
          </button>
        </section>

        {/* Rank Predictor Section */}
        {!rankLoading && rankData && chartData.length >= 2 && (
          <section className="bg-[#111827] border border-gray-800 rounded-2xl p-6 mb-8 shadow-2xl">
            <div className="flex items-center justify-between mb-1">
              <h3 className="text-sm text-gray-400">Rank Predictor</h3>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#7C3AED]/20 text-[#A78BFA]">
                {rankData.year}
              </span>
            </div>
            <p className="text-xs text-gray-600 mb-5">{rankData.examName}</p>

            <div className="bg-[#1F2937] border border-gray-800 rounded-xl p-5 mb-6">
              <p className="text-xs text-gray-500 mb-2">Aapki Expected Rank</p>

              {averageScore === null ? (
                <p className="text-sm text-gray-400 mt-2">
                  Apni expected rank dekhne ke liye pehle kam se kam ek mock test dein.
                </p>
              ) : autoRankLoading ? (
                <div className="h-9 w-48 bg-gray-800/70 rounded animate-pulse mt-2" />
              ) : autoRankPrediction ? (
                <>
                  <div className="flex items-center justify-between mt-1">
                    <p className="text-3xl font-bold text-[#A78BFA]">
                      {autoRankPrediction.rankRangeLow.toLocaleString("en-IN")} – {autoRankPrediction.rankRangeHigh.toLocaleString("en-IN")}
                    </p>
                    <span
                      className={`text-[10px] px-2.5 py-1 rounded-full font-medium flex-shrink-0 ${confidenceBadgeClass(
                        autoRankPrediction.confidence
                      )}`}
                    >
                      {autoRankPrediction.confidence} confidence
                    </span>
                  </div>
                  <p className="text-[11px] text-gray-500 mt-1.5">
                    Aapke average score ({averageScore}) ke aadhar par
                  </p>
                  {autoRankPrediction.selectionChance && (
                    <p
                      className={`text-xs mt-2 font-medium ${
                        selectionChanceClass[autoRankPrediction.selectionChance] || "text-gray-400"
                      }`}
                    >
                      Selection Chance: {selectionChanceLabel[autoRankPrediction.selectionChance] || autoRankPrediction.selectionChance}
                    </p>
                  )}
                </>
              ) : (
                <p className="text-sm text-gray-400 mt-2">Data abhi available nahi hai.</p>
              )}
            </div>

            <h4 className="text-xs text-gray-500 mb-3">Score vs Rank Trend</h4>
            <div className="w-full h-56">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1F2937" />
                  <XAxis
                    dataKey="rank"
                    stroke="#4B5563"
                    fontSize={11}
                    tickFormatter={(v) => v.toLocaleString("en-IN")}
                  />
                  <YAxis stroke="#4B5563" fontSize={11} />
                  <Tooltip
                    contentStyle={{
                      background: "#111827",
                      border: "1px solid #374151",
                      borderRadius: "8px",
                      fontSize: "12px",
                    }}
                    labelFormatter={(v) => `Rank: ${v.toLocaleString("en-IN")}`}
                    formatter={(value) => [value, "Score"]}
                  />
                  <Line
                    type="monotone"
                    dataKey="score"
                    stroke="#A78BFA"
                    strokeWidth={2}
                    dot={{ r: 3, fill: "#7C3AED" }}
                    activeDot={{ r: 5 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>

            {rankData.totalVacancies && (
              <p className="text-[11px] text-gray-600 mt-3 text-center">
                Total Vacancies: {rankData.totalVacancies.toLocaleString("en-IN")}
                {rankData.totalCandidates
                  ? ` • Total Candidates: ${rankData.totalCandidates.toLocaleString("en-IN")}`
                  : ""}
              </p>
            )}
          </section>
        )}

        {/* More Ways to Practice — compact grid, chaar alag banners ki jagah */}
        <section className="mb-4">
          <h3 className="text-sm text-gray-400 mb-3">More Ways to Practice</h3>
          <div className="grid grid-cols-2 gap-3">
            {practiceOptions.map((opt) => (
              <button
                key={opt.title}
                onClick={opt.onClick}
                className="bg-[#111827] border border-gray-800 active:border-[#7C3AED]/60 rounded-xl p-4 text-left transition-colors"
              >
                <span className="text-2xl mb-2 block">{opt.icon}</span>
                <span className="text-sm font-medium leading-snug block">{opt.title}</span>
              </button>
            ))}
          </div>
        </section>
      </main>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 w-full h-[70px] bg-[#111827] border-t border-gray-800 flex justify-around items-center z-50">
        <button onClick={() => navigate('/MockTest')} className={navBtnClass}>
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
          </svg>
          <span className="text-xs font-medium">Mock Tests</span>
        </button>

        <button onClick={() => navigate('/UserAllAnalysis')} className={navBtnClass}>
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
          <span className="text-xs font-medium">Analysis</span>
        </button>

        <button onClick={() => navigate('/ProfilePage')} className={navBtnClass}>
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
          </svg>
          <span className="text-xs font-medium">Profile</span>
        </button>
      </nav>
    </div>
  );
};

export default HomePage;