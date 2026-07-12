import React, { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import api from "../api/api";

// ──────────────────────────────────────────────
// 👇 NAYA: Seconds ko readable "Xm Ys" format me convert karta hai
// ──────────────────────────────────────────────
const formatDuration = (totalSeconds) => {
  if (totalSeconds == null || isNaN(totalSeconds)) return "N/A";
  const safe = Math.max(0, Math.round(totalSeconds));
  const mins = Math.floor(safe / 60);
  const secs = safe % 60;
  if (mins === 0) return `${secs}s`;
  return `${mins}m ${secs}s`;
};

// ──────────────────────────────────────────────
// 👇 NAYA: Skeleton loading building blocks
// ──────────────────────────────────────────────
const SkeletonBlock = ({ className = "" }) => (
  <div className={`bg-gray-800/70 rounded animate-pulse ${className}`} />
);

const AnalysisPageSkeleton = () => (
  <div className="min-h-screen bg-[#0A0D14] text-white pb-16">
    <nav className="flex items-center justify-between px-6 py-5 max-w-7xl mx-auto border-b border-gray-800">
      <div className="flex items-center gap-2">
        <SkeletonBlock className="w-8 h-8 rounded" />
        <SkeletonBlock className="w-32 h-5" />
      </div>
      <SkeletonBlock className="w-24 h-4" />
    </nav>

    <div className="max-w-5xl mx-auto px-6 mt-10 space-y-8">
      <div className="space-y-2">
        <SkeletonBlock className="w-64 h-8" />
        <SkeletonBlock className="w-48 h-4" />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="bg-[#111827] border border-gray-800 rounded-2xl p-6">
          <SkeletonBlock className="w-36 h-3 mb-3" />
          <SkeletonBlock className="w-20 h-9" />
        </div>
        <div className="bg-[#111827] border border-gray-800 rounded-2xl p-6">
          <SkeletonBlock className="w-36 h-3 mb-3" />
          <SkeletonBlock className="w-20 h-9" />
        </div>
      </div>

      <div className="bg-[#111827] border border-gray-800 rounded-2xl overflow-hidden">
        <div className="px-6 py-5 border-b border-gray-800">
          <SkeletonBlock className="w-40 h-4 mb-2" />
          <SkeletonBlock className="w-56 h-3" />
        </div>
        <div className="p-6 space-y-4">
          {[1, 2, 3].map((i) => (
            <SkeletonBlock key={i} className="w-full h-10" />
          ))}
        </div>
      </div>

      <div className="bg-[#111827] border border-gray-800 rounded-2xl overflow-hidden">
        <div className="px-6 py-5 border-b border-gray-800">
          <SkeletonBlock className="w-32 h-4 mb-2" />
          <SkeletonBlock className="w-56 h-3" />
        </div>
        <div className="p-6 space-y-4">
          {[1, 2, 3, 4].map((i) => (
            <SkeletonBlock key={i} className="w-full h-9" />
          ))}
        </div>
      </div>
    </div>
  </div>
);

const MockDetailSkeleton = () => (
  <div className="min-h-screen bg-[#0A0D14] text-white px-6 py-12">
    <div className="max-w-2xl mx-auto space-y-6">
      <SkeletonBlock className="w-40 h-4" />
      <div className="space-y-2">
        <SkeletonBlock className="w-56 h-6" />
        <SkeletonBlock className="w-32 h-3" />
      </div>
      <div className="bg-[#111827] border border-gray-800 rounded-2xl p-8 flex flex-col items-center gap-3">
        <SkeletonBlock className="w-24 h-10" />
        <SkeletonBlock className="w-40 h-3" />
      </div>
      <div className="grid grid-cols-3 gap-4">
        {[1, 2, 3].map((i) => (
          <SkeletonBlock key={i} className="h-20 rounded-xl" />
        ))}
      </div>
      <SkeletonBlock className="w-full h-12 rounded-lg" />
    </div>
  </div>
);

const UserAllAnalysis = () => {
  const navigate = useNavigate();
  const [overview, setOverview] = useState(null);
  const [examName, setExamName] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // 👇 NAYA: Subject-wise question count, blueprint se aata hai
  const [subjectQuestionCounts, setSubjectQuestionCounts] = useState({});

  const [viewingMockId, setViewingMockId] = useState(null);

  React.useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);

        const meRes = await api.get("/me");
        const userExam = meRes.data.data.exam;
        setExamName(userExam);

        const encodedExam = encodeURIComponent(userExam);

        // Overview aur blueprints dono ek sath fetch karte hain
        const [overviewRes, blueprintsRes] = await Promise.all([
          api.get(`/analysis/overview/active_user/${encodedExam}`),
          api.get(`/blueprints/${encodedExam}`).catch(() => ({ data: { data: [] } })), // fail ho to bhi crash na ho
        ]);

        setOverview(overviewRes.data.data);

        // 👇 NAYA: Har subject ka questionCount map bana lo (pehla blueprint jisme wo subject mile)
        const countMap = {};
        (blueprintsRes.data.data || []).forEach((bp) => {
          (bp.subjects || []).forEach((s) => {
            if (!(s.subjectName in countMap)) {
              countMap[s.subjectName] = s.questionCount;
            }
          });
        });
        setSubjectQuestionCounts(countMap);
      } catch (err) {
        setError(err.response?.data?.message || err.message || "Data laane mein error aaya.");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const sortedHistory = useMemo(() => {
    if (!overview?.graphData) return [];
    return [...overview.graphData].reverse();
  }, [overview]);

  if (loading) {
    return <AnalysisPageSkeleton />;
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[#0A0D14] text-white flex flex-col items-center justify-center px-6">
        <div className="bg-[#111827] border border-red-500/30 p-8 rounded-2xl max-w-md text-center shadow-2xl">
          <div className="w-16 h-16 bg-red-500/10 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4 text-3xl font-bold">
            !
          </div>
          <h2 className="text-xl font-bold mb-2">Oops! Error Aaya</h2>
          <p className="text-gray-400 mb-6 text-sm">{error}</p>
          <button 
            onClick={() => navigate('/Login')}
            className="px-6 py-2 bg-[#7C3AED] hover:bg-[#6D28D9] text-white rounded-lg transition-colors text-sm font-medium"
          >
            Login Page Par Jaayein
          </button>
        </div>
      </div>
    );
  }

  if (!overview) {
    return (
      <div className="min-h-screen bg-[#0A0D14] text-white flex flex-col items-center justify-center px-6">
        <div className="bg-[#111827] border border-gray-800 p-8 rounded-2xl max-w-md text-center shadow-2xl">
          <div className="w-16 h-16 bg-blue-500/10 text-blue-400 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h2 className="text-xl font-bold mb-2">Koi Data Nahi Mila</h2>
          <p className="text-gray-400 mb-6 text-sm">Aapne abhi tak {examName} ka koi mock test nahi diya hai.</p>
          <button 
            onClick={() => navigate('/MockTest')}
            className="px-6 py-2 bg-[#7C3AED] hover:bg-[#6D28D9] text-white rounded-lg transition-colors text-sm font-medium"
          >
            Test Dena Shuru Karein
          </button>
        </div>
      </div>
    );
  }

  if (viewingMockId) {
    return (
      <MockDetailScreen
        performanceId={viewingMockId}
        onBack={() => setViewingMockId(null)}
      />
    );
  }

  return (
    <div className="min-h-screen bg-[#0A0D14] text-white font-sans selection:bg-[#7C3AED] selection:text-white pb-16">
      
      {/* Navbar */}
      <nav className="flex items-center justify-between px-6 py-5 max-w-7xl mx-auto border-b border-gray-800">
        <div onClick={() => navigate('/HomePage')} className="flex items-center gap-2 cursor-pointer">
          <div className="w-8 h-8 rounded bg-gradient-to-br from-[#8B5CF6] to-[#6D28D9] flex items-center justify-center font-bold text-sm">
            mt
          </div>
          <span className="text-xl font-semibold tracking-wide">mockTest.in</span>
        </div>
        <button 
          onClick={() => navigate('/HomePage')}
          className="text-sm font-medium text-gray-400 hover:text-white transition-colors"
        >
          &larr; Back to Home
        </button>
      </nav>

      {/* Main Container */}
      <div className="max-w-5xl mx-auto px-6 mt-10 space-y-8">
        
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Your Detailed Analysis</h1>
          <p className="text-gray-400 mt-2 text-sm">Based on your performance in <span className="text-[#A78BFA] font-medium">{examName}</span> mocks.</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="bg-[#111827] border border-gray-800 rounded-2xl p-6 shadow-lg">
            <p className="text-sm text-gray-500 font-medium mb-1">Average Score (Last 3)</p>
            <p className="text-4xl font-bold text-[#A78BFA]">{overview.averageScore}%</p>
          </div>
          <div className="bg-[#111827] border border-gray-800 rounded-2xl p-6 shadow-lg">
            <p className="text-sm text-gray-500 font-medium mb-1">Total Mocks Attempted</p>
            <p className="text-4xl font-bold text-white">{overview.totalTestsGiven}</p>
          </div>
        </div>

        {/* Subject-wise Analysis Table */}
        <div className="bg-[#111827] border border-gray-800 rounded-2xl overflow-hidden shadow-lg">
          <div className="px-6 py-5 border-b border-gray-800 bg-[#1F2937]/30">
            <h3 className="font-semibold text-lg">Subject Analysis</h3>
            <p className="text-xs text-gray-500 mt-1">Last 3 mocks ka average data</p>
          </div>
          
          {overview.subjectAnalysis?.length === 0 ? (
            <div className="p-8 text-center text-yellow-500 bg-yellow-500/5">
              Subject analysis data khali hai. Apne agle mock ke baad check karein.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-[#1A2235] text-gray-400 text-xs uppercase tracking-wider">
                    <th className="px-6 py-4 font-medium">Subject Name</th>
                    <th className="px-6 py-4 font-medium">Avg. Accuracy</th>
                    <th className="px-6 py-4 font-medium">Total Time (Subject)</th>
                    <th className="px-6 py-4 font-medium">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-800">
                  {overview.subjectAnalysis?.map((s, i) => {
                    // 👇 NAYA: averageTimePerQuestion × us subject ke total questions = poora subject attempt karne ka time
                    const qCount = subjectQuestionCounts[s.subjectName];
                    const totalTimeSeconds =
                      qCount != null ? s.averageTimePerQuestion * qCount : null;

                    return (
                      <tr key={i} className="hover:bg-[#1F2937]/50 transition-colors">
                        <td className="px-6 py-4 text-sm font-medium text-gray-200">{s.subjectName}</td>
                        <td className="px-6 py-4 text-sm">
                          <span className={`px-2.5 py-1 rounded-md text-xs font-semibold ${s.averageAccuracy >= 70 ? 'bg-green-500/10 text-green-400' : s.averageAccuracy >= 40 ? 'bg-yellow-500/10 text-yellow-400' : 'bg-red-500/10 text-red-400'}`}>
                            {s.averageAccuracy}%
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-400">
                          {formatDuration(totalTimeSeconds)}
                          {qCount != null && (
                            <span className="text-gray-600 text-xs ml-1">({qCount}Q)</span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-400">
                          <button 
                            onClick={() => navigate('/UserSubjectAnallysis', { 
                              state: { subjectName: s.subjectName, examName: examName } 
                            })}
                            className="text-[#8B5CF6] hover:text-white transition-colors font-medium text-xs flex items-center gap-1"
                          >
                            View Deep &rarr;
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Mock History — latest-first, date+time ke sath, clickable */}
        <div className="bg-[#111827] border border-gray-800 rounded-2xl overflow-hidden shadow-lg">
          <div className="px-6 py-5 border-b border-gray-800 bg-[#1F2937]/30">
            <h3 className="font-semibold text-lg">Test History</h3>
            <p className="text-xs text-gray-500 mt-1">Kisi bhi mock par click karke uska poora result dekhein</p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-[#1A2235] text-gray-400 text-xs uppercase tracking-wider">
                  <th className="px-6 py-4 font-medium">Date &amp; Time</th>
                  <th className="px-6 py-4 font-medium">Score</th>
                  <th className="px-6 py-4 font-medium text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800">
                {sortedHistory.map((g, i) => (
                  <tr
                    key={i}
                    onClick={() => setViewingMockId(g.performanceId)}
                    className="hover:bg-[#1F2937]/50 transition-colors cursor-pointer"
                  >
                    <td className="px-6 py-4 text-sm text-gray-300">
                      {new Date(g.date).toLocaleString("en-IN", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </td>
                    <td className="px-6 py-4 text-sm font-bold text-white">{g.score}</td>
                    <td className="px-6 py-4 text-sm text-right">
                      <span className="text-[#8B5CF6] hover:text-white transition-colors font-medium text-xs">
                        View Result &rarr;
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </div>
  );
};

// ──────────────────────────────────────────────
// 👇 Ek specific mock ka poora result + question review
// ──────────────────────────────────────────────

const Stat = ({ label, value }) => (
  <div className="bg-[#1F2937] border border-gray-800 rounded-xl p-4 text-center">
    <p className="text-xl font-bold">{value}</p>
    <p className="text-[11px] text-gray-500 mt-1">{label}</p>
  </div>
);

const STATUS_FILTERS = [
  { key: "all", label: "All" },
  { key: "correct", label: "Correct" },
  { key: "wrong", label: "Wrong" },
  { key: "unattempted", label: "Unattempted" },
];

const MockDetailScreen = ({ performanceId, onBack }) => {
  const [subjectFilter, setSubjectFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState(null);
  const [index, setIndex] = useState(0);

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["mock-detail", performanceId],
    queryFn: async () => {
      const res = await api.get(`/analysis/mock-detail/${performanceId}`);
      return res.data;
    },
    enabled: !!performanceId,
  });

  const allQuestions = data?.questionBreakdown || [];

  const subjects = useMemo(() => {
    const set = new Set(allQuestions.map((q) => q.subjectName).filter(Boolean));
    return Array.from(set);
  }, [allQuestions]);

  const filteredQuestions = useMemo(() => {
    return allQuestions.filter((q) => {
      const subjMatch = subjectFilter === "all" || q.subjectName === subjectFilter;
      let statusMatch = true;
      if (statusFilter === "correct") statusMatch = q.isCorrect === true;
      else if (statusFilter === "wrong") statusMatch = q.isCorrect === false;
      else if (statusFilter === "unattempted") statusMatch = q.isCorrect === null;
      return subjMatch && statusMatch;
    });
  }, [allQuestions, subjectFilter, statusFilter]);

  const currentQ = filteredQuestions[index];

  const openReview = (filter = "all") => {
    setStatusFilter(filter);
    setIndex(0);
  };

  const closeReview = () => {
    setStatusFilter(null);
  };

  if (isLoading) {
    return <MockDetailSkeleton />;
  }

  if (isError || !data) {
    return (
      <div className="min-h-screen bg-[#0A0D14] text-white flex items-center justify-center px-6">
        <div className="max-w-md text-center space-y-4">
          <p className="text-gray-300">{error?.response?.data?.message || "Data load nahi ho paaya."}</p>
          <button
            onClick={onBack}
            className="px-5 py-2 rounded-lg bg-[#7C3AED] hover:bg-[#6D28D9] text-sm font-medium"
          >
            Wapas Jaayein
          </button>
        </div>
      </div>
    );
  }

  const { overview } = data;

  if (statusFilter) {
    return (
      <div className="min-h-screen bg-[#0A0D14] text-white px-4 sm:px-6 py-8">
        <div className="max-w-3xl mx-auto">
          <button
            onClick={closeReview}
            className="text-sm text-gray-400 hover:text-white mb-6 flex items-center gap-1"
          >
            &larr; Result par wapas jaayein
          </button>

          <h1 className="text-xl sm:text-2xl font-bold mb-4">Question Review</h1>

          {subjects.length > 1 && (
            <div className="flex gap-2 mb-4 overflow-x-auto pb-1">
              <button
                onClick={() => { setSubjectFilter("all"); setIndex(0); }}
                className={`px-4 py-1.5 rounded-full text-sm whitespace-nowrap transition-colors ${
                  subjectFilter === "all"
                    ? "bg-[#7C3AED] text-white"
                    : "bg-[#111827] border border-gray-800 text-gray-400 hover:text-gray-200"
                }`}
              >
                Sabhi Subjects
              </button>
              {subjects.map((s) => (
                <button
                  key={s}
                  onClick={() => { setSubjectFilter(s); setIndex(0); }}
                  className={`px-4 py-1.5 rounded-full text-sm whitespace-nowrap transition-colors ${
                    subjectFilter === s
                      ? "bg-[#7C3AED] text-white"
                      : "bg-[#111827] border border-gray-800 text-gray-400 hover:text-gray-200"
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
          )}

          <div className="flex gap-2 mb-6 overflow-x-auto pb-1">
            {STATUS_FILTERS.map((f) => (
              <button
                key={f.key}
                onClick={() => { setStatusFilter(f.key); setIndex(0); }}
                className={`px-4 py-1.5 rounded-full text-sm whitespace-nowrap transition-colors ${
                  statusFilter === f.key
                    ? "bg-[#7C3AED] text-white"
                    : "bg-[#111827] border border-gray-800 text-gray-400 hover:text-gray-200"
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          {filteredQuestions.length === 0 && (
            <p className="text-gray-400 text-sm py-10 text-center">
              Is category mein koi sawaal nahi hai.
            </p>
          )}

          {currentQ && (
            <>
              <p className="text-xs text-gray-500 mb-3">
                Question {index + 1} of {filteredQuestions.length} &middot; {currentQ.subjectName}
              </p>
              <QuestionDetailCard q={currentQ} />

              <div className="flex justify-between items-center mt-6">
                <button
                  onClick={() => setIndex((i) => Math.max(0, i - 1))}
                  disabled={index === 0}
                  className="px-4 py-2 rounded-lg border border-gray-700 text-sm text-gray-300 hover:border-gray-500 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  &larr; Previous
                </button>
                <button
                  onClick={() => setIndex((i) => Math.min(filteredQuestions.length - 1, i + 1))}
                  disabled={index >= filteredQuestions.length - 1}
                  className="px-4 py-2 rounded-lg bg-[#7C3AED] hover:bg-[#6D28D9] text-sm font-medium disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Next &rarr;
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0A0D14] text-white px-6 py-12">
      <div className="max-w-2xl mx-auto">
        <button
          onClick={onBack}
          className="text-sm text-gray-400 hover:text-white mb-6 flex items-center gap-1"
        >
          &larr; Test History par wapas jaayein
        </button>

        <h1 className="text-2xl font-bold mb-1">{overview.blueprintName}</h1>
        <p className="text-gray-400 text-sm mb-8">{overview.examName}</p>

        <div className="bg-[#111827] border border-gray-800 rounded-2xl p-8 text-center mb-6">
          <p className="text-5xl font-bold text-[#A78BFA]">{overview.totalScore}</p>
          <p className="text-sm text-gray-500 mt-1">Total Score &middot; {overview.accuracy}% Accuracy</p>
        </div>

        <div className="grid grid-cols-3 gap-4 mb-8">
          <button
            onClick={() => openReview("correct")}
            className="bg-[#1F2937] border border-gray-800 hover:border-green-500/50 rounded-xl p-4 text-center transition-colors"
          >
            <p className="text-xl font-bold text-green-400">{overview.correct}</p>
            <p className="text-[11px] text-gray-500 mt-1">Correct</p>
          </button>
          <button
            onClick={() => openReview("wrong")}
            className="bg-[#1F2937] border border-gray-800 hover:border-red-500/50 rounded-xl p-4 text-center transition-colors"
          >
            <p className="text-xl font-bold text-red-400">{overview.wrong}</p>
            <p className="text-[11px] text-gray-500 mt-1">Wrong</p>
          </button>
          <button
            onClick={() => openReview("unattempted")}
            className="bg-[#1F2937] border border-gray-800 hover:border-gray-500/50 rounded-xl p-4 text-center transition-colors"
          >
            <p className="text-xl font-bold text-gray-300">{overview.unattempted}</p>
            <p className="text-[11px] text-gray-500 mt-1">Unattempted</p>
          </button>
        </div>

        <button
          onClick={() => openReview("all")}
          className="w-full py-3 rounded-lg bg-[#7C3AED] hover:bg-[#6D28D9] text-sm font-medium"
        >
          Sabhi Sawaal Dekhein
        </button>
      </div>
    </div>
  );
};

// ──────────────────────────────────────────────
// 👇 Single question detail card (options + explanation)
// ──────────────────────────────────────────────
const QuestionDetailCard = ({ q }) => {
  const statusLabel =
    q.isCorrect === true ? "Correct" : q.isCorrect === false ? "Wrong" : "Unattempted";
  const statusColor =
    q.isCorrect === true
      ? "text-green-400 bg-green-500/10 border-green-500/30"
      : q.isCorrect === false
      ? "text-red-400 bg-red-500/10 border-red-500/30"
      : "text-gray-400 bg-gray-500/10 border-gray-500/30";

  return (
    <div className="bg-[#111827] border border-gray-800 rounded-2xl p-6">
      <div className="flex items-center justify-between mb-4 gap-3">
        <span className="text-xs text-gray-500">{q.topicName}</span>
        <span className={`text-xs px-2.5 py-1 rounded-full border font-medium ${statusColor}`}>
          {statusLabel}
        </span>
      </div>

      <p className="text-base sm:text-lg mb-6 leading-relaxed">{q.question}</p>

      <div className="space-y-2.5 mb-6">
        {[1, 2, 3, 4].map((n) => {
          const optText = q.options?.[`option${n}`];
          const isCorrectOpt = q.correctOption === n;
          const isUserPick = q.userAnswer === String(n);

          let style = "border-gray-800 bg-[#1F2937] text-gray-300";
          if (isCorrectOpt) style = "border-green-500/40 bg-green-500/10 text-green-300";
          else if (isUserPick) style = "border-red-500/40 bg-red-500/10 text-red-300";

          return (
            <div key={n} className={`px-4 py-3 rounded-xl border flex items-center gap-3 ${style}`}>
              <span className="w-6 h-6 flex-shrink-0 rounded-full border border-current flex items-center justify-center text-xs">
                {n}
              </span>
              <span className="flex-1">{optText}</span>
              {isCorrectOpt && <span className="text-xs flex-shrink-0">✅ Sahi jawab</span>}
              {isUserPick && !isCorrectOpt && (
                <span className="text-xs flex-shrink-0">❌ Aapka jawab</span>
              )}
            </div>
          );
        })}
      </div>

      {q.userAnswer == null && (
        <p className="text-xs text-yellow-500 mb-4">Aapne ye sawaal attempt nahi kiya tha.</p>
      )}

      {q.timeTakenInSeconds != null && (
        <p className="text-xs text-gray-500 mb-4">Time liya gaya: {q.timeTakenInSeconds}s</p>
      )}

      {q.answerExplain && (
        <div className="bg-[#1F2937]/50 border border-gray-700/50 rounded-lg p-4">
          <p className="text-xs font-semibold tracking-wider text-purple-400 uppercase mb-2">
            Explanation
          </p>
          <p className="text-sm text-gray-300 leading-relaxed">{q.answerExplain}</p>
        </div>
      )}
    </div>
  );
};

export default UserAllAnalysis;