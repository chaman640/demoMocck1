import React, { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowLeft,
  ChevronRight,
  TrendingUp,
  ListChecks,
  Clock,
  Calendar,
  CheckCircle2,
  XCircle,
  Circle,
  AlertCircle,
  BarChart3,
} from "lucide-react";
import api from "../api/api";

// ──────────────────────────────────────────────
// Seconds ko readable "Xm Ys" format me convert karta hai
// ──────────────────────────────────────────────
const formatDuration = (totalSeconds) => {
  if (totalSeconds == null || isNaN(totalSeconds)) return "N/A";
  const safe = Math.max(0, Math.round(totalSeconds));
  const mins = Math.floor(safe / 60);
  const secs = safe % 60;
  if (mins === 0) return `${secs}s`;
  return `${mins}m ${secs}s`;
};

// Accuracy % ke hisaab se color tier — badge aur progress bar dono isi se rangte hain
const getAccuracyTier = (accuracy) => {
  if (accuracy >= 70) return { text: "text-green-400", bg: "bg-green-500/10", bar: "bg-green-500" };
  if (accuracy >= 40) return { text: "text-yellow-400", bg: "bg-yellow-500/10", bar: "bg-yellow-500" };
  return { text: "text-red-400", bg: "bg-red-500/10", bar: "bg-red-500" };
};

// ──────────────────────────────────────────────
// Skeleton loading building blocks
// ──────────────────────────────────────────────
const SkeletonBlock = ({ className = "" }) => (
  <div className={`bg-gray-800/70 rounded animate-pulse ${className}`} />
);

const AnalysisPageSkeleton = () => (
  <div className="min-h-screen bg-[#0A0D14] text-white pb-16">
    <div className="sticky top-0 z-10 bg-[#0A0D14]/95 backdrop-blur border-b border-gray-800">
      <div className="max-w-lg mx-auto px-4 h-14 flex items-center gap-3">
        <SkeletonBlock className="w-11 h-11 rounded-full" />
        <SkeletonBlock className="w-20 h-4" />
      </div>
    </div>
    <div className="max-w-lg mx-auto px-4 mt-6 space-y-7">
      <div className="space-y-2">
        <SkeletonBlock className="w-40 h-7" />
        <SkeletonBlock className="w-52 h-4" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <SkeletonBlock className="h-24 rounded-2xl" />
        <SkeletonBlock className="h-24 rounded-2xl" />
      </div>
      <div className="space-y-3">
        <SkeletonBlock className="w-48 h-5" />
        {[1, 2, 3].map((i) => (
          <SkeletonBlock key={i} className="h-20 rounded-2xl" />
        ))}
      </div>
      <div className="space-y-3">
        <SkeletonBlock className="w-32 h-5" />
        <div className="flex gap-2">
          {[1, 2, 3].map((i) => (
            <SkeletonBlock key={i} className="w-24 h-10 rounded-full" />
          ))}
        </div>
        {[1, 2, 3].map((i) => (
          <SkeletonBlock key={i} className="h-16 rounded-2xl" />
        ))}
      </div>
    </div>
  </div>
);

const MockDetailSkeleton = () => (
  <div className="min-h-screen bg-[#0A0D14] text-white pb-16">
    <div className="sticky top-0 z-10 bg-[#0A0D14]/95 backdrop-blur border-b border-gray-800">
      <div className="max-w-lg mx-auto px-4 h-14 flex items-center gap-3">
        <SkeletonBlock className="w-11 h-11 rounded-full" />
        <SkeletonBlock className="w-28 h-4" />
      </div>
    </div>
    <div className="max-w-lg mx-auto px-4 mt-6 space-y-6">
      <div className="space-y-2">
        <SkeletonBlock className="w-48 h-6" />
        <SkeletonBlock className="w-28 h-3" />
      </div>
      <SkeletonBlock className="h-32 rounded-2xl" />
      <div className="grid grid-cols-3 gap-3">
        {[1, 2, 3].map((i) => (
          <SkeletonBlock key={i} className="h-20 rounded-xl" />
        ))}
      </div>
      <SkeletonBlock className="h-12 rounded-lg" />
    </div>
  </div>
);

