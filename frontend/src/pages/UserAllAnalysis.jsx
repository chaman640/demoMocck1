import React, { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  Cell,
} from "recharts";
import api from "../api/api";
import BottomNav from "../components/BottomNav";

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

const formatShortDate = (d) =>
  new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short" });

// ──────────────────────────────────────────────
// Skeleton loading building blocks
// ──────────────────────────────────────────────
const SkeletonBlock = ({ className = "" }) => (
  <div className={`bg-gray-800/70 rounded animate-pulse ${className}`} />
);

const AnalysisPageSkeleton = () => (
  <div className="min-h-screen bg-[#0A0D14] text-white pb-20">
    <nav className="flex items-center justify-between px-4 sm:px-6 py-4 sm:py-5 max-w-5xl mx-auto border-b border-gray-800">
      <div className="flex items-center gap-2">
        <SkeletonBlock className="w-8 h-8 rounded" />
        <SkeletonBlock className="w-28 h-5" />
      </div>
      <SkeletonBlock className="w-20 h-4" />
    </nav>
    <div className="max-w-5xl mx-auto px-4 sm:px-6 mt-6 sm:mt-10 space-y-6">
      <div className="space-y-2">
        <SkeletonBlock className="w-56 h-7" />
        <SkeletonBlock className="w-44 h-4" />
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="bg-[#111827] border border-gray-800 rounded-2xl p-4">
            <SkeletonBlock className="w-20 h-3 mb-3" />
            <SkeletonBlock className="w-14 h-6" />
          </div>
        ))}
      </div>
      <SkeletonBlock className="w-full h-56 rounded-2xl" />
      <SkeletonBlock className="w-full h-40 rounded-2xl" />
    </div>
    <BottomNav />
  </div>
);

const MockDetailSkeleton = () => (
  <div className="min-h-screen bg-[#0A0D14] text-white px-4 sm:px-6 py-8 sm:py-12 pb-24">
    <div className="max-w-2xl mx-auto space-y-6">
      <SkeletonBlock className="w-36 h-4" />
      <div className="space-y-2">
        <SkeletonBlock className="w-52 h-6" />
        <SkeletonBlock className="w-28 h-3" />
      </div>
      <div className="bg-[#111827] border border-gray-800 rounded-2xl p-6 sm:p-8 flex flex-col items-center gap-3">
        <SkeletonBlock className="w-24 h-9" />
        <SkeletonBlock className="w-36 h-3" />
      </div>
      <div className="grid grid-cols-3 gap-3 sm:gap-4">
        {[1, 2, 3].map((i) => (
          <SkeletonBlock key={i} className="h-16 sm:h-20 rounded-xl" />
        ))}
      </div>
      <SkeletonBlock className="w-full h-12 rounded-lg" />
    </div>
    <BottomNav />
  </div>
);

