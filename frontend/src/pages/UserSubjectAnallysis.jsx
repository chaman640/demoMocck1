import React, { useState, useEffect, useMemo } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import api from "../api/api";

// Logo
const LOGO_URL = "/logo.svg";

// ──────────────────────────────────────────────
// Converts seconds into a readable "Xm Ys" format
// ──────────────────────────────────────────────
const formatDuration = (totalSeconds) => {
  if (totalSeconds == null || isNaN(totalSeconds)) return "N/A";
  const safe = Math.max(0, Math.round(totalSeconds));
  const mins = Math.floor(safe / 60);
  const secs = safe % 60;
  if (mins === 0) return `${secs}s`;
  return `${mins}m ${secs}s`;
};

const formatShortDate = (d) => new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short" });

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
          <div key={i} className={`bg-[#111827] border border-gray-800 rounded-2xl p-4 ${i === 3 ? "col-span-2" : ""}`}>
            <SkeletonBlock className="w-20 h-3 mb-3" />
            <SkeletonBlock className="w-14 h-6" />
          </div>
        ))}
      </div>

      <SkeletonBlock className="w-full h-48 rounded-2xl" />

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
    </div>
  </div>
);

// ──────────────────────────────────────────────
// Accuracy trend chart
// ──────────────────────────────────────────────
const SubjectTrendChart = ({ graphData }) => {
  if (!graphData || graphData.length < 2) return null;
  const chartData = graphData.map((g) => ({ ...g, label: formatShortDate(g.date) }));
  return (
    <div className="bg-[#111827] border border-gray-800 rounded-2xl overflow-hidden shadow-lg">
      <div className="px-4 sm:px-6 py-4 border-b border-gray-800 bg-[#1F2937]/30">
        <h3 className="font-semibold text-base sm:text-lg">Accuracy Trend</h3>
        <p className="text-xs text-gray-500 mt-1">Your accuracy in this subject, mock by mock</p>
      </div>
      <div className="px-2 sm:px-4 py-4">
        <ResponsiveContainer width="100%" height={200}>
          <LineChart data={chartData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1F2937" />
            <XAxis dataKey="label" tick={{ fill: "#6B7280", fontSize: 11 }} interval="preserveStartEnd" />
            <YAxis domain={[0, 100]} tick={{ fill: "#6B7280", fontSize: 11 }} />
            <Tooltip
              contentStyle={{ background: "#111827", border: "1px solid #1F2937", borderRadius: 8, fontSize: 12 }}
              formatter={(value) => [`${value}%`, "Accuracy"]}
            />
            <Line type="monotone" dataKey="accuracy" stroke="#A78BFA" strokeWidth={2} dot={{ r: 3, fill: "#A78BFA" }} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

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
      <p className="text-sm font-medium text-gray-200 truncate flex-1 min-w-0">{topic.topicName}</p>
      <span className={`flex-shrink-0 px-2 py-0.5 rounded text-xs font-semibold ${efficiencyClass}`}>
        {topic.totalAttempted != null ? `${topic.correctCount}/${topic.totalAttempted}` : `${topic.efficiency}%`}
      </span>
      <span className={`flex-shrink-0 text-xs font-medium ${tone === "weak" ? "text-red-300" : "text-[#A78BFA]"}`}>&rarr;</span>
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
      navigate("/UserAllAnalysis");
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
        setError(err.response?.data?.message || "Something went wrong while loading this data.");
      } finally {
        setLoading(false);
      }
    };

    fetchSubjectAnalysis();
  }, [subjectNameFromState, examNameFromState, navigate]);

  const totalTimeSeconds = useMemo(() => {
    if (!data?.topicList || !data.totalTestsConsidered) return null;
    const totalAttempts = data.topicList.reduce((sum, t) => sum + (t.totalAttempted || 0), 0);
    const questionsPerMock = totalAttempts / data.totalTestsConsidered;
    return data.averageTimePerQuestion * questionsPerMock;
  }, [data]);

  const topicStatsMap = useMemo(() => {
    const map = {};
    (data?.topicList || []).forEach((t) => {
      map[t.topicName] = { correctCount: t.correctCount, totalAttempted: t.totalAttempted };
    });
    return map;
  }, [data]);

  const goToTopic = (topicName) => {
    navigate("/UserTopicAnalysis", { state: { examName: activeExamName, subjectName: data.subjectName, topicName } });
  };

  if (loading) return <SubjectAnalysisSkeleton />;

  if (error) {
    return (
      <div className="min-h-screen bg-[#0A0D14] text-white flex flex-col items-center justify-center px-4">
        <div className="bg-[#111827] border border-red-500/30 p-6 sm:p-8 rounded-2xl max-w-md w-full text-center shadow-2xl">
          <div className="w-16 h-16 bg-red-500/10 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4 text-3xl font-bold">!</div>
          <h2 className="text-xl font-bold mb-2">Oops! Error</h2>
          <p className="text-gray-400 mb-6 text-sm">{error}</p>
          <button onClick={() => navigate("/UserAllAnalysis")} className="w-full sm:w-auto px-6 py-2.5 bg-[#7C3AED] hover:bg-[#6D28D9] text-white rounded-lg transition-colors text-sm font-medium">Go Back</button>
        </div>
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="min-h-screen bg-[#0A0D14] text-white font-sans pb-16">
      <nav className="flex items-center justify-between px-4 sm:px-6 py-4 sm:py-5 max-w-6xl mx-auto border-b border-gray-800">
        <div onClick={() => navigate("/HomePage")} className="flex items-center gap-2 cursor-pointer">
          <img src={LOGO_URL} alt="BatchMock.in" className="w-8 h-8 object-contain rounded flex-shrink-0" />
          <span className="text-base sm:text-xl font-semibold tracking-wide">BatchMock.in</span>
        </div>
        <button onClick={() => navigate("/UserAllAnalysis")} className="text-xs sm:text-sm font-medium text-gray-400 hover:text-white transition-colors flex-shrink-0">&larr; Overview</button>
      </nav>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 mt-6 sm:mt-10 space-y-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight"><span className="text-[#A78BFA]">{data.subjectName}</span></h1>
          <p className="text-gray-400 mt-1.5 text-sm">A deep analysis of this subject based on your last 3 mocks.</p>
        </div>

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

        <SubjectTrendChart graphData={data.graphData} />

        <div className="bg-[#111827] border border-gray-800 rounded-2xl overflow-hidden shadow-lg">
          <div className="px-4 sm:px-6 py-4 border-b border-gray-800 bg-[#1F2937]/30">
            <h3 className="font-semibold text-base sm:text-lg">Topic-wise Efficiency</h3>
            <p className="text-xs text-gray-500 mt-1">{data.topicList?.length || 0} topics covered in this subject</p>
          </div>
          {data.topicList?.length === 0 ? (
            <p className="p-6 text-sm text-yellow-500">No topic data available for this subject yet.</p>
          ) : (
            <div className="divide-y divide-gray-800">
              {data.topicList?.map((t, i) => (
                <TopicRow key={i} topic={t} onClick={() => goToTopic(t.topicName)} />
              ))}
            </div>
          )}
        </div>

        <div className="bg-[#111827] border border-gray-800 rounded-2xl overflow-hidden shadow-lg">
          <div className="px-4 sm:px-6 py-4 border-b border-gray-800 bg-red-900/10">
            <h3 className="font-semibold text-base sm:text-lg text-red-400">Top Weak Topics</h3>
            <p className="text-xs text-gray-500 mt-1">Focus here — this is where your score will improve the most</p>
          </div>
          {data.weakTopics?.length === 0 ? (
            <p className="p-6 text-sm text-green-400">Great! No major weak topics found.</p>
          ) : (
            <div className="divide-y divide-gray-800">
              {data.weakTopics?.map((t, i) => (
                <TopicRow key={i} topic={{ ...t, ...(topicStatsMap[t.topicName] || {}) }} tone="weak" onClick={() => goToTopic(t.topicName)} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default UserSubjectAnallysis;