// ──────────────────────────────────────────────
// Sticky header — back arrow + title, teeno screens mein reuse hota hai
// ──────────────────────────────────────────────
const ScreenHeader = ({ title, onBack }) => (
  <div className="sticky top-0 z-10 bg-[#0A0D14]/95 backdrop-blur border-b border-gray-800">
    <div className="max-w-lg mx-auto px-4 h-14 flex items-center gap-1">
      <button
        onClick={onBack}
        aria-label="Wapas jaayein"
        className="w-11 h-11 -ml-2 flex items-center justify-center rounded-full active:bg-gray-800 transition-colors flex-shrink-0"
      >
        <ArrowLeft className="w-5 h-5 text-gray-300" />
      </button>
      <span className="text-base font-semibold truncate">{title}</span>
    </div>
  </div>
);

// ──────────────────────────────────────────────
// Ek subject ka card — accuracy badge + progress bar + time, poora tappable
// ──────────────────────────────────────────────
const SubjectCard = ({ subjectName, accuracy, timeSeconds, onClick }) => {
  const tier = getAccuracyTier(accuracy);
  return (
    <button
      onClick={onClick}
      className="w-full text-left bg-[#111827] border border-gray-800 active:border-[#7C3AED]/60 rounded-2xl p-4 transition-colors"
    >
      <div className="flex items-center justify-between gap-3 mb-3">
        <h3 className="font-semibold text-base text-gray-100 truncate">{subjectName}</h3>
        <span className={`flex-shrink-0 px-2.5 py-1 rounded-full text-sm font-bold ${tier.bg} ${tier.text}`}>
          {accuracy}%
        </span>
      </div>
      <div className="w-full h-1.5 bg-gray-800 rounded-full overflow-hidden mb-3">
        <div
          className={`h-full ${tier.bar} rounded-full transition-all`}
          style={{ width: `${Math.min(100, Math.max(0, accuracy))}%` }}
        />
      </div>
      <div className="flex items-center justify-between">
        <span className="flex items-center gap-1.5 text-sm text-gray-500">
          <Clock className="w-4 h-4" />
          Time: {formatDuration(timeSeconds)}
        </span>
        <ChevronRight className="w-4 h-4 text-gray-600 flex-shrink-0" />
      </div>
    </button>
  );
};

// ──────────────────────────────────────────────
// Ek test-history entry ka card
// ──────────────────────────────────────────────
const TestHistoryCard = ({ blueprintName, mockType, date, score, onClick }) => (
  <button
    onClick={onClick}
    className="w-full text-left bg-[#111827] border border-gray-800 active:border-[#7C3AED]/60 rounded-2xl p-4 transition-colors"
  >
    <div className="flex items-center justify-between gap-3">
      <div className="min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <p className="font-medium text-sm text-gray-100 truncate">{blueprintName || "Mock Test"}</p>
          {mockType && (
            <span className="flex-shrink-0 text-[11px] px-1.5 py-0.5 rounded bg-gray-800 text-gray-400">
              {mockType}
            </span>
          )}
        </div>
        <p className="flex items-center gap-1.5 text-sm text-gray-500">
          <Calendar className="w-4 h-4 flex-shrink-0" />
          {new Date(date).toLocaleString("en-IN", {
            day: "numeric",
            month: "short",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
          })}
        </p>
      </div>
      <div className="flex items-center gap-1 flex-shrink-0">
        <span className="text-lg font-bold text-[#A78BFA]">{score}</span>
        <ChevronRight className="w-4 h-4 text-gray-600" />
      </div>
    </div>
  </button>
);

const MOCK_TYPE_FILTERS = [
  { key: "all", label: "Sabhi" },
  { key: "Full", label: "Full Mock" },
  { key: "Mini", label: "Mini Mock" },
];

const STATUS_FILTERS = [
  { key: "all", label: "Sabhi" },
  { key: "correct", label: "Sahi" },
  { key: "wrong", label: "Galat" },
  { key: "unattempted", label: "Chhoda Hua" },
];