// ──────────────────────────────────────────────
// 🆕 Trend badge — pichle 3 vs uske pehle wale 3 mocks
// ──────────────────────────────────────────────
const TrendBadge = ({ trend }) => {
  if (!trend) return null;
  const map = {
    improving: { label: "Improve ho rahe ho", color: "text-green-400 bg-green-500/10 border-green-500/30", arrow: "↑" },
    declining: { label: "Score gir raha hai", color: "text-red-400 bg-red-500/10 border-red-500/30", arrow: "↓" },
    same: { label: "Steady hai", color: "text-gray-400 bg-gray-500/10 border-gray-500/30", arrow: "→" },
  };
  const t = map[trend.direction];
  if (!t) return null;
  return (
    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full border text-xs font-medium ${t.color}`}>
      <span className="text-sm">{t.arrow}</span>
      {t.label}
      {trend.changePercent !== 0 && (
        <span className="opacity-70">({trend.changePercent > 0 ? "+" : ""}{trend.changePercent}%)</span>
      )}
    </span>
  );
};

// ──────────────────────────────────────────────
// 🆕 Score trend line chart — poori lifetime history
// ──────────────────────────────────────────────
const ScoreTrendChart = ({ graphData, onPointClick }) => {
  if (!graphData || graphData.length < 2) {
    return (
      <div className="px-4 sm:px-6 py-10 text-center text-sm text-gray-500">
        Trend dekhne ke liye kam se kam 2 mocks chahiye — abhi sirf {graphData?.length || 0} hai.
      </div>
    );
  }
  const chartData = graphData.map((g) => ({ ...g, label: formatShortDate(g.date) }));
  return (
    <div className="px-2 sm:px-4 py-4">
      <ResponsiveContainer width="100%" height={220}>
        <LineChart data={chartData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#1F2937" />
          <XAxis dataKey="label" tick={{ fill: "#6B7280", fontSize: 11 }} interval="preserveStartEnd" />
          <YAxis tick={{ fill: "#6B7280", fontSize: 11 }} />
          <Tooltip
            contentStyle={{ background: "#111827", border: "1px solid #1F2937", borderRadius: 8, fontSize: 12 }}
            labelStyle={{ color: "#A78BFA" }}
            formatter={(value, name, props) => [value, props.payload.blueprintName]}
          />
          <Line
            type="monotone"
            dataKey="score"
            stroke="#7C3AED"
            strokeWidth={2}
            dot={{ r: 3, fill: "#7C3AED", cursor: "pointer" }}
            activeDot={{ r: 5, onClick: (_, e) => onPointClick?.(chartData[e.index]?.performanceId) }}
          />
        </LineChart>
      </ResponsiveContainer>
      <p className="text-[11px] text-gray-500 text-center mt-1">Kisi bhi point par tap karke wo mock dekhein</p>
    </div>
  );
};

// ──────────────────────────────────────────────
// 🆕 Subject comparison bar chart — ek nazar mein sabse kamzor subject
// ──────────────────────────────────────────────
const barColor = (accuracy) => (accuracy >= 70 ? "#34D399" : accuracy >= 40 ? "#FBBF24" : "#F87171");

const SubjectBarChart = ({ subjectAnalysis }) => {
  if (!subjectAnalysis || subjectAnalysis.length === 0) return null;
  return (
    <div className="px-2 sm:px-4 py-4">
      <ResponsiveContainer width="100%" height={Math.max(120, subjectAnalysis.length * 44)}>
        <BarChart data={subjectAnalysis} layout="vertical" margin={{ top: 0, right: 20, left: 10, bottom: 0 }}>
          <XAxis type="number" domain={[0, 100]} tick={{ fill: "#6B7280", fontSize: 11 }} />
          <YAxis type="category" dataKey="subjectName" tick={{ fill: "#D1D5DB", fontSize: 12 }} width={80} />
          <Tooltip
            contentStyle={{ background: "#111827", border: "1px solid #1F2937", borderRadius: 8, fontSize: 12 }}
            formatter={(value) => [`${value}%`, "Accuracy"]}
          />
          <Bar dataKey="averageAccuracy" radius={[0, 6, 6, 0]} barSize={18}>
            {subjectAnalysis.map((s, i) => (
              <Cell key={i} fill={barColor(s.averageAccuracy)} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};

// ──────────────────────────────────────────────
// 🆕 Top Weak Topics — cross-subject, seedha click se galat sawaal khulte hain
// ──────────────────────────────────────────────
const WeakTopicRow = ({ topic, onClick }) => (
  <button
    onClick={onClick}
    className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-red-500/5 transition-colors"
  >
    <div className="min-w-0 flex-1">
      <p className="text-sm font-medium text-gray-200 truncate">{topic.topicName}</p>
      <p className="text-[11px] text-gray-500 mt-0.5 truncate">
        {topic.subjectName} &middot; {topic.reason}
      </p>
    </div>
    <span className="flex-shrink-0 px-2 py-0.5 rounded text-xs font-semibold text-red-400 bg-red-500/10">
      {topic.wrongCount} galat
    </span>
    <span className="flex-shrink-0 text-xs font-medium text-red-300">&rarr;</span>
  </button>
);

// ──────────────────────────────────────────────
// Test History ke Level-1 filter tabs
// ──────────────────────────────────────────────
const MOCK_TYPE_FILTERS = [
  { key: "all", label: "All" },
  { key: "Full", label: "Full Mock" },
  { key: "Mini", label: "Mini Mock" },
];

const SubjectRow = ({ subject, totalTimeSeconds, questionCount, onClick }) => {
  const accuracyClass =
    subject.averageAccuracy >= 70
      ? "text-green-400 bg-green-500/10"
      : subject.averageAccuracy >= 40
      ? "text-yellow-400 bg-yellow-500/10"
      : "text-red-400 bg-red-500/10";

  const correctOutOf =
    questionCount != null ? Math.round((subject.averageAccuracy / 100) * questionCount) : null;

  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-3 px-4 py-2.5 text-left hover:bg-[#1F2937]/50 transition-colors"
    >
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-gray-200 truncate">{subject.subjectName}</p>
        <p className="text-[11px] text-gray-500 mt-0.5">
          {formatDuration(totalTimeSeconds)}
          {questionCount != null && ` · ${questionCount}Q`}
        </p>
      </div>
      <span className={`flex-shrink-0 px-2 py-0.5 rounded text-xs font-semibold ${accuracyClass}`}>
        {correctOutOf != null ? `${correctOutOf}/${questionCount}` : `${subject.averageAccuracy}%`}
      </span>
      <span className="flex-shrink-0 text-xs font-medium text-[#A78BFA]">&rarr;</span>
    </button>
  );
};

const HistoryRow = ({ entry, onClick }) => (
  <button
    onClick={onClick}
    className="w-full flex items-center gap-3 px-4 py-2.5 text-left hover:bg-[#1F2937]/50 transition-colors"
  >
    <div className="min-w-0 flex-1">
      <p className="text-sm font-medium text-gray-200 truncate">{entry.blueprintName || "—"}</p>
      <p className="text-[11px] text-gray-500 mt-0.5">
        {new Date(entry.date).toLocaleString("en-IN", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}
      </p>
    </div>
    <span className="flex-shrink-0 text-sm font-bold text-white">{entry.score}</span>
    <span className="flex-shrink-0 text-xs font-medium text-[#A78BFA]">&rarr;</span>
  </button>
);

const UserAllAnalysis = () => {
  const navigate = useNavigate();
  const [overview, setOverview] = useState(null);
  const [examName, setExamName] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [subjectQuestionCounts, setSubjectQuestionCounts] = useState({});
  const [blueprints, setBlueprints] = useState([]);

  const [mockTypeFilter, setMockTypeFilter] = useState("all");
  const [miniSubjectFilter, setMiniSubjectFilter] = useState("all");

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
            if (!(s.subjectName in countMap)) countMap[s.subjectName] = s.questionCount;
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
      map[bp.blueprintName] = { mockType: bp.mockType, subjectNames: (bp.subjects || []).map((s) => s.subjectName) };
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

  const miniSubjects = useMemo(() => {
    const set = new Set();
    sortedHistory.forEach((g) => {
      const meta = blueprintMetaMap[g.blueprintName];
      if (meta?.mockType === "Mini") (meta.subjectNames || []).forEach((s) => set.add(s));
    });
    return Array.from(set).sort();
  }, [sortedHistory, blueprintMetaMap]);

  const miniSubjectCounts = useMemo(() => {
    const counts = { all: 0 };
    sortedHistory.forEach((g) => {
      const meta = blueprintMetaMap[g.blueprintName];
      if (meta?.mockType !== "Mini") return;
      counts.all++;
      (meta.subjectNames || []).forEach((s) => (counts[s] = (counts[s] || 0) + 1));
    });
    return counts;
  }, [sortedHistory, blueprintMetaMap]);

  const filteredHistory = useMemo(() => {
    return sortedHistory.filter((g) => {
      const meta = blueprintMetaMap[g.blueprintName];
      if (mockTypeFilter === "all") return true;
      if (meta?.mockType !== mockTypeFilter) return false;
      if (mockTypeFilter === "Mini" && miniSubjectFilter !== "all") {
        return (meta.subjectNames || []).includes(miniSubjectFilter);
      }
      return true;
    });
  }, [sortedHistory, blueprintMetaMap, mockTypeFilter, miniSubjectFilter]);

  const selectMockType = (type) => {
    setMockTypeFilter(type);
    setMiniSubjectFilter("all");
  };

  const goToWeakTopic = (topic) => {
    navigate("/UserTopicAnalysis", {
      state: { examName, subjectName: topic.subjectName, topicName: topic.topicName },
    });
  };

  if (loading) return <AnalysisPageSkeleton />;

  if (error) {
    return (
      <div className="min-h-screen bg-[#0A0D14] text-white flex flex-col items-center justify-center px-4 pb-20">
        <div className="bg-[#111827] border border-red-500/30 p-6 sm:p-8 rounded-2xl max-w-md w-full text-center shadow-2xl">
          <div className="w-16 h-16 bg-red-500/10 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4 text-3xl font-bold">!</div>
          <h2 className="text-xl font-bold mb-2">Oops! Error Aaya</h2>
          <p className="text-gray-400 mb-6 text-sm">{error}</p>
          <button onClick={() => navigate("/Login")} className="w-full sm:w-auto px-6 py-2.5 bg-[#7C3AED] hover:bg-[#6D28D9] text-white rounded-lg transition-colors text-sm font-medium">
            Login Page Par Jaayein
          </button>
        </div>
        <BottomNav />
      </div>
    );
  }

  if (!overview) {
    return (
      <div className="min-h-screen bg-[#0A0D14] text-white flex flex-col items-center justify-center px-4 pb-20">
        <div className="bg-[#111827] border border-gray-800 p-6 sm:p-8 rounded-2xl max-w-md w-full text-center shadow-2xl">
          <div className="w-16 h-16 bg-blue-500/10 text-blue-400 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h2 className="text-xl font-bold mb-2">Koi Data Nahi Mila</h2>
          <p className="text-gray-400 mb-6 text-sm">Aapne abhi tak {examName} ka koi mock test nahi diya hai.</p>
          <button onClick={() => navigate("/MockTest")} className="w-full sm:w-auto px-6 py-2.5 bg-[#7C3AED] hover:bg-[#6D28D9] text-white rounded-lg transition-colors text-sm font-medium">
            Test Dena Shuru Karein
          </button>
        </div>
        <BottomNav />
      </div>
    );
  }

  if (viewingMockId) {
    return <MockDetailScreen performanceId={viewingMockId} onBack={() => setViewingMockId(null)} />;
  }

  return (
    <div className="min-h-screen bg-[#0A0D14] text-white font-sans selection:bg-[#7C3AED] selection:text-white pb-20">
      <nav className="flex items-center justify-between px-4 sm:px-6 py-4 sm:py-5 max-w-5xl mx-auto border-b border-gray-800">
        <div onClick={() => navigate("/HomePage")} className="flex items-center gap-2 cursor-pointer">
          <div className="w-8 h-8 rounded bg-gradient-to-br from-[#8B5CF6] to-[#6D28D9] flex items-center justify-center font-bold text-sm flex-shrink-0">mt</div>
          <span className="text-base sm:text-xl font-semibold tracking-wide">mockTest.in</span>
        </div>
        <button onClick={() => navigate("/HomePage")} className="text-xs sm:text-sm font-medium text-gray-400 hover:text-white transition-colors flex-shrink-0">&larr; Home</button>
      </nav>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 mt-6 sm:mt-10 space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Detailed Analysis</h1>
            <p className="text-gray-400 mt-1.5 text-sm">
              <span className="text-[#A78BFA] font-medium">{examName}</span> mocks ke aapke performance ke hisaab se
            </p>
          </div>
          <TrendBadge trend={overview.trend} />
        </div>

        {/* 🆕 Lifetime stats — headline number ab sirf "last 3" tak simit nahi */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
          <div className="bg-[#111827] border border-gray-800 rounded-2xl p-4 shadow-lg">
            <p className="text-xs text-gray-500 font-medium mb-1">Lifetime Average</p>
            <p className="text-2xl sm:text-3xl font-bold text-[#A78BFA]">
              {overview.lifetimeAverageScoreOutOf ? `${overview.lifetimeAverageScore}/${overview.lifetimeAverageScoreOutOf}` : overview.lifetimeAverageScore}
            </p>
          </div>
          <div className="bg-[#111827] border border-gray-800 rounded-2xl p-4 shadow-lg">
            <p className="text-xs text-gray-500 font-medium mb-1">Total Mocks</p>
            <p className="text-2xl sm:text-3xl font-bold text-white">{overview.totalTestsGiven}</p>
          </div>
          <div className="bg-[#111827] border border-gray-800 rounded-2xl p-4 shadow-lg">
            <p className="text-xs text-gray-500 font-medium mb-1">Total Galat (Lifetime)</p>
            <p className="text-2xl sm:text-3xl font-bold text-red-400">{overview.totalWrongLifetime}</p>
          </div>
          <div className="bg-[#111827] border border-gray-800 rounded-2xl p-4 shadow-lg">
            <p className="text-xs text-gray-500 font-medium mb-1">Negative Marking Se Kata</p>
            <p className="text-2xl sm:text-3xl font-bold text-orange-400">-{overview.marksLostToNegativeLifetime}</p>
          </div>
        </div>

        {/* 🆕 Score Trend Chart */}
        <div className="bg-[#111827] border border-gray-800 rounded-2xl overflow-hidden shadow-lg">
          <div className="px-4 sm:px-6 py-4 border-b border-gray-800 bg-[#1F2937]/30">
            <h3 className="font-semibold text-base sm:text-lg">Score Trend</h3>
            <p className="text-xs text-gray-500 mt-1">Har mock ka score, time ke saath</p>
          </div>
          <ScoreTrendChart graphData={overview.graphData} onPointClick={setViewingMockId} />
        </div>

        {/* 🆕 Top Weak Topics — cross-subject, seedha click se galat sawaal */}
        <div className="bg-[#111827] border border-gray-800 rounded-2xl overflow-hidden shadow-lg">
          <div className="px-4 sm:px-6 py-4 border-b border-gray-800 bg-red-900/10">
            <h3 className="font-semibold text-base sm:text-lg text-red-400">Aapki Sabse Badi Galtiyan</h3>
            <p className="text-xs text-gray-500 mt-1">Sabhi subjects mile-jule — inpe focus karo</p>
          </div>
          {!overview.topWeakTopics || overview.topWeakTopics.length === 0 ? (
            <p className="p-6 text-sm text-green-400 text-center">Badhiya! Koi khaas kamzor topic nahi mila.</p>
          ) : (
            <div className="divide-y divide-gray-800">
              {overview.topWeakTopics.map((t, i) => (
                <WeakTopicRow key={i} topic={t} onClick={() => goToWeakTopic(t)} />
              ))}
            </div>
          )}
        </div>

        {/* Subject Analysis — ab chart ke saath */}
        <div className="bg-[#111827] border border-gray-800 rounded-2xl overflow-hidden shadow-lg">
          <div className="px-4 sm:px-6 py-4 border-b border-gray-800 bg-[#1F2937]/30">
            <h3 className="font-semibold text-base sm:text-lg">Subject Comparison</h3>
            <p className="text-xs text-gray-500 mt-1">Last 3 mocks ka average — ek nazar mein sabse kamzor subject</p>
          </div>
          {overview.subjectAnalysis?.length === 0 ? (
            <div className="p-6 text-center text-yellow-500 bg-yellow-500/5 text-sm">Subject analysis data khali hai. Apne agle mock ke baad check karein.</div>
          ) : (
            <>
              <SubjectBarChart subjectAnalysis={overview.subjectAnalysis} />
              <div className="divide-y divide-gray-800 border-t border-gray-800">
                {overview.subjectAnalysis?.map((s, i) => {
                  const qCount = subjectQuestionCounts[s.subjectName];
                  const totalTimeSeconds = qCount != null ? s.averageTimePerQuestion * qCount : null;
                  return (
                    <SubjectRow
                      key={i}
                      subject={s}
                      totalTimeSeconds={totalTimeSeconds}
                      questionCount={qCount}
                      onClick={() => navigate("/UserSubjectAnallysis", { state: { subjectName: s.subjectName, examName } })}
                    />
                  );
                })}
              </div>
            </>
          )}
        </div>

        {/* Mock History */}
        <div className="bg-[#111827] border border-gray-800 rounded-2xl overflow-hidden shadow-lg">
          <div className="px-4 sm:px-6 py-4 border-b border-gray-800 bg-[#1F2937]/30">
            <h3 className="font-semibold text-base sm:text-lg">Test History</h3>
            <p className="text-xs text-gray-500 mt-1">Kisi bhi mock par tap karke uska poora result dekhein</p>
          </div>

          <div className="px-4 sm:px-6 pt-4 pb-3 border-b border-gray-800 space-y-3">
            <div className="flex gap-2 overflow-x-auto pb-1">
              {MOCK_TYPE_FILTERS.map((f) => (
                <button key={f.key} onClick={() => selectMockType(f.key)} className={`px-4 py-1.5 rounded-full text-sm whitespace-nowrap transition-colors flex-shrink-0 ${mockTypeFilter === f.key ? "bg-[#7C3AED] text-white" : "bg-[#1F2937] border border-gray-800 text-gray-400 hover:text-gray-200"}`}>
                  {f.label} ({mockTypeCounts[f.key]})
                </button>
              ))}
            </div>
            {mockTypeFilter === "Mini" && miniSubjects.length > 0 && (
              <div className="flex gap-2 overflow-x-auto pb-1">
                <button onClick={() => setMiniSubjectFilter("all")} className={`px-3.5 py-1 rounded-full text-xs whitespace-nowrap transition-colors flex-shrink-0 ${miniSubjectFilter === "all" ? "bg-[#A78BFA]/20 text-[#A78BFA] border border-[#A78BFA]/40" : "bg-transparent border border-gray-800 text-gray-500 hover:text-gray-300"}`}>
                  Sabhi Subjects ({miniSubjectCounts.all || 0})
                </button>
                {miniSubjects.map((subj) => (
                  <button key={subj} onClick={() => setMiniSubjectFilter(subj)} className={`px-3.5 py-1 rounded-full text-xs whitespace-nowrap transition-colors flex-shrink-0 ${miniSubjectFilter === subj ? "bg-[#A78BFA]/20 text-[#A78BFA] border border-[#A78BFA]/40" : "bg-transparent border border-gray-800 text-gray-500 hover:text-gray-300"}`}>
                    {subj} ({miniSubjectCounts[subj] || 0})
                  </button>
                ))}
              </div>
            )}
          </div>

          {filteredHistory.length === 0 ? (
            <p className="px-4 sm:px-6 py-8 text-sm text-gray-400 text-center">Is category mein koi mock nahi mila.</p>
          ) : (
            <div className="divide-y divide-gray-800">
              {filteredHistory.map((g) => (
                <HistoryRow key={g.performanceId} entry={g} onClick={() => setViewingMockId(g.performanceId)} />
              ))}
            </div>
          )}
        </div>
      </div>

      <BottomNav />
    </div>
  );
};

// ──────────────────────────────────────────────
// Ek specific mock ka poora result + question review
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

// 🆕 Question Map — poore mock ka ek-nazar-mein scan, real exam apps jaisa
const QuestionMap = ({ questions, onJump }) => {
  const colorOf = (q) =>
    q.isCorrect === true
      ? "bg-green-500/20 border-green-500/50 text-green-400"
      : q.isCorrect === false
      ? "bg-red-500/20 border-red-500/50 text-red-400"
      : "bg-gray-700/40 border-gray-600 text-gray-400";

  return (
    <div className="bg-[#111827] border border-gray-800 rounded-2xl p-4 mb-6">
      <p className="text-xs font-semibold tracking-wider text-gray-400 uppercase mb-3">
        Question Map — tap karke seedha wahan jaayein
      </p>
      <div className="grid grid-cols-8 sm:grid-cols-10 gap-1.5">
        {questions.map((q, i) => (
          <button
            key={i}
            onClick={() => onJump(i)}
            className={`aspect-square rounded-md border text-[11px] font-semibold flex items-center justify-center transition-transform hover:scale-110 ${colorOf(q)}`}
            title={q.subjectName}
          >
            {i + 1}
          </button>
        ))}
      </div>
      <div className="flex items-center gap-4 mt-3 text-[10px] text-gray-500">
        <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-green-500/50 inline-block" /> Correct</span>
        <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-red-500/50 inline-block" /> Wrong</span>
        <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-gray-600 inline-block" /> Unattempted</span>
      </div>
    </div>
  );
};

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
    setSubjectFilter("all");
    setStatusFilter(filter);
    setIndex(0);
  };

  // 🆕 Question Map se seedha kisi bhi question par jump karna
  const jumpToQuestion = (i) => {
    setSubjectFilter("all");
    setStatusFilter("all");
    setIndex(i);
  };

  const closeReview = () => setStatusFilter(null);

  if (isLoading) return <MockDetailSkeleton />;

  if (isError || !data) {
    return (
      <div className="min-h-screen bg-[#0A0D14] text-white flex items-center justify-center px-4 pb-20">
        <div className="max-w-md w-full text-center space-y-4">
          <p className="text-gray-300">{error?.response?.data?.message || "Data load nahi ho paaya."}</p>
          <button onClick={onBack} className="px-5 py-2 rounded-lg bg-[#7C3AED] hover:bg-[#6D28D9] text-sm font-medium">Wapas Jaayein</button>
        </div>
        <BottomNav />
      </div>
    );
  }

  const { overview } = data;

  if (statusFilter) {
    return (
      <div className="min-h-screen bg-[#0A0D14] text-white px-4 sm:px-6 py-6 sm:py-8 pb-24">
        <div className="max-w-3xl mx-auto">
          <button onClick={closeReview} className="text-sm text-gray-400 hover:text-white mb-5 sm:mb-6 flex items-center gap-1">&larr; Result par wapas jaayein</button>
          <h1 className="text-xl sm:text-2xl font-bold mb-4">Question Review</h1>

          {subjects.length > 1 && (
            <div className="flex gap-2 mb-4 overflow-x-auto pb-1">
              <button onClick={() => { setSubjectFilter("all"); setIndex(0); }} className={`px-4 py-1.5 rounded-full text-sm whitespace-nowrap transition-colors flex-shrink-0 ${subjectFilter === "all" ? "bg-[#7C3AED] text-white" : "bg-[#111827] border border-gray-800 text-gray-400 hover:text-gray-200"}`}>Sabhi Subjects</button>
              {subjects.map((s) => (
                <button key={s} onClick={() => { setSubjectFilter(s); setIndex(0); }} className={`px-4 py-1.5 rounded-full text-sm whitespace-nowrap transition-colors flex-shrink-0 ${subjectFilter === s ? "bg-[#7C3AED] text-white" : "bg-[#111827] border border-gray-800 text-gray-400 hover:text-gray-200"}`}>{s}</button>
              ))}
            </div>
          )}

          <div className="flex gap-2 mb-5 sm:mb-6 overflow-x-auto pb-1">
            {STATUS_FILTERS.map((f) => (
              <button key={f.key} onClick={() => { setStatusFilter(f.key); setIndex(0); }} className={`px-4 py-1.5 rounded-full text-sm whitespace-nowrap transition-colors flex-shrink-0 ${statusFilter === f.key ? "bg-[#7C3AED] text-white" : "bg-[#111827] border border-gray-800 text-gray-400 hover:text-gray-200"}`}>{f.label}</button>
            ))}
          </div>

          {filteredQuestions.length === 0 && (
            <p className="text-gray-400 text-sm py-10 text-center">Is category mein koi sawaal nahi hai.</p>
          )}

          {currentQ && (
            <>
              <p className="text-xs text-gray-500 mb-3">Question {index + 1} of {filteredQuestions.length} &middot; {currentQ.subjectName}</p>
              <QuestionDetailCard q={currentQ} averageTimePerQuestion={overview.averageTimePerQuestion} />
              <div className="flex justify-between items-center mt-6">
                <button onClick={() => setIndex((i) => Math.max(0, i - 1))} disabled={index === 0} className="px-4 py-2 rounded-lg border border-gray-700 text-sm text-gray-300 hover:border-gray-500 disabled:opacity-40 disabled:cursor-not-allowed">&larr; Previous</button>
                <button onClick={() => setIndex((i) => Math.min(filteredQuestions.length - 1, i + 1))} disabled={index >= filteredQuestions.length - 1} className="px-4 py-2 rounded-lg bg-[#7C3AED] hover:bg-[#6D28D9] text-sm font-medium disabled:opacity-40 disabled:cursor-not-allowed">Next &rarr;</button>
              </div>
            </>
          )}
        </div>
        <BottomNav />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0A0D14] text-white px-4 sm:px-6 py-8 sm:py-12 pb-24">
      <div className="max-w-2xl mx-auto">
        <button onClick={onBack} className="text-sm text-gray-400 hover:text-white mb-5 sm:mb-6 flex items-center gap-1">&larr; Test History par wapas jaayein</button>

        <h1 className="text-xl sm:text-2xl font-bold mb-1">{overview.blueprintName}</h1>
        <p className="text-gray-400 text-sm mb-6 sm:mb-8">{overview.examName}</p>

        <div className="bg-[#111827] border border-gray-800 rounded-2xl p-6 sm:p-8 text-center mb-4">
          <p className="text-4xl sm:text-5xl font-bold text-[#A78BFA]">{overview.totalScore}</p>
          <p className="text-sm text-gray-500 mt-1">Total Score &middot; {overview.accuracy}% Accuracy</p>
        </div>

        {/* 🆕 Negative marking impact — pehle ye kabhi nahi dikhta tha */}
        {overview.negativeMarking > 0 && overview.marksLostToNegative > 0 && (
          <div className="bg-orange-500/5 border border-orange-500/20 rounded-2xl p-4 mb-6 flex items-center justify-between gap-3">
            <div>
              <p className="text-sm text-orange-300 font-medium">Negative marking se {overview.marksLostToNegative} marks kate</p>
              <p className="text-[11px] text-gray-500 mt-0.5">Agar galat guess na karte to score {overview.scoreIfLeftBlankInsteadOfWrong} hota (blank chhodne par)</p>
            </div>
            <span className="text-2xl flex-shrink-0">⚠️</span>
          </div>
        )}

        <div className="grid grid-cols-3 gap-3 sm:gap-4 mb-6 sm:mb-8">
          <button onClick={() => openReview("correct")} className="bg-[#1F2937] border border-gray-800 hover:border-green-500/50 rounded-xl p-3 sm:p-4 text-center transition-colors">
            <p className="text-lg sm:text-xl font-bold text-green-400">{overview.correct}</p>
            <p className="text-[11px] text-gray-500 mt-1">Correct</p>
          </button>
          <button onClick={() => openReview("wrong")} className="bg-[#1F2937] border border-gray-800 hover:border-red-500/50 rounded-xl p-3 sm:p-4 text-center transition-colors">
            <p className="text-lg sm:text-xl font-bold text-red-400">{overview.wrong}</p>
            <p className="text-[11px] text-gray-500 mt-1">Wrong</p>
          </button>
          <button onClick={() => openReview("unattempted")} className="bg-[#1F2937] border border-gray-800 hover:border-gray-500/50 rounded-xl p-3 sm:p-4 text-center transition-colors">
            <p className="text-lg sm:text-xl font-bold text-gray-300">{overview.unattempted}</p>
            <p className="text-[11px] text-gray-500 mt-1">Unattempted</p>
          </button>
        </div>

        {/* 🆕 Poore mock ka ek-nazar-mein scan */}
        <QuestionMap questions={allQuestions} onJump={(i) => { jumpToQuestion(i); }} />

        <button onClick={() => openReview("all")} className="w-full py-3 rounded-lg bg-[#7C3AED] hover:bg-[#6D28D9] text-sm font-medium">Sabhi Sawaal Dekhein</button>
      </div>
      <BottomNav />
    </div>
  );
};

// ──────────────────────────────────────────────
// Single question detail card — 🆕 "too slow" flag add hua
// ──────────────────────────────────────────────
const QuestionDetailCard = ({ q, averageTimePerQuestion }) => {
  const statusLabel = q.isCorrect === true ? "Correct" : q.isCorrect === false ? "Wrong" : "Unattempted";
  const statusColor =
    q.isCorrect === true
      ? "text-green-400 bg-green-500/10 border-green-500/30"
      : q.isCorrect === false
      ? "text-red-400 bg-red-500/10 border-red-500/30"
      : "text-gray-400 bg-gray-500/10 border-gray-500/30";

  // 🆕 Agar average se 1.5x zyada time laga aur galat bhi kiya — highlight karo
  const isSlowAndWrong =
    q.isCorrect === false &&
    q.timeTakenInSeconds != null &&
    averageTimePerQuestion > 0 &&
    q.timeTakenInSeconds > averageTimePerQuestion * 1.5;

  return (
    <div className="bg-[#111827] border border-gray-800 rounded-2xl p-4 sm:p-6">
      <div className="flex items-center justify-between mb-4 gap-3">
        <span className="text-xs text-gray-500">{q.topicName}</span>
        <span className={`text-xs px-2.5 py-1 rounded-full border font-medium ${statusColor}`}>{statusLabel}</span>
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
              <span className="w-6 h-6 flex-shrink-0 rounded-full border border-current flex items-center justify-center text-xs">{n}</span>
              <span className="flex-1">{optText}</span>
              {isCorrectOpt && <span className="text-xs flex-shrink-0">✅ Sahi jawab</span>}
              {isUserPick && !isCorrectOpt && <span className="text-xs flex-shrink-0">❌ Aapka jawab</span>}
            </div>
          );
        })}
      </div>

      {q.userAnswer == null && <p className="text-xs text-yellow-500 mb-4">Aapne ye sawaal attempt nahi kiya tha.</p>}

      {q.timeTakenInSeconds != null && (
        <p className="text-xs text-gray-500 mb-2">
          Time liya gaya: {q.timeTakenInSeconds}s
          {averageTimePerQuestion > 0 && <span className="text-gray-600"> (aapka average: {averageTimePerQuestion}s)</span>}
        </p>
      )}

      {/* 🆕 */}
      {isSlowAndWrong && (
        <p className="text-xs text-orange-400 mb-4 flex items-center gap-1.5">
          🐢 Isme average se kaafi zyada time liya aur phir bhi galat hua — is topic ki practice zaroori hai.
        </p>
      )}

      {q.answerExplain && (
        <div className="bg-[#1F2937]/50 border border-gray-700/50 rounded-lg p-4">
          <p className="text-xs font-semibold tracking-wider text-purple-400 uppercase mb-2">Explanation</p>
          <p className="text-sm text-gray-300 leading-relaxed">{q.answerExplain}</p>
        </div>
      )}
    </div>
  );
};

export default UserAllAnalysis;
