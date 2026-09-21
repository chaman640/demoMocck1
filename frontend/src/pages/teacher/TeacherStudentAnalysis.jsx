import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import api from "../../api/api";
import TeacherBottomNav from "../../components/TeacherBottomNav";

const SkeletonBlock = ({ className = "" }) => (
  <div className={`bg-gray-800/70 rounded animate-pulse ${className}`} />
);

const PageSkeleton = () => (
  <div className="min-h-screen bg-[#0A0D14] text-white px-4 sm:px-6 py-8 pb-24">
    <div className="max-w-2xl mx-auto space-y-4">
      <SkeletonBlock className="w-48 h-7" />
      <SkeletonBlock className="w-full h-24 rounded-2xl" />
      <SkeletonBlock className="w-full h-40 rounded-2xl" />
      <SkeletonBlock className="w-full h-40 rounded-2xl" />
    </div>
  </div>
);

const formatTime = (seconds) => {
  if (seconds == null) return null;
  if (seconds < 60) return `${seconds}s`;
  return `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
};

const HistoryRow = ({ title, subtitle, score, onClick }) => (
  <button onClick={onClick} className="w-full flex items-center gap-3 px-4 py-2.5 text-left hover:bg-[#1F2937]/50 transition-colors">
    <div className="min-w-0 flex-1">
      <p className="text-sm font-medium text-gray-200 truncate">{title}</p>
      <p className="text-[11px] text-gray-500 mt-0.5">{subtitle}</p>
    </div>
    <span className="flex-shrink-0 text-sm font-bold text-white">{score}</span>
    <span className="flex-shrink-0 text-xs font-medium text-[#A78BFA]">&rarr;</span>
  </button>
);

const QuestionDetailCard = ({ q, index }) => {
  const statusLabel = q.isCorrect === true ? "Correct" : q.isCorrect === false ? "Wrong" : "Unattempted";
  const statusColor =
    q.isCorrect === true
      ? "text-green-400 bg-green-500/10 border-green-500/30"
      : q.isCorrect === false
      ? "text-red-400 bg-red-500/10 border-red-500/30"
      : "text-gray-400 bg-gray-500/10 border-gray-500/30";

  return (
    <div className="bg-[#111827] border border-gray-800 rounded-2xl p-4 sm:p-6">
      <div className="flex items-center justify-between mb-4 gap-3 flex-wrap">
        <span className="text-xs text-gray-500">{q.subjectName} &middot; {q.topicName}</span>
        <span className={`text-xs px-2.5 py-1 rounded-full border font-medium ${statusColor}`}>{statusLabel}</span>
      </div>
      <p className="text-sm sm:text-base mb-5 leading-relaxed">
        <span className="text-gray-500 mr-2">Q{index + 1}.</span>
        {q.question}
      </p>
      <div className="space-y-2.5 mb-4">
        {[1, 2, 3, 4].map((n) => {
          const optText = q.options?.[`option${n}`];
          const isCorrectOpt = q.correctOption === n;
          const isUserPick = q.userAnswer === String(n);
          let style = "border-gray-800 bg-[#1F2937] text-gray-300";
          if (isCorrectOpt) style = "border-green-500/40 bg-green-500/10 text-green-300";
          else if (isUserPick) style = "border-red-500/40 bg-red-500/10 text-red-300";
          return (
            <div key={n} className={`px-4 py-3 rounded-xl border flex items-center gap-3 text-sm ${style}`}>
              <span className="w-6 h-6 flex-shrink-0 rounded-full border border-current flex items-center justify-center text-xs">{n}</span>
              <span className="flex-1">{optText}</span>
              {isCorrectOpt && <span className="text-xs flex-shrink-0">✅</span>}
              {isUserPick && !isCorrectOpt && <span className="text-xs flex-shrink-0">❌</span>}
            </div>
          );
        })}
      </div>
      {q.timeTakenInSeconds != null && (
        <p className="text-xs text-gray-500 mb-2">
          Time taken: {q.timeTakenInSeconds}s
          {q.batchAverageTimeSeconds != null && <span className="text-gray-600"> (batch average: {q.batchAverageTimeSeconds}s)</span>}
        </p>
      )}
      {q.answerExplain && (
        <div className="bg-[#1F2937]/50 border border-gray-700/50 rounded-lg p-4 mt-2">
          <p className="text-xs font-semibold tracking-wider text-purple-400 uppercase mb-2">Explanation</p>
          <p className="text-sm text-gray-300 leading-relaxed">{q.answerExplain}</p>
        </div>
      )}
    </div>
  );
};

const AttemptDetailScreen = ({ apiPath, onBack }) => {
  const [phase, setPhase] = useState("loading");
  const [data, setData] = useState(null);
  const [errorMsg, setErrorMsg] = useState("");
  const [index, setIndex] = useState(0);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await api.get(apiPath);
        if (!cancelled) { setData(res.data.data); setPhase("loaded"); }
      } catch (err) {
        if (!cancelled) { setErrorMsg(err.response?.data?.message || "Could not load this attempt."); setPhase("error"); }
      }
    })();
    return () => { cancelled = true; };
  }, [apiPath]);

  if (phase === "loading") {
    return (
      <div className="flex justify-center py-16">
        <div className="w-8 h-8 border-4 border-gray-700 border-t-[#8B5CF6] rounded-full animate-spin" />
      </div>
    );
  }

  if (phase === "error") {
    return (
      <div className="text-center py-10 space-y-3">
        <p className="text-sm text-gray-400">{errorMsg}</p>
        <button onClick={onBack} className="px-4 py-2 rounded-lg bg-[#7C3AED] hover:bg-[#6D28D9] text-sm font-medium">Go Back</button>
      </div>
    );
  }

  const { overview, questionBreakdown, testName, year } = data;
  const currentQ = questionBreakdown[index];

  return (
    <div className="space-y-5">
      <button onClick={onBack} className="text-sm text-gray-400 hover:text-white flex items-center gap-1">&larr; Back</button>
      <div>
        <h2 className="text-lg font-bold">{testName}{year ? ` (${year})` : ""}</h2>
      </div>
      <div className="grid grid-cols-4 gap-2">
        <div className="bg-[#1F2937] border border-gray-800 rounded-xl p-3 text-center">
          <p className="text-lg font-bold text-[#A78BFA]">{overview.totalScore}</p>
          <p className="text-[10px] text-gray-500 mt-0.5">Score</p>
        </div>
        <div className="bg-[#1F2937] border border-gray-800 rounded-xl p-3 text-center">
          <p className="text-lg font-bold text-green-400">{overview.correctCount}</p>
          <p className="text-[10px] text-gray-500 mt-0.5">Correct</p>
        </div>
        <div className="bg-[#1F2937] border border-gray-800 rounded-xl p-3 text-center">
          <p className="text-lg font-bold text-red-400">{overview.wrongCount}</p>
          <p className="text-[10px] text-gray-500 mt-0.5">Wrong</p>
        </div>
        <div className="bg-[#1F2937] border border-gray-800 rounded-xl p-3 text-center">
          <p className="text-lg font-bold text-gray-300">{overview.unattemptedCount}</p>
          <p className="text-[10px] text-gray-500 mt-0.5">Unattempted</p>
        </div>
      </div>

      {questionBreakdown.length === 0 ? (
        <p className="text-sm text-gray-500 text-center py-8">No questions to show (subject access may be restricted).</p>
      ) : (
        <>
          <p className="text-xs text-gray-500">Question {index + 1} of {questionBreakdown.length}</p>
          <QuestionDetailCard q={currentQ} index={index} />
          <div className="flex items-center gap-3">
            <button onClick={() => setIndex((i) => Math.max(0, i - 1))} disabled={index === 0} className="flex-1 px-4 py-2 rounded-lg border border-gray-700 text-sm text-gray-300 disabled:opacity-40">&larr; Previous</button>
            <button onClick={() => setIndex((i) => Math.min(questionBreakdown.length - 1, i + 1))} disabled={index >= questionBreakdown.length - 1} className="flex-1 px-4 py-2 rounded-lg bg-[#7C3AED] hover:bg-[#6D28D9] text-sm font-medium disabled:opacity-40">Next &rarr;</button>
          </div>
        </>
      )}
    </div>
  );
};

const NotesSection = ({ studentId }) => {
  const [notes, setNotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newNote, setNewNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const loadNotes = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get(`/teacher/student-notes/${studentId}`);
      setNotes(res.data.data || []);
    } catch (err) {
      setErrorMsg(err.response?.data?.message || "Could not load notes.");
    } finally {
      setLoading(false);
    }
  }, [studentId]);

  useEffect(() => { loadNotes(); }, [loadNotes]);

  const handleAdd = async () => {
    if (!newNote.trim()) return;
    setSaving(true);
    setErrorMsg("");
    try {
      await api.post(`/teacher/student-notes/${studentId}`, { note: newNote.trim() });
      setNewNote("");
      loadNotes();
    } catch (err) {
      setErrorMsg(err.response?.data?.message || "Could not save the note.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (noteId) => {
    try {
      await api.delete(`/teacher/student-notes/${noteId}`);
      setNotes((prev) => prev.filter((n) => n._id !== noteId));
    } catch (err) {
      setErrorMsg(err.response?.data?.message || "Could not delete the note.");
    }
  };

  return (
    <div className="bg-[#111827] border border-gray-800 rounded-2xl overflow-hidden shadow-lg">
      <div className="px-4 sm:px-6 py-4 border-b border-gray-800 bg-[#1F2937]/30">
        <h3 className="font-semibold text-base sm:text-lg">Private Notes</h3>
        <p className="text-xs text-gray-500 mt-1">Only visible to teachers of this batch — students never see this</p>
      </div>
      <div className="p-4 space-y-3">
        <div className="flex gap-2">
          <input
            value={newNote}
            onChange={(e) => setNewNote(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleAdd()}
            placeholder="e.g. Spoke with parent, follow up next week"
            className="flex-1 px-3 py-2 text-sm bg-[#0A0D14] border border-gray-700 focus:border-[#7C3AED] rounded-lg outline-none text-white placeholder-gray-600"
          />
          <button onClick={handleAdd} disabled={saving || !newNote.trim()} className="px-4 py-2 rounded-lg bg-[#7C3AED] hover:bg-[#6D28D9] text-sm font-medium disabled:opacity-50 flex-shrink-0">
            {saving ? "..." : "Add"}
          </button>
        </div>
        {errorMsg && <p className="text-xs text-red-400">{errorMsg}</p>}

        {loading ? (
          <SkeletonBlock className="w-full h-10 rounded-lg" />
        ) : notes.length === 0 ? (
          <p className="text-xs text-gray-500 text-center py-3">No notes yet.</p>
        ) : (
          <div className="space-y-2">
            {notes.map((n) => (
              <div key={n._id} className="bg-[#1F2937] border border-gray-800 rounded-lg p-3 flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm text-gray-200">{n.note}</p>
                  <p className="text-[10px] text-gray-500 mt-1">{n.teacherName} &middot; {new Date(n.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}</p>
                </div>
                <button onClick={() => handleDelete(n._id)} className="text-gray-600 hover:text-red-400 text-xs flex-shrink-0">✕</button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

const TrendBadge = ({ trend }) => {
  if (!trend) return null;
  const map = {
    improving: { label: "Improving", color: "text-green-400 bg-green-500/10 border-green-500/30", arrow: "↑" },
    declining: { label: "Declining", color: "text-red-400 bg-red-500/10 border-red-500/30", arrow: "↓" },
    same: { label: "Steady", color: "text-gray-400 bg-gray-500/10 border-gray-500/30", arrow: "→" },
  };
  const t = map[trend.direction];
  if (!t) return null;
  return (
    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full border text-xs font-medium ${t.color}`}>
      <span>{t.arrow}</span>{t.label}
    </span>
  );
};

