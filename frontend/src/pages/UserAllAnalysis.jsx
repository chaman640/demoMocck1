import React, { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
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

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
        <div className="bg-[#111827] border border-gray-800 rounded-2xl p-4 sm:p-6">
          <SkeletonBlock className="w-32 h-3 mb-3" />
          <SkeletonBlock className="w-16 h-7" />
        </div>
        <div className="bg-[#111827] border border-gray-800 rounded-2xl p-4 sm:p-6">
          <SkeletonBlock className="w-32 h-3 mb-3" />
          <SkeletonBlock className="w-16 h-7" />
        </div>
      </div>

      <div className="bg-[#111827] border border-gray-800 rounded-2xl overflow-hidden">
        <div className="px-4 sm:px-6 py-4">
          <SkeletonBlock className="w-36 h-4 mb-2" />
          <SkeletonBlock className="w-52 h-3" />
        </div>
        <div className="divide-y divide-gray-800">
          {[1, 2, 3].map((i) => (
            <div key={i} className="px-4 py-2.5">
              <SkeletonBlock className="w-full h-9 rounded-lg" />
            </div>
          ))}
        </div>
      </div>

      <div className="bg-[#111827] border border-gray-800 rounded-2xl overflow-hidden">
        <div className="px-4 sm:px-6 py-4">
          <SkeletonBlock className="w-32 h-4 mb-2" />
          <SkeletonBlock className="w-52 h-3" />
        </div>
        <div className="divide-y divide-gray-800">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="px-4 py-2.5">
              <SkeletonBlock className="w-full h-9 rounded-lg" />
            </div>
          ))}
        </div>
      </div>
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
// Test History ke Level-1 filter tabs
// ──────────────────────────────────────────────
const MOCK_TYPE_FILTERS = [
  { key: "all", label: "All" },
  { key: "Full", label: "Full Mock" },
  { key: "Mini", label: "Mini Mock" },
];

