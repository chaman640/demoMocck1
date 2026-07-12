import React, { useState, useEffect, useMemo } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import api from "../api/api"; // 👈 Sahi import

// ──────────────────────────────────────────────
// 👇 NAYA: Skeleton loading building blocks
// ──────────────────────────────────────────────
const SkeletonBlock = ({ className = "" }) => (
  <div className={`bg-gray-800/70 rounded animate-pulse ${className}`} />
);

const TopicAnalysisSkeleton = () => (
  <div className="min-h-screen bg-[#0A0D14] text-white pb-16">
    <nav className="flex items-center justify-between px-6 py-5 max-w-7xl mx-auto border-b border-gray-800">
      <div className="flex items-center gap-2">
        <SkeletonBlock className="w-8 h-8 rounded" />
        <SkeletonBlock className="w-32 h-5" />
      </div>
      <SkeletonBlock className="w-28 h-4" />
    </nav>

    <div className="max-w-4xl mx-auto px-6 mt-10 space-y-8">
      <div className="space-y-2">
        <SkeletonBlock className="w-56 h-7" />
        <SkeletonBlock className="w-72 h-4" />
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="bg-[#111827] border border-gray-800 rounded-2xl p-4">
            <SkeletonBlock className="w-16 h-3 mb-3" />
            <SkeletonBlock className="w-10 h-6" />
          </div>
        ))}
      </div>

      <div className="flex gap-2">
        {[1, 2, 3, 4].map((i) => (
          <SkeletonBlock key={i} className="w-20 h-8 rounded-full" />
        ))}
      </div>

      <div className="bg-[#111827] border border-gray-800 rounded-2xl p-6 space-y-5">
        <SkeletonBlock className="w-full h-4" />
        <SkeletonBlock className="w-full h-16" />
        <div className="space-y-3">
          {[1, 2, 3, 4].map((i) => (
            <SkeletonBlock key={i} className="w-full h-12 rounded-xl" />
          ))}
        </div>
      </div>
    </div>
  </div>
);

// ──────────────────────────────────────────────
// 👇 Status filter tabs — jaisa Question Review screen me hota hai
// ──────────────────────────────────────────────
const STATUS_FILTERS = [
  { key: "all", label: "All" },
  { key: "correct", label: "Correct" },
  { key: "wrong", label: "Wrong" },
  { key: "unattempted", label: "Unattempted" },
];

