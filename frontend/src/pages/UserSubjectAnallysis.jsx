import React, { useState, useEffect, useMemo } from "react";
import { useNavigate, useLocation } from "react-router-dom";
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

// ──────────────────────────────────────────────
// Skeleton loading building blocks
// ──────────────────────────────────────────────
const SkeletonBlock = ({ className = "" }) => (
  <div className={`bg-gray-800/70 rounded animate-pulse ${className}`} />
);

const SubjectAnalysisSkeleton = () => (
  <div className="min-h-screen bg-[#0A0D14] text-white pb-16">
    <nav className="flex items-center justify-between px-4 sm:px-6 py-4 sm:py-5 max-w-6xl mx-auto border-b border-gray-800">
      <div className="flex items-center gap-2">
        <SkeletonBlock className="w-8 h-8 rounded" />
        <SkeletonBlock className="w-28 h-5" />
      </div>
      <SkeletonBlock className="w-20 h-4" />
    </nav>

    <div className="max-w-6xl mx-auto px-4 sm:px-6 mt-6 sm:mt-10 space-y-6">
      <div className="space-y-2">
        <SkeletonBlock className="w-52 h-6" />
        <SkeletonBlock className="w-72 h-4" />
      </div>

      <div className="grid grid-cols-2 gap-3">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className={`bg-[#111827] border border-gray-800 rounded-2xl p-4 ${
              i === 3 ? "col-span-2" : ""
            }`}
          >
            <SkeletonBlock className="w-20 h-3 mb-3" />
            <SkeletonBlock className="w-14 h-6" />
          </div>
        ))}
      </div>

      <div className="bg-[#111827] border border-gray-800 rounded-2xl overflow-hidden">
        <div className="px-4 sm:px-6 py-4">
          <SkeletonBlock className="w-40 h-4 mb-2" />
          <SkeletonBlock className="w-52 h-3" />
        </div>
        <div className="divide-y divide-gray-800">
          {[1, 2, 3].map((i) => (
            <div key={i} className="px-4 py-2.5">
              <SkeletonBlock className="w-full h-8 rounded-lg" />
            </div>
          ))}
        </div>
      </div>

      <div className="bg-[#111827] border border-gray-800 rounded-2xl overflow-hidden">
        <div className="px-4 sm:px-6 py-4">
          <SkeletonBlock className="w-36 h-4 mb-2" />
          <SkeletonBlock className="w-52 h-3" />
        </div>
        <div className="divide-y divide-gray-800">
          {[1, 2].map((i) => (
            <div key={i} className="px-4 py-2.5">
              <SkeletonBlock className="w-full h-8 rounded-lg" />
            </div>
          ))}
        </div>
      </div>
    </div>
  </div>
);

