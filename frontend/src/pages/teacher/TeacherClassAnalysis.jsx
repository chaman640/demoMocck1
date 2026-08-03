import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../api/api";
import TeacherBottomNav from "../../components/TeacherBottomNav";
import ActiveCouponSwitcher from "../../components/ActiveCouponSwitcher";

const SkeletonBlock = ({ className = "" }) => (
  <div className={`bg-gray-800/70 rounded animate-pulse ${className}`} />
);

const PageSkeleton = () => (
  <div className="min-h-screen bg-[#0A0D14] text-white px-4 sm:px-6 py-8 pb-24">
    <div className="max-w-2xl mx-auto space-y-4">
      <SkeletonBlock className="w-48 h-7" />
      <SkeletonBlock className="w-full h-16 rounded-xl" />
      <SkeletonBlock className="w-full h-40 rounded-2xl" />
    </div>
  </div>
);

const FILTERS = [
  { key: "all", label: "Sabhi Students" },
  { key: "top25", label: "Top 25%" },
  { key: "bottom25", label: "Bottom 25%" },
  { key: "custom", label: "Custom" },
];

const wrongColor = (pct) => {
  if (pct >= 60) return "text-red-400 bg-red-500/10 border-red-500/30";
  if (pct >= 30) return "text-yellow-400 bg-yellow-500/10 border-yellow-500/30";
  return "text-green-400 bg-green-500/10 border-green-500/30";
};

