import React, { useState, useEffect, useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import api from "../api/api";

const STATUS_FILTERS = [
  { key: "all", label: "All" },
  { key: "correct", label: "Correct" },
  { key: "wrong", label: "Wrong" },
  { key: "unattempted", label: "Unattempted" },
];

// ──────────────────────────────────────────────
// 👇 NAYA: Skeleton loading building blocks (spinner ki jagah)
// ──────────────────────────────────────────────
const SkeletonBlock = ({ className = "" }) => (
  <div className={`bg-gray-800/70 rounded animate-pulse ${className}`} />
);

const ChallengeReviewSkeleton = () => (
  <div className="min-h-screen bg-[#0A0D14] text-white px-4 sm:px-6 py-8">
    <div className="max-w-3xl mx-auto">
      <SkeletonBlock className="w-32 h-4 mb-6" />

      <SkeletonBlock className="w-48 h-7 mb-2" />
      <SkeletonBlock className="w-40 h-4 mb-6" />

      {/* Overview stats skeleton */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        {[1, 2, 3].map((i) => (
          <div key={i} className="bg-[#1F2937] rounded-xl p-4 text-center">
            <SkeletonBlock className="w-8 h-5 mx-auto mb-2" />
            <SkeletonBlock className="w-14 h-3 mx-auto" />
          </div>
        ))}
      </div>

      {/* Subject filter pills skeleton */}
      <div className="flex gap-2 mb-4 overflow-x-auto pb-1">
        {[1, 2, 3].map((i) => (
          <SkeletonBlock key={i} className="w-24 h-8 rounded-full flex-shrink-0" />
        ))}
      </div>

      {/* Status filter pills skeleton */}
      <div className="flex gap-2 mb-6 overflow-x-auto pb-1">
        {[1, 2, 3, 4].map((i) => (
          <SkeletonBlock key={i} className="w-24 h-8 rounded-full flex-shrink-0" />
        ))}
      </div>

      <SkeletonBlock className="w-44 h-3 mb-3" />

      {/* Question detail card skeleton */}
      <div className="bg-[#111827] border border-gray-800 rounded-2xl p-6">
        <div className="flex items-center justify-between mb-4 gap-3">
          <SkeletonBlock className="w-20 h-3" />
          <SkeletonBlock className="w-16 h-5 rounded-full" />
        </div>
        <SkeletonBlock className="w-full h-5 mb-2" />
        <SkeletonBlock className="w-3/4 h-5 mb-6" />
        <div className="space-y-2.5 mb-6">
          {[1, 2, 3, 4].map((i) => (
            <SkeletonBlock key={i} className="w-full h-11 rounded-xl" />
          ))}
        </div>
        <SkeletonBlock className="w-full h-20 rounded-lg" />
      </div>

      {/* Prev/Next skeleton */}
      <div className="flex justify-between items-center mt-6">
        <SkeletonBlock className="w-28 h-10 rounded-lg" />
        <SkeletonBlock className="w-24 h-10 rounded-lg" />
      </div>
    </div>
  </div>
);

// ── Single question ka poora detail card — MockTest.jsx wale se same pattern ──
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

const ChallengeReview = () => {
  const navigate = useNavigate();
  const { code } = useParams();

  const [subjectFilter, setSubjectFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [index, setIndex] = useState(0);

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["challenge-attempt-detail", code],
    queryFn: async () => {
      const res = await api.get(`/challenge/${code}/my-attempt`);
      return res.data.data;
    },
    enabled: !!code,
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

  useEffect(() => {
    setIndex(0);
  }, [subjectFilter, statusFilter]);

  const currentQ = filteredQuestions[index];

  const counts = useMemo(() => {
    const base = allQuestions.filter(
      (q) => subjectFilter === "all" || q.subjectName === subjectFilter
    );
    return {
      all: base.length,
      correct: base.filter((q) => q.isCorrect === true).length,
      wrong: base.filter((q) => q.isCorrect === false).length,
      unattempted: base.filter((q) => q.isCorrect === null).length,
    };
  }, [allQuestions, subjectFilter]);

  if (isLoading) {
    return <ChallengeReviewSkeleton />;
  }

  if (isError) {
    return (
      <div className="min-h-screen bg-[#0A0D14] text-white flex items-center justify-center px-6">
        <div className="max-w-md text-center space-y-4">
          <p className="text-gray-300">
            {error?.response?.data?.message || "Data load nahi ho paaya."}
          </p>
          <button
            onClick={() => navigate("/HomePage")}
            className="px-5 py-2 rounded-lg bg-[#7C3AED] hover:bg-[#6D28D9] text-sm font-medium"
          >
            Home Jaayein
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0A0D14] text-white px-4 sm:px-6 py-8">
      <div className="max-w-3xl mx-auto">
        <button
          onClick={() => navigate(-1)}
          className="text-sm text-gray-400 hover:text-white mb-6 flex items-center gap-1"
        >
          &larr; Wapas Jaayein
        </button>

        <h1 className="text-xl sm:text-2xl font-bold mb-1">Detailed Analysis</h1>
        <p className="text-gray-400 text-sm mb-6">{data?.blueprintName}</p>

        {/* Overview stats */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          <div className="bg-[#1F2937] rounded-xl p-4 text-center">
            <p className="text-lg font-bold text-green-400">{data?.overview?.correctCount}</p>
            <p className="text-[11px] text-gray-500">Correct</p>
          </div>
          <div className="bg-[#1F2937] rounded-xl p-4 text-center">
            <p className="text-lg font-bold text-red-400">{data?.overview?.wrongCount}</p>
            <p className="text-[11px] text-gray-500">Wrong</p>
          </div>
          <div className="bg-[#1F2937] rounded-xl p-4 text-center">
            <p className="text-lg font-bold text-gray-300">{data?.overview?.unattemptedCount}</p>
            <p className="text-[11px] text-gray-500">Unattempted</p>
          </div>
        </div>

        {/* Subject filter — sirf tabhi dikhega jab 1 se zyada subject ho */}
        {subjects.length > 1 && (
          <div className="flex gap-2 mb-4 overflow-x-auto pb-1">
            <button
              onClick={() => setSubjectFilter("all")}
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
                onClick={() => setSubjectFilter(s)}
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

        {/* Status filter — All / Correct / Wrong / Unattempted */}
        <div className="flex gap-2 mb-6 overflow-x-auto pb-1">
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
};

export default ChallengeReview;