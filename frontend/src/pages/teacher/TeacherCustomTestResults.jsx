import React, { useState, useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import api from "../../api/api";
import TeacherBottomNav from "../../components/TeacherBottomNav";

const SkeletonBlock = ({ className = "" }) => (
  <div className={`bg-gray-800/70 rounded animate-pulse ${className}`} />
);

const PageSkeleton = () => (
  <div className="min-h-screen bg-[#0A0D14] text-white px-4 sm:px-6 py-8 pb-24">
    <div className="max-w-2xl mx-auto space-y-4">
      <SkeletonBlock className="w-40 h-4" />
      <SkeletonBlock className="w-56 h-7" />
      <SkeletonBlock className="w-full h-12 rounded-xl" />
      <SkeletonBlock className="w-full h-64 rounded-2xl" />
    </div>
  </div>
);

const wrongColor = (pct) => {
  if (pct >= 60) return "text-red-400 bg-red-500/10 border-red-500/30";
  if (pct >= 30) return "text-yellow-400 bg-yellow-500/10 border-yellow-500/30";
  return "text-green-400 bg-green-500/10 border-green-500/30";
};

const rankBadge = (rank) => {
  if (rank === 1) return "bg-yellow-500/20 text-yellow-400";
  if (rank === 2) return "bg-gray-400/20 text-gray-300";
  if (rank === 3) return "bg-orange-500/20 text-orange-400";
  return "bg-gray-800 text-gray-500";
};

const TABS = [
  { key: "leaderboard", label: "Leaderboard" },
  { key: "analysis", label: "Question Analysis" },
];

const TeacherCustomTestResults = () => {
  const navigate = useNavigate();
  const { testId } = useParams();
  const [tab, setTab] = useState("leaderboard");
  const [search, setSearch] = useState("");

  const leaderboardQuery = useQuery({
    queryKey: ["custom-test-leaderboard", testId],
    queryFn: async () => (await api.get(`/teacher/custom-test/${testId}/results`)).data,
    enabled: !!testId,
  });

  const analysisQuery = useQuery({
    queryKey: ["custom-test-question-analysis", testId],
    queryFn: async () => (await api.get(`/teacher/custom-test/${testId}/question-analysis`)).data,
    enabled: !!testId && tab === "analysis",
  });

  const board = leaderboardQuery.data?.data;

  const filteredLeaderboard = useMemo(() => {
    if (!board) return [];
    const q = search.trim().toLowerCase();
    const combined = [...board.leaderboard, ...board.notAttempted];
    if (!q) return combined;
    return combined.filter((r) => r.name?.toLowerCase().includes(q) || r.phone?.includes(q));
  }, [board, search]);

  if (leaderboardQuery.isLoading) return <PageSkeleton />;

  if (leaderboardQuery.isError || !board) {
    return (
      <div className="min-h-screen bg-[#0A0D14] text-white flex items-center justify-center px-6 pb-24">
        <div className="max-w-md text-center space-y-4">
          <p className="text-gray-300">{leaderboardQuery.error?.response?.data?.message || "Data load nahi ho paaya."}</p>
          <button onClick={() => navigate("/TeacherCustomTests")} className="px-5 py-2 rounded-lg bg-[#7C3AED] hover:bg-[#6D28D9] text-sm font-medium">Wapas Jaayein</button>
        </div>
        <TeacherBottomNav />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0A0D14] text-white px-4 sm:px-6 py-8 pb-24">
      <div className="max-w-2xl mx-auto space-y-6">
        <button onClick={() => navigate("/TeacherCustomTests")} className="text-sm text-gray-400 hover:text-white flex items-center gap-1">&larr; Custom Tests Par Wapas</button>

        <div>
          <h1 className="text-2xl font-bold mb-1">{board.testName}</h1>
          <p className="text-gray-400 text-sm">{board.totalAttempted} / {board.totalBatchStudents} students ne diya &middot; {board.totalQuestions} sawaal &middot; max score {board.maxScore}</p>
        </div>

        <div className="flex gap-2">
          {TABS.map((t) => (
            <button key={t.key} onClick={() => setTab(t.key)} className={`px-4 py-1.5 rounded-full text-sm whitespace-nowrap transition-colors ${tab === t.key ? "bg-[#7C3AED] text-white" : "bg-[#111827] border border-gray-800 text-gray-400"}`}>
              {t.label}
            </button>
          ))}
        </div>

        {tab === "leaderboard" && (
          <>
            {/* 🆕 Search box */}
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Student ka naam ya phone search karein..."
              className="w-full px-4 py-2.5 text-sm bg-[#111827] border border-gray-800 focus:border-[#7C3AED] rounded-xl outline-none text-white placeholder-gray-600"
            />

            <div className="bg-[#111827] border border-gray-800 rounded-2xl overflow-hidden">
              {filteredLeaderboard.length === 0 ? (
                <p className="p-6 text-sm text-gray-400 text-center">Koi student nahi mila.</p>
              ) : (
                <div className="divide-y divide-gray-800">
                  {filteredLeaderboard.map((r) => (
                    <div key={r.studentId} className={`flex items-center justify-between px-4 py-3.5 gap-3 ${!r.attempted ? "opacity-50" : ""}`}>
                      <div className="flex items-center gap-3 min-w-0">
                        <span className={`w-8 h-8 flex-shrink-0 rounded-full flex items-center justify-center text-xs font-bold ${r.attempted ? rankBadge(r.rank) : "bg-gray-800 text-gray-600"}`}>
                          {r.attempted ? r.rank : "—"}
                        </span>
                        <div className="min-w-0">
                          <p className="text-sm font-medium truncate">{r.name}</p>
                          <p className="text-[11px] text-gray-500">
                            {r.attempted ? `${r.correctCount} sahi · ${r.wrongCount} galat · ${r.unattemptedCount} chhoda` : "Abhi tak attempt nahi kiya"}
                          </p>
                        </div>
                      </div>
                      {r.attempted && <span className="font-bold text-[#A78BFA] flex-shrink-0">{r.totalScore}</span>}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}

        {tab === "analysis" && (
          <>
            {analysisQuery.isLoading && (
              <div className="flex justify-center py-10">
                <div className="w-8 h-8 border-4 border-gray-700 border-t-[#8B5CF6] rounded-full animate-spin" />
              </div>
            )}

            {analysisQuery.isError && (
              <div className="p-4 bg-red-500/10 text-red-400 border border-red-500/25 rounded-xl text-sm text-center">
                {analysisQuery.error?.response?.data?.message || "Analysis load nahi ho paaya."}
              </div>
            )}

            {analysisQuery.data?.data && (
              <div className="space-y-4">
                {analysisQuery.data.data.questions.map((q) => (
                  <div key={q.questionId} className="bg-[#111827] border border-gray-800 rounded-2xl p-5">
                    <div className="flex items-center justify-between mb-3 gap-3 flex-wrap">
                      <span className="text-xs text-gray-500">Q{q.questionNumber} &middot; {q.subjectName} &middot; {q.topicName}</span>
                      <span className={`text-xs px-2.5 py-1 rounded-full border font-medium ${wrongColor(q.wrongPercentage)}`}>{q.wrongPercentage}% galat</span>
                    </div>
                    <p className="text-sm text-gray-200 mb-4 leading-relaxed">{q.question}</p>

                    <div className="space-y-2 mb-4">
                      {[1, 2, 3, 4].map((n) => {
                        const isCorrect = q.correctOption === n;
                        const pickPct = q.optionPickPercentage[`option${n}`] || 0;
                        return (
                          <div key={n} className="text-xs">
                            <div className="flex items-center justify-between mb-1">
                              <span className={isCorrect ? "text-green-400 font-medium" : "text-gray-400"}>
                                {n}. {q.options[`option${n}`]} {isCorrect && "✅"}
                              </span>
                              <span className="text-gray-500 flex-shrink-0 ml-2">{pickPct}%</span>
                            </div>
                            <div className="h-1.5 bg-[#1F2937] rounded-full overflow-hidden">
                              <div className={`h-full ${isCorrect ? "bg-green-500" : "bg-red-500/70"}`} style={{ width: `${pickPct}%` }} />
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    <p className="text-[11px] text-gray-500 mb-3">{q.totalAttempts} ne attempt kiya &middot; {q.unattemptedCount} ne chhoda</p>

                    {q.answerExplain && (
                      <div className="bg-[#1F2937]/50 border border-gray-700/50 rounded-lg p-3">
                        <p className="text-[10px] font-semibold tracking-wider text-purple-400 uppercase mb-1.5">Explanation</p>
                        <p className="text-xs text-gray-300 leading-relaxed">{q.answerExplain}</p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
      <TeacherBottomNav />
    </div>
  );
};

export default TeacherCustomTestResults;