const TeacherClassAnalysis = () => {
  const navigate = useNavigate();

  const [phase, setPhase] = useState("loading");
  const [teacher, setTeacher] = useState(null);
  const [errorMsg, setErrorMsg] = useState("");

  const [filter, setFilter] = useState("all");
  const [minPercentile, setMinPercentile] = useState(25);
  const [maxPercentile, setMaxPercentile] = useState(75);

  const [topicPhase, setTopicPhase] = useState("idle"); // idle | loading | loaded | error
  const [topicData, setTopicData] = useState(null);
  const [topicError, setTopicError] = useState("");

  const [drillDown, setDrillDown] = useState(null); // { subjectName, topicName }
  const [questionPhase, setQuestionPhase] = useState("idle");
  const [questionData, setQuestionData] = useState(null);
  const [questionError, setQuestionError] = useState("");

  const load = useCallback(async () => {
    setPhase("loading");
    try {
      const meRes = await api.get("/teacher-me");
      setTeacher(meRes.data.data);
      setPhase("view");
    } catch (err) {
      if (err.response?.status === 401) {
        navigate("/TeacherLogin");
        return;
      }
      setErrorMsg(err.response?.data?.message || "Data load nahi ho paaya.");
      setPhase("error");
    }
  }, [navigate]);

  useEffect(() => { load(); }, [load]);

  const fetchTopics = useCallback(async () => {
    setTopicPhase("loading");
    setTopicError("");
    setDrillDown(null);
    try {
      const params = { filter };
      if (filter === "custom") {
        params.minPercentile = minPercentile;
        params.maxPercentile = maxPercentile;
      }
      const res = await api.get("/teacher/class-analysis/topics", { params });
      setTopicData(res.data.data);
      setTopicPhase("loaded");
    } catch (err) {
      setTopicError(err.response?.data?.message || "Topic analysis load nahi ho paaya.");
      setTopicPhase("error");
    }
  }, [filter, minPercentile, maxPercentile]);

  useEffect(() => {
    if (teacher?.activeCoupon) fetchTopics();
  }, [teacher?.activeCoupon, fetchTopics]);

  const handleCouponChanged = () => {
    setTopicData(null);
    setDrillDown(null);
    load();
  };

  const openDrillDown = async (subjectName, topicName) => {
    setDrillDown({ subjectName, topicName });
    setQuestionPhase("loading");
    setQuestionError("");
    try {
      const params = { filter };
      if (filter === "custom") {
        params.minPercentile = minPercentile;
        params.maxPercentile = maxPercentile;
      }
      const res = await api.get(
        `/teacher/class-analysis/questions/${encodeURIComponent(subjectName)}/${encodeURIComponent(topicName)}`,
        { params }
      );
      setQuestionData(res.data.data);
      setQuestionPhase("loaded");
    } catch (err) {
      setQuestionError(err.response?.data?.message || "Question analysis load nahi ho paaya.");
      setQuestionPhase("error");
    }
  };

  const closeDrillDown = () => {
    setDrillDown(null);
    setQuestionData(null);
  };

  if (phase === "loading") return <PageSkeleton />;

  if (phase === "error") {
    return (
      <div className="min-h-screen bg-[#0A0D14] text-white flex items-center justify-center px-6 pb-24">
        <div className="max-w-md text-center space-y-4">
          <p className="text-gray-300">{errorMsg}</p>
          <button onClick={load} className="px-5 py-2 rounded-lg bg-[#7C3AED] hover:bg-[#6D28D9] text-sm font-medium">
            Dobara Try Karein
          </button>
        </div>
        <TeacherBottomNav />
      </div>
    );
  }

  // ── Drill-down view ──
  if (drillDown) {
    return (
      <div className="min-h-screen bg-[#0A0D14] text-white px-4 sm:px-6 py-8 pb-24">
        <div className="max-w-2xl mx-auto space-y-6">
          <button onClick={closeDrillDown} className="text-sm text-gray-400 hover:text-white flex items-center gap-1">
            &larr; Topics Par Wapas
          </button>

          <div>
            <h1 className="text-xl font-bold mb-1">{drillDown.topicName}</h1>
            <p className="text-gray-400 text-sm">{drillDown.subjectName} &middot; question-level breakdown</p>
          </div>

          {questionPhase === "loading" && (
            <div className="flex justify-center py-10">
              <div className="w-8 h-8 border-4 border-gray-700 border-t-[#8B5CF6] rounded-full animate-spin" />
            </div>
          )}

          {questionPhase === "error" && (
            <div className="p-4 bg-red-500/10 text-red-400 border border-red-500/25 rounded-xl text-sm text-center">
              {questionError}
            </div>
          )}

          {questionPhase === "loaded" && questionData && (
            <>
              <p className="text-xs text-gray-500">
                {questionData.selectedCount} students ka data (batch mein total {questionData.totalBatchStudents})
              </p>

              {questionData.questions.length === 0 ? (
                <div className="bg-[#111827] border border-gray-800 rounded-2xl p-6 text-center">
                  <p className="text-sm text-gray-400">Is topic ke liye koi attempt data nahi mila.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {questionData.questions.map((q) => (
                    <div key={q.questionId} className="bg-[#111827] border border-gray-800 rounded-2xl p-5">
                      <div className="flex items-center justify-between mb-3 gap-3">
                        <span className={`text-xs px-2.5 py-1 rounded-full border font-medium flex-shrink-0 ${wrongColor(q.wrongPercentage)}`}>
                          {q.wrongPercentage}% galat
                        </span>
                        <span className="text-[11px] text-gray-500">{q.totalAttempts} attempts</span>
                      </div>
                      <p className="text-sm text-gray-200 mb-4 leading-relaxed">{q.question}</p>

                      <div className="space-y-2">
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
                                <div
                                  className={`h-full ${isCorrect ? "bg-green-500" : "bg-red-500/70"}`}
                                  style={{ width: `${pickPct}%` }}
                                />
                              </div>
                            </div>
                          );
                        })}
                      </div>
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
  }

  // ── Main topic-list view ──
  return (
    <div className="min-h-screen bg-[#0A0D14] text-white px-4 sm:px-6 py-8 pb-24">
      <div className="max-w-2xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold mb-1">Class Analysis</h1>
          <p className="text-gray-400 text-sm">Kaunse topics mein poori class ko sabse zyada dikkat hai</p>
        </div>

        <ActiveCouponSwitcher activeCouponId={teacher?.activeCoupon} onChanged={handleCouponChanged} />

        {!teacher?.activeCoupon ? (
          <div className="bg-[#111827] border border-gray-800 rounded-2xl p-6 text-center">
            <p className="text-sm text-gray-400">Analysis dekhne ke liye pehle active batch select karein.</p>
          </div>
        ) : (
          <>
            {/* Filter tabs */}
            <div className="flex gap-2 overflow-x-auto pb-1">
              {FILTERS.map((f) => (
                <button
                  key={f.key}
                  onClick={() => setFilter(f.key)}
                  className={`px-4 py-1.5 rounded-full text-sm whitespace-nowrap flex-shrink-0 transition-colors ${
                    filter === f.key ? "bg-[#7C3AED] text-white" : "bg-[#111827] border border-gray-800 text-gray-400"
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>

            {/* Custom range inputs */}
            {filter === "custom" && (
              <div className="bg-[#111827] border border-gray-800 rounded-xl p-4 flex items-center gap-3">
                <div className="flex-1">
                  <label className="block text-[10px] text-gray-500 uppercase mb-1">Min Percentile</label>
                  <input
                    type="number"
                    min="0"
                    max="99"
                    value={minPercentile}
                    onChange={(e) => setMinPercentile(e.target.value)}
                    className="w-full px-3 py-2 text-sm bg-[#0A0D14] border border-gray-700 rounded-lg outline-none text-white"
                  />
                </div>
                <div className="flex-1">
                  <label className="block text-[10px] text-gray-500 uppercase mb-1">Max Percentile</label>
                  <input
                    type="number"
                    min="1"
                    max="100"
                    value={maxPercentile}
                    onChange={(e) => setMaxPercentile(e.target.value)}
                    className="w-full px-3 py-2 text-sm bg-[#0A0D14] border border-gray-700 rounded-lg outline-none text-white"
                  />
                </div>
                <button
                  onClick={fetchTopics}
                  className="px-4 py-2.5 rounded-lg bg-[#7C3AED] hover:bg-[#6D28D9] text-sm font-medium flex-shrink-0 mt-4"
                >
                  Apply
                </button>
              </div>
            )}

            {topicPhase === "loading" && (
              <div className="flex justify-center py-10">
                <div className="w-8 h-8 border-4 border-gray-700 border-t-[#8B5CF6] rounded-full animate-spin" />
              </div>
            )}

            {topicPhase === "error" && (
              <div className="p-4 bg-red-500/10 text-red-400 border border-red-500/25 rounded-xl text-sm text-center">
                {topicError}
              </div>
            )}

            {topicPhase === "loaded" && topicData && (
              <>
                <p className="text-xs text-gray-500">
                  {topicData.selectedCount} students ka data &middot; batch mein total {topicData.totalBatchStudents} students
                </p>

                {topicData.topics.length === 0 ? (
                  <div className="bg-[#111827] border border-gray-800 rounded-2xl p-6 text-center">
                    <p className="text-sm text-gray-400">Is filter ke liye koi attempt data nahi mila.</p>
                  </div>
                ) : (
                  <div className="bg-[#111827] border border-gray-800 rounded-2xl overflow-hidden">
                    <div className="px-4 py-3 border-b border-gray-800">
                      <h3 className="font-semibold text-sm">Topic-wise Error Breakdown</h3>
                      <p className="text-[11px] text-gray-500 mt-0.5">Sabse zyada galti wale topics upar</p>
                    </div>
                    <div className="divide-y divide-gray-800">
                      {topicData.topics.map((t, i) => (
                        <button
                          key={i}
                          onClick={() => openDrillDown(t.subjectName, t.topicName)}
                          className="w-full text-left px-4 py-3.5 hover:bg-[#1F2937]/50 transition-colors flex items-center gap-3"
                        >
                          <div className="min-w-0 flex-1">
                            <p className="text-sm text-gray-200 truncate">{t.topicName}</p>
                            <p className="text-[11px] text-gray-500 mt-0.5">
                              {t.subjectName} &middot; {t.totalAttempts} attempts
                            </p>
                          </div>
                          <span className={`text-xs px-2.5 py-1 rounded-full border font-medium flex-shrink-0 ${wrongColor(t.wrongPercentage)}`}>
                            {t.wrongPercentage}% galat
                          </span>
                          <span className="text-[#A78BFA] text-xs flex-shrink-0">→</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </>
        )}
      </div>
      <TeacherBottomNav />
    </div>
  );
};

export default TeacherClassAnalysis;