const TeacherStudentAnalysis = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { studentId, studentName: passedName, examName } = location.state || {};

  const [phase, setPhase] = useState("loading");
  const [data, setData] = useState(null);
  const [studentName, setStudentName] = useState(passedName || "");
  const [errorMsg, setErrorMsg] = useState("");

  const [drillDown, setDrillDown] = useState(null);

  const load = useCallback(async () => {
    if (!studentId || !examName) {
      navigate("/TeacherStudentSearch");
      return;
    }
    setPhase("loading");
    try {
      const res = await api.get(`/teacher/analysis/overview/${studentId}/${encodeURIComponent(examName)}`);
      setData(res.data.data);
      if (res.data.studentName) setStudentName(res.data.studentName);
      setPhase("loaded");
    } catch (err) {
      setErrorMsg(err.response?.data?.message || "Could not load this student's analysis.");
      setPhase("error");
    }
  }, [studentId, examName, navigate]);

  useEffect(() => { load(); }, [load]);

  const openMock = (performanceId) => setDrillDown({ type: "mock", apiPath: `/teacher/analysis/mock-detail/${studentId}/${performanceId}` });
  const openPyq = (attemptId) => setDrillDown({ type: "pyq", apiPath: `/teacher/analysis/pyq-detail/${studentId}/${attemptId}` });
  const openCustom = (attemptId) => setDrillDown({ type: "custom", apiPath: `/teacher/analysis/custom-test-detail/${studentId}/${attemptId}` });
  const closeDrillDown = () => setDrillDown(null);

  const sortedMockHistory = useMemo(() => (data?.graphData ? [...data.graphData].reverse() : []), [data]);

  if (phase === "loading") return <PageSkeleton />;

  if (phase === "error") {
    return (
      <div className="min-h-screen bg-[#0A0D14] text-white flex items-center justify-center px-6 pb-24">
        <div className="max-w-md text-center space-y-4">
          <p className="text-gray-300">{errorMsg}</p>
          <button onClick={() => navigate("/TeacherStudentSearch")} className="px-5 py-2 rounded-lg bg-[#7C3AED] hover:bg-[#6D28D9] text-sm font-medium">Back to Search</button>
        </div>
        <TeacherBottomNav />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0A0D14] text-white px-4 sm:px-6 py-8 pb-24">
      <div className="max-w-2xl mx-auto space-y-6">
        {drillDown ? (
          <AttemptDetailScreen apiPath={drillDown.apiPath} onBack={closeDrillDown} />
        ) : (
          <>
            <button onClick={() => navigate("/TeacherStudentSearch")} className="text-sm text-gray-400 hover:text-white flex items-center gap-1">&larr; Back to Search</button>

            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div>
                <h1 className="text-2xl font-bold mb-1">{studentName}</h1>
                <p className="text-gray-400 text-sm">{examName}</p>
              </div>
              <div className="flex items-center gap-2">
                <TrendBadge trend={data?.trend} />
                <button
                  onClick={() => navigate("/TeacherStudentReportPrint", { state: { studentId, studentName, examName } })}
                  className="px-3 py-1.5 rounded-lg border border-gray-700 text-xs font-medium text-gray-300 hover:border-gray-500 flex items-center gap-1.5"
                >
                  🖨️ Print Report
                </button>
              </div>
            </div>

            {!data?.mockDataAvailable ? (
              <div className="bg-[#111827] border border-gray-800 rounded-2xl p-6 text-center">
                <p className="text-sm text-gray-400">This student hasn't taken any Mock Test yet.</p>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="bg-[#111827] border border-gray-800 rounded-2xl p-4">
                    <p className="text-xs text-gray-500 mb-1">Lifetime Avg</p>
                    <p className="text-xl font-bold text-[#A78BFA]">
                      {data.lifetimeAverageScoreOutOf ? `${data.lifetimeAverageScore}/${data.lifetimeAverageScoreOutOf}` : data.lifetimeAverageScore}
                    </p>
                  </div>
                  <div className="bg-[#111827] border border-gray-800 rounded-2xl p-4">
                    <p className="text-xs text-gray-500 mb-1">Total Mocks</p>
                    <p className="text-xl font-bold text-white">{data.totalTestsGiven}</p>
                  </div>
                  <div className="bg-[#111827] border border-gray-800 rounded-2xl p-4">
                    <p className="text-xs text-gray-500 mb-1">Total Wrong</p>
                    <p className="text-xl font-bold text-red-400">{data.totalWrongLifetime}</p>
                  </div>
                  <div className="bg-[#111827] border border-gray-800 rounded-2xl p-4">
                    <p className="text-xs text-gray-500 mb-1">Negative Marking Lost</p>
                    <p className="text-xl font-bold text-orange-400">-{data.marksLostToNegativeLifetime}</p>
                  </div>
                </div>

                {sortedMockHistory.length >= 2 && (
                  <div className="bg-[#111827] border border-gray-800 rounded-2xl overflow-hidden">
                    <div className="px-4 py-3 border-b border-gray-800"><h3 className="font-semibold text-sm">Score Trend</h3></div>
                    <div className="px-2 py-4">
                      <ResponsiveContainer width="100%" height={180}>
                        <LineChart data={[...sortedMockHistory].reverse().map((g) => ({ ...g, label: new Date(g.date).toLocaleDateString("en-IN", { day: "numeric", month: "short" }) }))}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#1F2937" />
                          <XAxis dataKey="label" tick={{ fill: "#6B7280", fontSize: 11 }} />
                          <YAxis tick={{ fill: "#6B7280", fontSize: 11 }} />
                          <Tooltip contentStyle={{ background: "#0A0D14", border: "1px solid #1F2937", borderRadius: 8, fontSize: 12 }} />
                          <Line type="monotone" dataKey="score" stroke="#7C3AED" strokeWidth={2} dot={{ r: 3, fill: "#7C3AED" }} />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                )}

                {data.topWeakTopics?.length > 0 && (
                  <div className="bg-[#111827] border border-gray-800 rounded-2xl overflow-hidden">
                    <div className="px-4 py-3 border-b border-gray-800 bg-red-900/10"><h3 className="font-semibold text-sm text-red-400">Biggest Weak Areas</h3></div>
                    <div className="divide-y divide-gray-800">
                      {data.topWeakTopics.map((t, i) => (
                        <div key={i} className="px-4 py-3 flex items-center justify-between gap-3">
                          <div className="min-w-0">
                            <p className="text-sm text-gray-200 truncate">{t.topicName}</p>
                            <p className="text-[11px] text-gray-500">{t.subjectName}</p>
                          </div>
                          <span className="text-xs px-2 py-0.5 rounded-full bg-red-500/10 text-red-400 flex-shrink-0">{t.wrongCount} wrong</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {sortedMockHistory.length > 0 && (
                  <div className="bg-[#111827] border border-gray-800 rounded-2xl overflow-hidden">
                    <div className="px-4 py-3 border-b border-gray-800"><h3 className="font-semibold text-sm">Mock Test History</h3></div>
                    <div className="divide-y divide-gray-800 max-h-64 overflow-y-auto">
                      {sortedMockHistory.map((g) => (
                        <HistoryRow
                          key={g.performanceId}
                          title={g.blueprintName}
                          subtitle={new Date(g.date).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                          score={g.score}
                          onClick={() => openMock(g.performanceId)}
                        />
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}

            {data?.pyqHistory?.length > 0 && (
              <div className="bg-[#111827] border border-gray-800 rounded-2xl overflow-hidden">
                <div className="px-4 py-3 border-b border-gray-800"><h3 className="font-semibold text-sm">Previous Year Paper History</h3></div>
                <div className="divide-y divide-gray-800 max-h-64 overflow-y-auto">
                  {data.pyqHistory.map((a) => (
                    <HistoryRow
                      key={a.attemptId}
                      title={a.testName}
                      subtitle={new Date(a.date).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                      score={a.score}
                      onClick={() => openPyq(a.attemptId)}
                    />
                  ))}
                </div>
              </div>
            )}

            {data?.customTestHistory?.length > 0 && (
              <div className="bg-[#111827] border border-gray-800 rounded-2xl overflow-hidden">
                <div className="px-4 py-3 border-b border-gray-800"><h3 className="font-semibold text-sm">Custom Test History</h3></div>
                <div className="divide-y divide-gray-800 max-h-64 overflow-y-auto">
                  {data.customTestHistory.map((a) => (
                    <HistoryRow
                      key={a.attemptId}
                      title={a.testName}
                      subtitle={new Date(a.date).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                      score={a.score}
                      onClick={() => openCustom(a.attemptId)}
                    />
                  ))}
                </div>
              </div>
            )}

            <NotesSection studentId={studentId} />
          </>
        )}
      </div>
      <TeacherBottomNav />
    </div>
  );
};

export default TeacherStudentAnalysis;