// ──────────────────────────────────────────────
// Subject Analysis ki ek tap-able row — table ki jagah
// ──────────────────────────────────────────────
const SubjectRow = ({ subject, totalTimeSeconds, questionCount, onClick }) => {
  const accuracyClass =
    subject.averageAccuracy >= 70
      ? "text-green-400 bg-green-500/10"
      : subject.averageAccuracy >= 40
      ? "text-yellow-400 bg-yellow-500/10"
      : "text-red-400 bg-red-500/10";

  // 👇 % ki jagah fixed number — accuracy % ko is subject ke
  // total questions (blueprint se) se multiply karke "correct/total" banaya
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

// ──────────────────────────────────────────────
// Test History ki ek tap-able row — table ki jagah
// ──────────────────────────────────────────────
const HistoryRow = ({ entry, onClick }) => (
  <button
    onClick={onClick}
    className="w-full flex items-center gap-3 px-4 py-2.5 text-left hover:bg-[#1F2937]/50 transition-colors"
  >
    <div className="min-w-0 flex-1">
      <p className="text-sm font-medium text-gray-200 truncate">{entry.blueprintName || "—"}</p>
      <p className="text-[11px] text-gray-500 mt-0.5">
        {new Date(entry.date).toLocaleString("en-IN", {
          day: "numeric",
          month: "short",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        })}
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

  // Subject-wise question count, blueprint se aata hai
  const [subjectQuestionCounts, setSubjectQuestionCounts] = useState({});

  // Poori blueprint list — Test History ko Mini/Full + subject se filter karne ke liye
  const [blueprints, setBlueprints] = useState([]);

  // Test History ke filter states
  const [mockTypeFilter, setMockTypeFilter] = useState("all"); // "all" | "Full" | "Mini"
  const [miniSubjectFilter, setMiniSubjectFilter] = useState("all"); // "all" | subjectName

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

        const blueprintList = blueprintsRes.data.data || [];
        setBlueprints(blueprintList);

        // Har subject ka questionCount map bana lo (pehla blueprint jisme wo subject mile)
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

  // blueprintName → { mockType, subjectNames } lookup map
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

  // Level-1 tabs ke counts — All / Full / Mini
  const mockTypeCounts = useMemo(() => {
    const counts = { all: sortedHistory.length, Full: 0, Mini: 0 };
    sortedHistory.forEach((g) => {
      const meta = blueprintMetaMap[g.blueprintName];
      if (meta?.mockType === "Full") counts.Full++;
      else if (meta?.mockType === "Mini") counts.Mini++;
    });
    return counts;
  }, [sortedHistory, blueprintMetaMap]);

  // Mini Mock attempts mein jitne bhi alag subjects aaye — dynamically nikalte hain
  const miniSubjects = useMemo(() => {
    const set = new Set();
    sortedHistory.forEach((g) => {
      const meta = blueprintMetaMap[g.blueprintName];
      if (meta?.mockType === "Mini") {
        (meta.subjectNames || []).forEach((s) => set.add(s));
      }
    });
    return Array.from(set).sort();
  }, [sortedHistory, blueprintMetaMap]);

  // Level-2 (Mini ke andar subject) tabs ke counts
  const miniSubjectCounts = useMemo(() => {
    const counts = { all: 0 };
    sortedHistory.forEach((g) => {
      const meta = blueprintMetaMap[g.blueprintName];
      if (meta?.mockType !== "Mini") return;
      counts.all++;
      (meta.subjectNames || []).forEach((s) => {
        counts[s] = (counts[s] || 0) + 1;
      });
    });
    return counts;
  }, [sortedHistory, blueprintMetaMap]);

  // Dono filters ke hisaab se final list
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

  // Level-1 tab badalte hi subject filter reset — stale combo na bache
  const selectMockType = (type) => {
    setMockTypeFilter(type);
    setMiniSubjectFilter("all");
  };

  if (loading) {
    return <AnalysisPageSkeleton />;
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[#0A0D14] text-white flex flex-col items-center justify-center px-4 pb-20">
        <div className="bg-[#111827] border border-red-500/30 p-6 sm:p-8 rounded-2xl max-w-md w-full text-center shadow-2xl">
          <div className="w-16 h-16 bg-red-500/10 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4 text-3xl font-bold">
            !
          </div>
          <h2 className="text-xl font-bold mb-2">Oops! Error Aaya</h2>
          <p className="text-gray-400 mb-6 text-sm">{error}</p>
          <button 
            onClick={() => navigate('/Login')}
            className="w-full sm:w-auto px-6 py-2.5 bg-[#7C3AED] hover:bg-[#6D28D9] text-white rounded-lg transition-colors text-sm font-medium"
          >
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
          <button 
            onClick={() => navigate('/MockTest')}
            className="w-full sm:w-auto px-6 py-2.5 bg-[#7C3AED] hover:bg-[#6D28D9] text-white rounded-lg transition-colors text-sm font-medium"
          >
            Test Dena Shuru Karein
          </button>
        </div>
        <BottomNav />
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
    <div className="min-h-screen bg-[#0A0D14] text-white font-sans selection:bg-[#7C3AED] selection:text-white pb-20">
      
      {/* Navbar */}
      <nav className="flex items-center justify-between px-4 sm:px-6 py-4 sm:py-5 max-w-5xl mx-auto border-b border-gray-800">
        <div onClick={() => navigate('/HomePage')} className="flex items-center gap-2 cursor-pointer">
          <div className="w-8 h-8 rounded bg-gradient-to-br from-[#8B5CF6] to-[#6D28D9] flex items-center justify-center font-bold text-sm flex-shrink-0">
            mt
          </div>
          <span className="text-base sm:text-xl font-semibold tracking-wide">mockTest.in</span>
        </div>
        <button 
          onClick={() => navigate('/HomePage')}
          className="text-xs sm:text-sm font-medium text-gray-400 hover:text-white transition-colors flex-shrink-0"
        >
          &larr; Home
        </button>
      </nav>

      {/* Main Container */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 mt-6 sm:mt-10 space-y-6">
        
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Detailed Analysis</h1>
          <p className="text-gray-400 mt-1.5 text-sm">
            <span className="text-[#A78BFA] font-medium">{examName}</span> mocks ke aapke performance ke hisaab se
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
          <div className="bg-[#111827] border border-gray-800 rounded-2xl p-4 sm:p-6 shadow-lg">
            <p className="text-sm text-gray-500 font-medium mb-1">Average Score (Last 3)</p>
            <p className="text-3xl sm:text-4xl font-bold text-[#A78BFA]">
              {overview.averageScoreOutOf
                ? `${overview.averageScore}/${overview.averageScoreOutOf}`
                : overview.averageScore}
            </p>
          </div>
          <div className="bg-[#111827] border border-gray-800 rounded-2xl p-4 sm:p-6 shadow-lg">
            <p className="text-sm text-gray-500 font-medium mb-1">Total Mocks Attempted</p>
            <p className="text-3xl sm:text-4xl font-bold text-white">{overview.totalTestsGiven}</p>
          </div>
        </div>

        {/* Subject-wise Analysis — ab tap-able rows, table nahi */}
        <div className="bg-[#111827] border border-gray-800 rounded-2xl overflow-hidden shadow-lg">
          <div className="px-4 sm:px-6 py-4 border-b border-gray-800 bg-[#1F2937]/30">
            <h3 className="font-semibold text-base sm:text-lg">Subject Analysis</h3>
            <p className="text-xs text-gray-500 mt-1">Last 3 mocks ka average data</p>
          </div>
          
          {overview.subjectAnalysis?.length === 0 ? (
            <div className="p-6 text-center text-yellow-500 bg-yellow-500/5 text-sm">
              Subject analysis data khali hai. Apne agle mock ke baad check karein.
            </div>
          ) : (
            <div className="divide-y divide-gray-800">
              {overview.subjectAnalysis?.map((s, i) => {
                const qCount = subjectQuestionCounts[s.subjectName];
                const totalTimeSeconds =
                  qCount != null ? s.averageTimePerQuestion * qCount : null;

                return (
                  <SubjectRow
                    key={i}
                    subject={s}
                    totalTimeSeconds={totalTimeSeconds}
                    questionCount={qCount}
                    onClick={() =>
                      navigate('/UserSubjectAnallysis', {
                        state: { subjectName: s.subjectName, examName: examName },
                      })
                    }
                  />
                );
              })}
            </div>
          )}
        </div>

        {/* Mock History — ab tap-able rows, Mini/Full + subject filters ke sath */}
        <div className="bg-[#111827] border border-gray-800 rounded-2xl overflow-hidden shadow-lg">
          <div className="px-4 sm:px-6 py-4 border-b border-gray-800 bg-[#1F2937]/30">
            <h3 className="font-semibold text-base sm:text-lg">Test History</h3>
            <p className="text-xs text-gray-500 mt-1">Kisi bhi mock par tap karke uska poora result dekhein</p>
          </div>

          {/* Level-1 filter — All / Full Mock / Mini Mock */}
          <div className="px-4 sm:px-6 pt-4 pb-3 border-b border-gray-800 space-y-3">
            <div className="flex gap-2 overflow-x-auto pb-1">
              {MOCK_TYPE_FILTERS.map((f) => (
                <button
                  key={f.key}
                  onClick={() => selectMockType(f.key)}
                  className={`px-4 py-1.5 rounded-full text-sm whitespace-nowrap transition-colors flex-shrink-0 ${
                    mockTypeFilter === f.key
                      ? "bg-[#7C3AED] text-white"
                      : "bg-[#1F2937] border border-gray-800 text-gray-400 hover:text-gray-200"
                  }`}
                >
                  {f.label} ({mockTypeCounts[f.key]})
                </button>
              ))}
            </div>

            {/* Level-2 filter — sirf Mini Mock ke andar, subject-wise */}
            {mockTypeFilter === "Mini" && miniSubjects.length > 0 && (
              <div className="flex gap-2 overflow-x-auto pb-1">
                <button
                  onClick={() => setMiniSubjectFilter("all")}
                  className={`px-3.5 py-1 rounded-full text-xs whitespace-nowrap transition-colors flex-shrink-0 ${
                    miniSubjectFilter === "all"
                      ? "bg-[#A78BFA]/20 text-[#A78BFA] border border-[#A78BFA]/40"
                      : "bg-transparent border border-gray-800 text-gray-500 hover:text-gray-300"
                  }`}
                >
                  Sabhi Subjects ({miniSubjectCounts.all || 0})
                </button>
                {miniSubjects.map((subj) => (
                  <button
                    key={subj}
                    onClick={() => setMiniSubjectFilter(subj)}
                    className={`px-3.5 py-1 rounded-full text-xs whitespace-nowrap transition-colors flex-shrink-0 ${
                      miniSubjectFilter === subj
                        ? "bg-[#A78BFA]/20 text-[#A78BFA] border border-[#A78BFA]/40"
                        : "bg-transparent border border-gray-800 text-gray-500 hover:text-gray-300"
                    }`}
                  >
                    {subj} ({miniSubjectCounts[subj] || 0})
                  </button>
                ))}
              </div>
            )}
          </div>

          {filteredHistory.length === 0 ? (
            <p className="px-4 sm:px-6 py-8 text-sm text-gray-400 text-center">
              Is category mein koi mock nahi mila.
            </p>
          ) : (
            <div className="divide-y divide-gray-800">
              {filteredHistory.map((g) => (
                <HistoryRow
                  key={g.performanceId}
                  entry={g}
                  onClick={() => setViewingMockId(g.performanceId)}
                />
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
      <div className="min-h-screen bg-[#0A0D14] text-white flex items-center justify-center px-4 pb-20">
        <div className="max-w-md w-full text-center space-y-4">
          <p className="text-gray-300">{error?.response?.data?.message || "Data load nahi ho paaya."}</p>
          <button
            onClick={onBack}
            className="px-5 py-2 rounded-lg bg-[#7C3AED] hover:bg-[#6D28D9] text-sm font-medium"
          >
            Wapas Jaayein
          </button>
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
          <button
            onClick={closeReview}
            className="text-sm text-gray-400 hover:text-white mb-5 sm:mb-6 flex items-center gap-1"
          >
            &larr; Result par wapas jaayein
          </button>

          <h1 className="text-xl sm:text-2xl font-bold mb-4">Question Review</h1>

          {subjects.length > 1 && (
            <div className="flex gap-2 mb-4 overflow-x-auto pb-1">
              <button
                onClick={() => { setSubjectFilter("all"); setIndex(0); }}
                className={`px-4 py-1.5 rounded-full text-sm whitespace-nowrap transition-colors flex-shrink-0 ${
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
                  className={`px-4 py-1.5 rounded-full text-sm whitespace-nowrap transition-colors flex-shrink-0 ${
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

          <div className="flex gap-2 mb-5 sm:mb-6 overflow-x-auto pb-1">
            {STATUS_FILTERS.map((f) => (
              <button
                key={f.key}
                onClick={() => { setStatusFilter(f.key); setIndex(0); }}
                className={`px-4 py-1.5 rounded-full text-sm whitespace-nowrap transition-colors flex-shrink-0 ${
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
        <BottomNav />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0A0D14] text-white px-4 sm:px-6 py-8 sm:py-12 pb-24">
      <div className="max-w-2xl mx-auto">
        <button
          onClick={onBack}
          className="text-sm text-gray-400 hover:text-white mb-5 sm:mb-6 flex items-center gap-1"
        >
          &larr; Test History par wapas jaayein
        </button>

        <h1 className="text-xl sm:text-2xl font-bold mb-1">{overview.blueprintName}</h1>
        <p className="text-gray-400 text-sm mb-6 sm:mb-8">{overview.examName}</p>

        <div className="bg-[#111827] border border-gray-800 rounded-2xl p-6 sm:p-8 text-center mb-6">
          <p className="text-4xl sm:text-5xl font-bold text-[#A78BFA]">{overview.totalScore}</p>
          <p className="text-sm text-gray-500 mt-1">Total Score &middot; {overview.accuracy}% Accuracy</p>
        </div>

        <div className="grid grid-cols-3 gap-3 sm:gap-4 mb-6 sm:mb-8">
          <button
            onClick={() => openReview("correct")}
            className="bg-[#1F2937] border border-gray-800 hover:border-green-500/50 rounded-xl p-3 sm:p-4 text-center transition-colors"
          >
            <p className="text-lg sm:text-xl font-bold text-green-400">{overview.correct}</p>
            <p className="text-[11px] text-gray-500 mt-1">Correct</p>
          </button>
          <button
            onClick={() => openReview("wrong")}
            className="bg-[#1F2937] border border-gray-800 hover:border-red-500/50 rounded-xl p-3 sm:p-4 text-center transition-colors"
          >
            <p className="text-lg sm:text-xl font-bold text-red-400">{overview.wrong}</p>
            <p className="text-[11px] text-gray-500 mt-1">Wrong</p>
          </button>
          <button
            onClick={() => openReview("unattempted")}
            className="bg-[#1F2937] border border-gray-800 hover:border-gray-500/50 rounded-xl p-3 sm:p-4 text-center transition-colors"
          >
            <p className="text-lg sm:text-xl font-bold text-gray-300">{overview.unattempted}</p>
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
      <BottomNav />
    </div>
  );
};

// ──────────────────────────────────────────────
// Single question detail card (options + explanation)
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
    <div className="bg-[#111827] border border-gray-800 rounded-2xl p-4 sm:p-6">
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