// ──────────────────────────────────────────────
// 👇 UPDATED: efficiency % ki jagah ab "correct/attempted" fixed number.
// topicList ke items mein correctCount/totalAttempted seedha backend se
// aata hai. weakTopics mein ye fields nahi aate — unke liye topic ke naam
// se topicList se lookup karke merge kiya jaata hai (parent component mein).
// Agar kabhi stats na milein to purana % fallback ke tor pe dikh jayega.
// ──────────────────────────────────────────────
const TopicRow = ({ topic, tone = "default", onClick }) => {
  const efficiencyClass =
    topic.efficiency >= 70
      ? "text-green-400 bg-green-500/10"
      : topic.efficiency >= 40
      ? "text-yellow-400 bg-yellow-500/10"
      : "text-red-400 bg-red-500/10";

  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors ${
        tone === "weak" ? "hover:bg-red-500/5" : "hover:bg-[#1F2937]/50"
      }`}
    >
      <p className="text-sm font-medium text-gray-200 truncate flex-1 min-w-0">
        {topic.topicName}
      </p>
      <span
        className={`flex-shrink-0 px-2 py-0.5 rounded text-xs font-semibold ${efficiencyClass}`}
      >
        {topic.totalAttempted != null
          ? `${topic.correctCount}/${topic.totalAttempted}`
          : `${topic.efficiency}%`}
      </span>
      <span
        className={`flex-shrink-0 text-xs font-medium ${
          tone === "weak" ? "text-red-300" : "text-[#A78BFA]"
        }`}
      >
        &rarr;
      </span>
    </button>
  );
};

const UserSubjectAnallysis = () => {
  const navigate = useNavigate();
  const location = useLocation();
  
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeExamName, setActiveExamName] = useState("");

  const subjectNameFromState = location.state?.subjectName;
  const examNameFromState = location.state?.examName;

  useEffect(() => {
    if (!subjectNameFromState) {
      navigate('/UserAllAnalysis');
      return;
    }

    const fetchSubjectAnalysis = async () => {
      try {
        setLoading(true);
        setError(null);

        let currentExam = examNameFromState;

        if (!currentExam) {
          const meRes = await api.get("/me");
          currentExam = meRes.data.data.exam;
        }
        
        setActiveExamName(currentExam);

        const examEncoded = encodeURIComponent(currentExam);
        const subjectEncoded = encodeURIComponent(subjectNameFromState);
        
        const res = await api.get(`/analysis/subject/active_user/${examEncoded}/${subjectEncoded}`);

        setData(res.data.data);
      } catch (err) {
        setError(err.response?.data?.message || "Data laane mein error aaya.");
      } finally {
        setLoading(false);
      }
    };

    fetchSubjectAnalysis();
  }, [subjectNameFromState, examNameFromState, navigate]);

  // Total time calculate karna — topicList se average question-count per mock nikal ke,
  // averageTimePerQuestion se multiply karte hain
  const totalTimeSeconds = useMemo(() => {
    if (!data?.topicList || !data.totalTestsConsidered) return null;
    const totalAttempts = data.topicList.reduce((sum, t) => sum + (t.totalAttempted || 0), 0);
    const questionsPerMock = totalAttempts / data.totalTestsConsidered;
    return data.averageTimePerQuestion * questionsPerMock;
  }, [data]);

  // 👇 NAYA: topicName → {correctCount, totalAttempted} lookup — weakTopics
  // mein ye fields backend se nahi aate, isliye topicList se nikal ke,
  // render karte waqt merge karte hain (koi backend change nahi kiya)
  const topicStatsMap = useMemo(() => {
    const map = {};
    (data?.topicList || []).forEach((t) => {
      map[t.topicName] = { correctCount: t.correctCount, totalAttempted: t.totalAttempted };
    });
    return map;
  }, [data]);

  const goToTopic = (topicName) => {
    navigate('/UserTopicAnalysis', {
      state: {
        examName: activeExamName,
        subjectName: data.subjectName,
        topicName,
      },
    });
  };

  if (loading) {
    return <SubjectAnalysisSkeleton />;
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[#0A0D14] text-white flex flex-col items-center justify-center px-4">
        <div className="bg-[#111827] border border-red-500/30 p-6 sm:p-8 rounded-2xl max-w-md w-full text-center shadow-2xl">
          <div className="w-16 h-16 bg-red-500/10 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4 text-3xl font-bold">
            !
          </div>
          <h2 className="text-xl font-bold mb-2">Oops! Error</h2>
          <p className="text-gray-400 mb-6 text-sm">{error}</p>
          <button 
            onClick={() => navigate('/UserAllAnalysis')}
            className="w-full sm:w-auto px-6 py-2.5 bg-[#7C3AED] hover:bg-[#6D28D9] text-white rounded-lg transition-colors text-sm font-medium"
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
      
      {/* Navbar — mobile pe kam padding */}
      <nav className="flex items-center justify-between px-4 sm:px-6 py-4 sm:py-5 max-w-6xl mx-auto border-b border-gray-800">
        <div onClick={() => navigate('/HomePage')} className="flex items-center gap-2 cursor-pointer">
          <div className="w-8 h-8 rounded bg-gradient-to-br from-[#8B5CF6] to-[#6D28D9] flex items-center justify-center font-bold text-sm flex-shrink-0">
            mt
          </div>
          <span className="text-base sm:text-xl font-semibold tracking-wide">mockTest.in</span>
        </div>
        <button 
          onClick={() => navigate('/UserAllAnalysis')}
          className="text-xs sm:text-sm font-medium text-gray-400 hover:text-white transition-colors flex-shrink-0"
        >
          &larr; Overview
        </button>
      </nav>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 mt-6 sm:mt-10 space-y-6">
        
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
            <span className="text-[#A78BFA]">{data.subjectName}</span>
          </h1>
          <p className="text-gray-400 mt-1.5 text-sm">
            Aapke last 3 mocks ke hisaab se is subject ki deep analysis.
          </p>
        </div>

        {/* Stats — mobile pe already 2-column, teesra full-width */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-[#111827] border border-gray-800 rounded-2xl p-4 shadow-lg">
            <p className="text-xs text-gray-500 font-medium mb-1">Avg. Accuracy</p>
            <p className="text-xl sm:text-2xl font-bold text-[#10B981]">{data.averageAccuracy}%</p>
          </div>
          <div className="bg-[#111827] border border-gray-800 rounded-2xl p-4 shadow-lg">
            <p className="text-xs text-gray-500 font-medium mb-1">Avg Time / Q</p>
            <p className="text-xl sm:text-2xl font-bold text-[#3B82F6]">{data.averageTimePerQuestion}s</p>
          </div>
          <div className="bg-[#111827] border border-gray-800 rounded-2xl p-4 shadow-lg col-span-2">
            <p className="text-xs text-gray-500 font-medium mb-1">Total Time (Subject)</p>
            <p className="text-xl sm:text-2xl font-bold text-[#A78BFA]">{formatDuration(totalTimeSeconds)}</p>
          </div>
        </div>

        {/* Topic-wise Efficiency — patli card-rows */}
        <div className="bg-[#111827] border border-gray-800 rounded-2xl overflow-hidden shadow-lg">
          <div className="px-4 sm:px-6 py-4 border-b border-gray-800 bg-[#1F2937]/30">
            <h3 className="font-semibold text-base sm:text-lg">Topic-wise Efficiency</h3>
            <p className="text-xs text-gray-500 mt-1">
              {data.topicList?.length || 0} topics is subject mein cover hue
            </p>
          </div>

          {data.topicList?.length === 0 ? (
            <p className="p-6 text-sm text-yellow-500">
              Is subject ke liye abhi koi topic data nahi hai.
            </p>
          ) : (
            <div className="divide-y divide-gray-800">
              {data.topicList?.map((t, i) => (
                <TopicRow key={i} topic={t} onClick={() => goToTopic(t.topicName)} />
              ))}
            </div>
          )}
        </div>

        {/* Top Weak Topics — same patli pattern, red tint */}
        <div className="bg-[#111827] border border-gray-800 rounded-2xl overflow-hidden shadow-lg">
          <div className="px-4 sm:px-6 py-4 border-b border-gray-800 bg-red-900/10">
            <h3 className="font-semibold text-base sm:text-lg text-red-400">
              Top Weak Topics
            </h3>
            <p className="text-xs text-gray-500 mt-1">
              Inpe focus karo — score sabse zyada yahin se sudhrega
            </p>
          </div>

          {data.weakTopics?.length === 0 ? (
            <p className="p-6 text-sm text-green-400">
              Badhiya! Koi khaas kamzor topic nahi mila.
            </p>
          ) : (
            <div className="divide-y divide-gray-800">
              {data.weakTopics?.map((t, i) => (
                <TopicRow
                  key={i}
                  topic={{ ...t, ...(topicStatsMap[t.topicName] || {}) }}
                  tone="weak"
                  onClick={() => goToTopic(t.topicName)}
                />
              ))}
            </div>
          )}
        </div>

      </div>
    </div>
  );
};

export default UserSubjectAnallysis;