const UserTopicAnalysis = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // 👇 NAYA: status filter aur one-at-a-time navigation ke liye state
  const [statusFilter, setStatusFilter] = useState("all");
  const [index, setIndex] = useState(0);

  const subjectNameFromState = location.state?.subjectName;
  const examNameFromState = location.state?.examName;
  const topicNameFromState = location.state?.topicName;

  useEffect(() => {
    if (!topicNameFromState || !subjectNameFromState) {
      navigate('/UserAllAnalysis');
      return;
    }

    const fetchTopicAnalysis = async () => {
      try {
        setLoading(true);
        setError(null);

        let activeExamName = examNameFromState;

        if (!activeExamName) {
          const meRes = await api.get("/me");
          activeExamName = meRes.data.data.exam;
        }

        const examEncoded = encodeURIComponent(activeExamName);
        const subjectEncoded = encodeURIComponent(subjectNameFromState);
        const topicEncoded = encodeURIComponent(topicNameFromState);
        
        const res = await api.get(`/analysis/topic/active_user/${examEncoded}/${subjectEncoded}/${topicEncoded}`);

        setData(res.data.data);
      } catch (err) {
        setError(err.response?.data?.message || "Data laane mein error aaya.");
      } finally {
        setLoading(false);
      }
    };

    fetchTopicAnalysis();
  }, [examNameFromState, subjectNameFromState, topicNameFromState, navigate]);

  // 👇 NAYA: teeno arrays (goodAt/wrong/unattempted) ko ek sath combine karte hain,
  // har question pe isCorrect status tag laga ke — taaki ek hi list pe filter chal sake
  const combinedQuestions = useMemo(() => {
    if (!data) return [];
    const good = (data.goodAt || []).map((q) => ({ ...q, isCorrect: true }));
    const wrong = (data.wrong || []).map((q) => ({ ...q, isCorrect: false }));
    const unattempted = (data.unattempted || []).map((q) => ({ ...q, isCorrect: null }));
    return [...good, ...wrong, ...unattempted];
  }, [data]);

  const filteredQuestions = useMemo(() => {
    return combinedQuestions.filter((q) => {
      if (statusFilter === "correct") return q.isCorrect === true;
      if (statusFilter === "wrong") return q.isCorrect === false;
      if (statusFilter === "unattempted") return q.isCorrect === null;
      return true; // all
    });
  }, [combinedQuestions, statusFilter]);

  // Filter badalte hi pehle question pe wapas le jao
  useEffect(() => {
    setIndex(0);
  }, [statusFilter]);

  const currentQ = filteredQuestions[index];

  const counts = useMemo(() => {
    return {
      all: combinedQuestions.length,
      correct: data?.summary?.totalCorrect ?? 0,
      wrong: data?.summary?.totalWrong ?? 0,
      unattempted: data?.summary?.totalUnattempted ?? 0,
    };
  }, [combinedQuestions, data]);

  if (loading) {
    return <TopicAnalysisSkeleton />;
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[#0A0D14] text-white flex flex-col items-center justify-center px-6">
        <div className="bg-[#111827] border border-red-500/30 p-8 rounded-2xl max-w-md text-center shadow-2xl">
          <div className="w-16 h-16 bg-red-500/10 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4 text-3xl font-bold">
            !
          </div>
          <h2 className="text-xl font-bold mb-2">Oops! Error</h2>
          <p className="text-gray-400 mb-6 text-sm">{error}</p>
          <button 
            onClick={() => navigate('/UserAllAnalysis')}
            className="px-6 py-2 bg-[#7C3AED] hover:bg-[#6D28D9] text-white rounded-lg transition-colors text-sm font-medium"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="min-h-screen bg-[#0A0D14] text-white font-sans pb-16">
      
      {/* Navbar */}
      <nav className="flex items-center justify-between px-6 py-5 max-w-7xl mx-auto border-b border-gray-800">
        <div onClick={() => navigate('/HomePage')} className="flex items-center gap-2 cursor-pointer">
          <div className="w-8 h-8 rounded bg-gradient-to-br from-[#8B5CF6] to-[#6D28D9] flex items-center justify-center font-bold text-sm">
            mt
          </div>
          <span className="text-xl font-semibold tracking-wide">mockTest.in</span>
        </div>
        <button 
          onClick={() => navigate('/UserSubjectAnallysis', { 
            state: { examName: examNameFromState, subjectName: data.subjectName } 
          })}
          className="text-sm font-medium text-gray-400 hover:text-white transition-colors"
        >
          &larr; Back to {data.subjectName}
        </button>
      </nav>

      {/* Main Container */}
      <div className="max-w-4xl mx-auto px-6 mt-10 space-y-8">
        
        {/* 👇 UPDATED: "Topic Deep Research —" hataya, sirf topic name */}
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-[#A78BFA]">{data.topicName}</h1>
          <p className="text-gray-400 mt-2 text-sm">Subject: {data.subjectName} &middot; Combined data from all lifetime mocks</p>
        </div>

        {/* 👇 UPDATED: Stats Row — ab Unattempted bhi shaamil hai */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          <div className="bg-[#111827] border border-gray-800 rounded-2xl p-4 shadow-lg">
            <p className="text-xs text-gray-500 font-medium mb-1">Efficiency</p>
            <p className="text-xl sm:text-2xl font-bold text-[#A78BFA]">{data.summary?.efficiency}%</p>
          </div>
          <div className="bg-[#111827] border border-gray-800 rounded-2xl p-4 shadow-lg">
            <p className="text-xs text-gray-500 font-medium mb-1">Attempted</p>
            <p className="text-xl sm:text-2xl font-bold text-white">{data.summary?.totalAttempted}</p>
          </div>
          <div className="bg-[#111827] border border-gray-800 rounded-2xl p-4 shadow-lg">
            <p className="text-xs text-gray-500 font-medium mb-1">Correct</p>
            <p className="text-xl sm:text-2xl font-bold text-green-400">{data.summary?.totalCorrect}</p>
          </div>
          <div className="bg-[#111827] border border-gray-800 rounded-2xl p-4 shadow-lg">
            <p className="text-xs text-gray-500 font-medium mb-1">Wrong</p>
            <p className="text-xl sm:text-2xl font-bold text-red-400">{data.summary?.totalWrong}</p>
          </div>
          <div className="bg-[#111827] border border-gray-800 rounded-2xl p-4 shadow-lg col-span-2 sm:col-span-1">
            <p className="text-xs text-gray-500 font-medium mb-1">Unattempted</p>
            <p className="text-xl sm:text-2xl font-bold text-gray-300">{data.summary?.totalUnattempted}</p>
          </div>
        </div>

        {/* 👇 NAYA: Status filter tabs — jaisa reference screenshot me hai */}
        <div className="flex gap-2 overflow-x-auto pb-1">
          {STATUS_FILTERS.map((f) => (
            <button
              key={f.key}
              onClick={() => setStatusFilter(f.key)}
              className={`px-4 py-1.5 rounded-full text-sm whitespace-nowrap transition-colors ${
                statusFilter === f.key
                  ? "bg-[#7C3AED] text-white"
                  : "bg-[#111827] border border-gray-800 text-gray-400 hover:text-gray-200"
              }`}
            >
              {f.label} ({counts[f.key]})
            </button>
          ))}
        </div>

        {/* 👇 NAYA: Ek-ek question dikhna, Prev/Next se navigate */}
        {filteredQuestions.length === 0 && (
          <div className="bg-[#111827] border border-gray-800 rounded-xl p-6 text-gray-500 text-sm text-center">
            Is category mein koi sawaal nahi hai.
          </div>
        )}

        {currentQ && (
          <>
            <p className="text-xs text-gray-500">
              Question {index + 1} of {filteredQuestions.length} &middot; {data.topicName}
            </p>
            <QuestionCard q={currentQ} index={index} />

            <div className="flex justify-between items-center pt-2">
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
};

// ── Question Card Component (Dark Theme UI) ──
const QuestionCard = ({ q, index }) => {
  const statusLabel =
    q.isCorrect === true ? "Correct" : q.isCorrect === false ? "Wrong" : "Unattempted";
  const statusColor =
    q.isCorrect === true
      ? "text-green-400 bg-green-500/10 border-green-500/30"
      : q.isCorrect === false
      ? "text-red-400 bg-red-500/10 border-red-500/30"
      : "text-gray-400 bg-gray-500/10 border-gray-500/30";
  const borderColorClass =
    q.isCorrect === true ? "border-l-green-500" : q.isCorrect === false ? "border-l-red-500" : "border-l-yellow-500";

  return (
    <div className={`bg-[#111827] border border-gray-800 rounded-xl p-5 sm:p-6 shadow-md border-l-4 ${borderColorClass}`}>
      
      {/* Meta info */}
      <div className="flex items-center justify-between gap-3 mb-4">
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-500 font-mono">
          <span>Mock ID: {String(q.performanceId).slice(-6)}</span>
          <span>•</span>
          <span>{new Date(q.mockDate).toLocaleDateString("hi-IN", { day: 'numeric', month: 'short', year: 'numeric' })}</span>
          <span>•</span>
          <span>Time: {q.timeTakenInSeconds ?? "—"}s</span>
        </div>
        <span className={`text-xs px-2.5 py-1 rounded-full border font-medium flex-shrink-0 ${statusColor}`}>
          {statusLabel}
        </span>
      </div>

      {/* Question */}
      <p className="text-base sm:text-lg font-medium text-gray-200 mb-5 leading-relaxed">
        <span className="text-gray-500 mr-2">Q{index + 1}.</span> 
        {q.question}
      </p>

      {/* Options */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-5">
        {[1, 2, 3, 4].map((n) => {
          const isCorrect = q.correctOption === n;
          const isUser = q.userAnswer === String(n);
          
          let optionStyle = "bg-[#1F2937] border-gray-700 text-gray-400";
          
          if (isCorrect) {
            optionStyle = "bg-green-500/10 border-green-500/30 text-green-400 font-semibold";
          } else if (isUser && !isCorrect) {
            optionStyle = "bg-red-500/10 border-red-500/30 text-red-400 font-semibold";
          }

          return (
            <div
              key={n}
              className={`p-3 rounded-lg border text-sm flex items-start gap-3 ${optionStyle}`}
            >
              <span className="shrink-0">{n}.</span>
              <span className="flex-1">{q.options?.[`option${n}`]}</span>
              {isCorrect && <span className="shrink-0">✅</span>}
              {isUser && !isCorrect && <span className="shrink-0 text-xs mt-0.5">(Your Answer) ❌</span>}
            </div>
          );
        })}
      </div>

      {/* Explanation */}
      {q.answerExplain && (
        <div className="bg-[#1F2937]/50 border border-gray-700/50 rounded-lg p-4 mt-2">
          <p className="text-xs font-semibold tracking-wider text-purple-400 uppercase mb-2">Explanation</p>
          <p className="text-sm text-gray-300 leading-relaxed">{q.answerExplain}</p>
        </div>
      )}
    </div>
  );
};

export default UserTopicAnalysis;