const UserAllAnalysis = () => {
  const navigate = useNavigate();
  const [overview, setOverview] = useState(null);
  const [examName, setExamName] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [subjectQuestionCounts, setSubjectQuestionCounts] = useState({});
  const [blueprints, setBlueprints] = useState([]);

  const [mockTypeFilter, setMockTypeFilter] = useState("all");

  const [viewingMockId, setViewingMockId] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);

        const meRes = await api.get("/me");
        const userExam = meRes.data.data.exam;
        setExamName(userExam);

        const encodedExam = encodeURIComponent(userExam);

        const [overviewRes, blueprintsRes] = await Promise.all([
          api.get(`/analysis/overview/active_user/${encodedExam}`),
          api.get(`/blueprints/${encodedExam}`).catch(() => ({ data: { data: [] } })),
        ]);

        setOverview(overviewRes.data.data);

        const blueprintList = blueprintsRes.data.data || [];
        setBlueprints(blueprintList);

        const countMap = {};
        blueprintList.forEach((bp) => {
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

  const blueprintMetaMap = useMemo(() => {
    const map = {};
    blueprints.forEach((bp) => {
      map[bp.blueprintName] = {
        mockType: bp.mockType,
        subjectNames: (bp.subjects || []).map((s) => s.subjectName),
      };
    });
    return map;
  }, [blueprints]);

  const mockTypeCounts = useMemo(() => {
    const counts = { all: sortedHistory.length, Full: 0, Mini: 0 };
    sortedHistory.forEach((g) => {
      const meta = blueprintMetaMap[g.blueprintName];
      if (meta?.mockType === "Full") counts.Full++;
      else if (meta?.mockType === "Mini") counts.Mini++;
    });
    return counts;
  }, [sortedHistory, blueprintMetaMap]);

  const filteredHistory = useMemo(() => {
    return sortedHistory.filter((g) => {
      if (mockTypeFilter === "all") return true;
      const meta = blueprintMetaMap[g.blueprintName];
      return meta?.mockType === mockTypeFilter;
    });
  }, [sortedHistory, blueprintMetaMap, mockTypeFilter]);

  if (loading) {
    return <AnalysisPageSkeleton />;
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[#0A0D14] text-white flex flex-col items-center justify-center px-6">
        <div className="bg-[#111827] border border-red-500/30 p-8 rounded-2xl max-w-md w-full text-center shadow-2xl">
          <div className="w-14 h-14 bg-red-500/10 text-red-400 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="w-7 h-7" />
          </div>
          <h2 className="text-xl font-bold mb-2">Oops! Error Aaya</h2>
          <p className="text-gray-400 mb-6 text-sm">{error}</p>
          <button
            onClick={() => navigate('/Login')}
            className="w-full py-3 bg-[#7C3AED] hover:bg-[#6D28D9] text-white rounded-lg transition-colors text-sm font-medium"
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
        <div className="bg-[#111827] border border-gray-800 p-8 rounded-2xl max-w-md w-full text-center shadow-2xl">
          <div className="w-14 h-14 bg-[#7C3AED]/10 text-[#A78BFA] rounded-full flex items-center justify-center mx-auto mb-4">
            <BarChart3 className="w-7 h-7" />
          </div>
          <h2 className="text-xl font-bold mb-2">Koi Data Nahi Mila</h2>
          <p className="text-gray-400 mb-6 text-sm">Aapne abhi tak {examName} ka koi mock test nahi diya hai.</p>
          <button
            onClick={() => navigate('/MockTest')}
            className="w-full py-3 bg-[#7C3AED] hover:bg-[#6D28D9] text-white rounded-lg transition-colors text-sm font-medium"
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
    <div className="min-h-screen bg-[#0A0D14] text-white font-sans pb-16">
      <ScreenHeader title="Analysis" onBack={() => navigate('/HomePage')} />

      <div className="max-w-lg mx-auto px-4 mt-6 space-y-8">

        <div>
          <h1 className="text-2xl font-bold tracking-tight">Aapki Analysis</h1>
          <p className="text-gray-400 mt-1 text-sm">
            <span className="text-[#A78BFA] font-medium">{examName}</span> ke mocks ka summary
          </p>
        </div>

        {/* Summary stats */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-[#111827] border border-gray-800 rounded-2xl p-4">
            <div className="w-9 h-9 rounded-lg bg-[#7C3AED]/15 text-[#A78BFA] flex items-center justify-center mb-2.5">
              <TrendingUp className="w-5 h-5" />
            </div>
            <p className="text-2xl font-bold text-white">{overview.averageScore}%</p>
            <p className="text-sm text-gray-500 mt-0.5">Average Score</p>
          </div>
          <div className="bg-[#111827] border border-gray-800 rounded-2xl p-4">
            <div className="w-9 h-9 rounded-lg bg-blue-500/15 text-blue-400 flex items-center justify-center mb-2.5">
              <ListChecks className="w-5 h-5" />
            </div>
            <p className="text-2xl font-bold text-white">{overview.totalTestsGiven}</p>
            <p className="text-sm text-gray-500 mt-0.5">Mocks Diye</p>
          </div>
        </div>

        {/* Subject-wise performance */}
        <div>
          <h2 className="text-lg font-semibold mb-1">Subject-wise Performance</h2>
          <p className="text-sm text-gray-500 mb-3">Pichle 3 mocks ka average</p>

          {overview.subjectAnalysis?.length === 0 ? (
            <p className="text-sm text-yellow-500 bg-[#111827] border border-gray-800 rounded-2xl p-4 text-center">
              Agle mock ke baad yahan data dikhega.
            </p>
          ) : (
            <div className="space-y-2.5">
              {overview.subjectAnalysis?.map((s, i) => {
                const qCount = subjectQuestionCounts[s.subjectName];
                const totalTimeSeconds = qCount != null ? s.averageTimePerQuestion * qCount : null;
                return (
                  <SubjectCard
                    key={i}
                    subjectName={s.subjectName}
                    accuracy={s.averageAccuracy}
                    timeSeconds={totalTimeSeconds}
                    onClick={() =>
                      navigate('/UserSubjectAnallysis', {
                        state: { subjectName: s.subjectName, examName },
                      })
                    }
                  />
                );
              })}
            </div>
          )}
        </div>

        {/* Test History */}
        <div>
          <h2 className="text-lg font-semibold mb-1">Test History</h2>
          <p className="text-sm text-gray-500 mb-3">Kisi bhi test par tap karke poora result dekhein</p>

          <div className="flex gap-2 overflow-x-auto pb-1 mb-4">
            {MOCK_TYPE_FILTERS.map((f) => (
              <button
                key={f.key}
                onClick={() => setMockTypeFilter(f.key)}
                className={`px-4 py-2.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors flex-shrink-0 ${
                  mockTypeFilter === f.key
                    ? "bg-[#7C3AED] text-white"
                    : "bg-[#111827] border border-gray-800 text-gray-400"
                }`}
              >
                {f.label} ({mockTypeCounts[f.key]})
              </button>
            ))}
          </div>

          {filteredHistory.length === 0 ? (
            <p className="text-sm text-gray-500 text-center py-8 bg-[#111827] border border-gray-800 rounded-2xl">
              Is category mein koi mock nahi mila.
            </p>
          ) : (
            <div className="space-y-2.5">
              {filteredHistory.map((g) => (
                <TestHistoryCard
                  key={g.performanceId}
                  blueprintName={g.blueprintName}
                  mockType={blueprintMetaMap[g.blueprintName]?.mockType}
                  date={g.date}
                  score={g.score}
                  onClick={() => setViewingMockId(g.performanceId)}
                />
              ))}
            </div>
          )}
        </div>

      </div>
    </div>
  );
};

// ──────────────────────────────────────────────
// Ek specific mock ka poora result + question review
// ──────────────────────────────────────────────

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

  const counts = useMemo(() => {
    const base = allQuestions.filter((q) => subjectFilter === "all" || q.subjectName === subjectFilter);
    return {
      all: base.length,
      correct: base.filter((q) => q.isCorrect === true).length,
      wrong: base.filter((q) => q.isCorrect === false).length,
      unattempted: base.filter((q) => q.isCorrect === null).length,
    };
  }, [allQuestions, subjectFilter]);

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
      <div className="min-h-screen bg-[#0A0D14] text-white pb-10">
        <ScreenHeader title="Question Review" onBack={closeReview} />

        <div className="max-w-lg mx-auto px-4 mt-5">

          {/* Subject as a simple dropdown — only shown when there's more than 1 subject */}
          {subjects.length > 1 && (
            <select
              value={subjectFilter}
              onChange={(e) => { setSubjectFilter(e.target.value); setIndex(0); }}
              className="w-full mb-3 px-4 py-3 rounded-xl bg-[#111827] border border-gray-800 text-sm text-gray-200"
            >
              <option value="all">Sabhi Subjects</option>
              {subjects.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          )}

          <div className="flex gap-2 mb-6 overflow-x-auto pb-1">
            {STATUS_FILTERS.map((f) => (
              <button
                key={f.key}
                onClick={() => { setStatusFilter(f.key); setIndex(0); }}
                className={`px-4 py-2.5 rounded-full text-sm whitespace-nowrap transition-colors flex-shrink-0 ${
                  statusFilter === f.key ? "bg-[#7C3AED] text-white" : "bg-[#111827] border border-gray-800 text-gray-400"
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
              <p className="text-sm text-gray-500 mb-3">
                Sawaal {index + 1} / {filteredQuestions.length} &middot; {currentQ.subjectName}
              </p>
              <QuestionDetailCard q={currentQ} />

              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => setIndex((i) => Math.max(0, i - 1))}
                  disabled={index === 0}
                  className="flex-1 py-3.5 rounded-xl border border-gray-700 text-sm font-medium text-gray-300 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-1.5"
                >
                  <ArrowLeft className="w-4 h-4" /> Pichla
                </button>
                <button
                  onClick={() => setIndex((i) => Math.min(filteredQuestions.length - 1, i + 1))}
                  disabled={index >= filteredQuestions.length - 1}
                  className="flex-1 py-3.5 rounded-xl bg-[#7C3AED] hover:bg-[#6D28D9] text-sm font-medium disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-1.5"
                >
                  Agla <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0A0D14] text-white pb-10">
      <ScreenHeader title="Test History" onBack={onBack} />

      <div className="max-w-lg mx-auto px-4 mt-6">
        <h1 className="text-xl font-bold mb-1">{overview.blueprintName}</h1>
        <p className="text-gray-400 text-sm mb-6">{overview.examName}</p>

        <div className="bg-[#111827] border border-gray-800 rounded-2xl p-8 text-center mb-6">
          <p className="text-5xl font-bold text-[#A78BFA]">{overview.totalScore}</p>
          <p className="text-sm text-gray-500 mt-1">Total Score &middot; {overview.accuracy}% Accuracy</p>
        </div>

        <div className="grid grid-cols-3 gap-3 mb-6">
          <button
            onClick={() => openReview("correct")}
            className="bg-[#1F2937] border border-gray-800 active:border-green-500/50 rounded-xl p-4 text-center transition-colors"
          >
            <CheckCircle2 className="w-5 h-5 text-green-400 mx-auto mb-1.5" />
            <p className="text-lg font-bold text-green-400">{overview.correct}</p>
            <p className="text-xs text-gray-500 mt-0.5">Sahi</p>
          </button>
          <button
            onClick={() => openReview("wrong")}
            className="bg-[#1F2937] border border-gray-800 active:border-red-500/50 rounded-xl p-4 text-center transition-colors"
          >
            <XCircle className="w-5 h-5 text-red-400 mx-auto mb-1.5" />
            <p className="text-lg font-bold text-red-400">{overview.wrong}</p>
            <p className="text-xs text-gray-500 mt-0.5">Galat</p>
          </button>
          <button
            onClick={() => openReview("unattempted")}
            className="bg-[#1F2937] border border-gray-800 active:border-gray-500/50 rounded-xl p-4 text-center transition-colors"
          >
            <Circle className="w-5 h-5 text-gray-400 mx-auto mb-1.5" />
            <p className="text-lg font-bold text-gray-300">{overview.unattempted}</p>
            <p className="text-xs text-gray-500 mt-0.5">Chhoda Hua</p>
          </button>
        </div>

        <button
          onClick={() => openReview("all")}
          className="w-full py-3.5 rounded-xl bg-[#7C3AED] hover:bg-[#6D28D9] text-sm font-semibold"
        >
          Sabhi Sawaal Dekhein
        </button>
      </div>
    </div>
  );
};

// ──────────────────────────────────────────────
// Single question detail card (options + explanation)
// ──────────────────────────────────────────────
const QuestionDetailCard = ({ q }) => {
  const statusLabel =
    q.isCorrect === true ? "Sahi" : q.isCorrect === false ? "Galat" : "Chhoda Hua";
  const statusColor =
    q.isCorrect === true
      ? "text-green-400 bg-green-500/10 border-green-500/30"
      : q.isCorrect === false
      ? "text-red-400 bg-red-500/10 border-red-500/30"
      : "text-gray-400 bg-gray-500/10 border-gray-500/30";

  return (
    <div className="bg-[#111827] border border-gray-800 rounded-2xl p-5">
      <div className="flex items-center justify-between mb-4 gap-3">
        <span className="text-sm text-gray-500">{q.topicName}</span>
        <span className={`text-xs px-2.5 py-1 rounded-full border font-medium ${statusColor}`}>
          {statusLabel}
        </span>
      </div>

      <p className="text-base mb-6 leading-relaxed">{q.question}</p>

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
        <p className="text-xs text-gray-500 mb-4 flex items-center gap-1.5">
          <Clock className="w-3.5 h-3.5" /> Time liya gaya: {q.timeTakenInSeconds}s
        </p>
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
