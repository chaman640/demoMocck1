import React, { useState, useEffect, useMemo } from "react";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import api from "../../api/api";
import TeacherBottomNav from "../../components/TeacherBottomNav";

const SkeletonBlock = ({ className = "" }) => (
  <div className={`bg-gray-800/70 rounded animate-pulse ${className}`} />
);

const PageSkeleton = () => (
  <div className="min-h-screen bg-[#0A0D14] text-white px-4 sm:px-6 py-8 pb-24">
    <div className="max-w-2xl mx-auto space-y-4">
      <SkeletonBlock className="w-32 h-4" />
      <SkeletonBlock className="w-52 h-7" />
      <SkeletonBlock className="w-full h-24 rounded-2xl" />
      <SkeletonBlock className="w-full h-40 rounded-2xl" />
    </div>
  </div>
);

const STATUS_FILTERS = [
  { key: "all", label: "All" },
  { key: "correct", label: "Correct" },
  { key: "wrong", label: "Wrong" },
  { key: "unattempted", label: "Unattempted" },
];

const TeacherStudentAnalysis = () => {
  const navigate = useNavigate();
  const { studentId } = useParams();
  const location = useLocation();
  const examName = location.state?.examName;
  const studentNameFromState = location.state?.studentName;

  const [viewingMockId, setViewingMockId] = useState(null);

  // 👇 FIX: navigate render ke beech mein nahi, useEffect ke andar
  useEffect(() => {
    if (!examName) {
      navigate("/TeacherStudentSearch");
    }
  }, [examName, navigate]);

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["teacher-student-overview", studentId, examName],
    queryFn: async () => {
      const res = await api.get(`/teacher/analysis/overview/${studentId}/${encodeURIComponent(examName)}`);
      return res.data;
    },
    enabled: !!studentId && !!examName,
  });

  if (!examName) {
    return null;
  }

  if (isLoading) return <PageSkeleton />;

  if (isError) {
    return (
      <div className="min-h-screen bg-[#0A0D14] text-white flex items-center justify-center px-6 pb-24">
        <div className="max-w-md text-center space-y-4">
          <p className="text-gray-300">{error?.response?.data?.message || "Data load nahi ho paaya."}</p>
          <button onClick={() => navigate("/TeacherStudentSearch")} className="px-5 py-2 rounded-lg bg-[#7C3AED] hover:bg-[#6D28D9] text-sm font-medium">
            Search Par Wapas
          </button>
        </div>
        <TeacherBottomNav />
      </div>
    );
  }

  const studentName = data.studentName || studentNameFromState;
  const overview = data.data;

  if (viewingMockId) {
    return (
      <MockDetailScreen
        studentId={studentId}
        performanceId={viewingMockId}
        onBack={() => setViewingMockId(null)}
      />
    );
  }

  if (!overview) {
    return (
      <div className="min-h-screen bg-[#0A0D14] text-white flex flex-col items-center justify-center px-4 pb-24">
        <div className="bg-[#111827] border border-gray-800 p-6 rounded-2xl max-w-md w-full text-center">
          <h2 className="text-lg font-bold mb-2">Koi Data Nahi</h2>
          <p className="text-gray-400 text-sm mb-4">{studentName} ne abhi tak {examName} ka koi mock nahi diya.</p>
          <button onClick={() => navigate("/TeacherStudentSearch")} className="px-5 py-2 rounded-lg bg-[#7C3AED] hover:bg-[#6D28D9] text-sm font-medium">
            Search Par Wapas
          </button>
        </div>
        <TeacherBottomNav />
      </div>
    );
  }

  const sortedHistory = [...overview.graphData].reverse();

  return (
    <div className="min-h-screen bg-[#0A0D14] text-white px-4 sm:px-6 py-8 pb-24">
      <div className="max-w-2xl mx-auto space-y-6">
        <button onClick={() => navigate("/TeacherStudentSearch")} className="text-sm text-gray-400 hover:text-white flex items-center gap-1">
          &larr; Search Par Wapas
        </button>

        <div>
          <h1 className="text-2xl font-bold mb-1">{studentName}</h1>
          <p className="text-gray-400 text-sm">{examName} ka performance</p>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="bg-[#111827] border border-gray-800 rounded-2xl p-4">
            <p className="text-xs text-gray-500 mb-1">Average Score (Last 3)</p>
            <p className="text-2xl font-bold text-[#A78BFA]">
              {overview.averageScoreOutOf ? `${overview.averageScore}/${overview.averageScoreOutOf}` : overview.averageScore}
            </p>
          </div>
          <div className="bg-[#111827] border border-gray-800 rounded-2xl p-4">
            <p className="text-xs text-gray-500 mb-1">Total Mocks</p>
            <p className="text-2xl font-bold text-white">{overview.totalTestsGiven}</p>
          </div>
        </div>

        {overview.subjectAnalysis?.length > 0 && (
          <div className="bg-[#111827] border border-gray-800 rounded-2xl overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-800">
              <h3 className="font-semibold text-sm">Subject Analysis</h3>
            </div>
            <div className="divide-y divide-gray-800">
              {overview.subjectAnalysis.map((s, i) => (
                <button
                  key={i}
                  onClick={() => navigate(`/TeacherStudentSubjectAnalysis/${studentId}`, { state: { examName, studentName, subjectName: s.subjectName } })}
                  className="w-full flex items-center justify-between px-4 py-3 hover:bg-[#1F2937]/50 transition-colors text-left"
                >
                  <span className="text-sm text-gray-200">{s.subjectName}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-xs px-2 py-0.5 rounded bg-green-500/10 text-green-400">{s.averageAccuracy}%</span>
                    <span className="text-[#A78BFA] text-xs">→</span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="bg-[#111827] border border-gray-800 rounded-2xl overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-800">
            <h3 className="font-semibold text-sm">Test History</h3>
          </div>
          <div className="divide-y divide-gray-800">
            {sortedHistory.map((g) => (
              <button
                key={g.performanceId}
                onClick={() => setViewingMockId(g.performanceId)}
                className="w-full flex items-center justify-between px-4 py-3 hover:bg-[#1F2937]/50 transition-colors text-left"
              >
                <div className="min-w-0">
                  <p className="text-sm text-gray-200 truncate">{g.blueprintName || "—"}</p>
                  <p className="text-[11px] text-gray-500">
                    {new Date(g.date).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                  </p>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <span className="text-sm font-bold">{g.score}</span>
                  <span className="text-[#A78BFA] text-xs">→</span>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
      <TeacherBottomNav />
    </div>
  );
};

const MockDetailScreen = ({ studentId, performanceId, onBack }) => {
  const [subjectFilter, setSubjectFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState(null);
  const [index, setIndex] = useState(0);

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["teacher-student-mock-detail", studentId, performanceId],
    queryFn: async () => {
      const res = await api.get(`/teacher/analysis/mock-detail/${studentId}/${performanceId}`);
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

  const openReview = (filter) => { setStatusFilter(filter); setIndex(0); };
  const closeReview = () => setStatusFilter(null);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#0A0D14] text-white flex items-center justify-center pb-24">
        <div className="w-10 h-10 border-4 border-gray-700 border-t-[#8B5CF6] rounded-full animate-spin" />
        <TeacherBottomNav />
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="min-h-screen bg-[#0A0D14] text-white flex items-center justify-center px-6 pb-24">
        <div className="max-w-md text-center space-y-4">
          <p className="text-gray-300">{error?.response?.data?.message || "Data load nahi ho paaya."}</p>
          <button onClick={onBack} className="px-5 py-2 rounded-lg bg-[#7C3AED] hover:bg-[#6D28D9] text-sm font-medium">
            Wapas Jaayein
          </button>
        </div>
        <TeacherBottomNav />
      </div>
    );
  }

  const { overview } = data;

  if (statusFilter) {
    return (
      <div className="min-h-screen bg-[#0A0D14] text-white px-4 sm:px-6 py-8 pb-24">
        <div className="max-w-2xl mx-auto">
          <button onClick={closeReview} className="text-sm text-gray-400 hover:text-white mb-5 flex items-center gap-1">
            &larr; Result par wapas jaayein
          </button>

          {subjects.length > 1 && (
            <div className="flex gap-2 mb-4 overflow-x-auto pb-1">
              <button onClick={() => { setSubjectFilter("all"); setIndex(0); }} className={`px-4 py-1.5 rounded-full text-sm whitespace-nowrap flex-shrink-0 ${subjectFilter === "all" ? "bg-[#7C3AED] text-white" : "bg-[#111827] border border-gray-800 text-gray-400"}`}>
                Sabhi Subjects
              </button>
              {subjects.map((s) => (
                <button key={s} onClick={() => { setSubjectFilter(s); setIndex(0); }} className={`px-4 py-1.5 rounded-full text-sm whitespace-nowrap flex-shrink-0 ${subjectFilter === s ? "bg-[#7C3AED] text-white" : "bg-[#111827] border border-gray-800 text-gray-400"}`}>
                  {s}
                </button>
              ))}
            </div>
          )}

          <div className="flex gap-2 mb-6 overflow-x-auto pb-1">
            {STATUS_FILTERS.map((f) => (
              <button key={f.key} onClick={() => { setStatusFilter(f.key); setIndex(0); }} className={`px-4 py-1.5 rounded-full text-sm whitespace-nowrap flex-shrink-0 ${statusFilter === f.key ? "bg-[#7C3AED] text-white" : "bg-[#111827] border border-gray-800 text-gray-400"}`}>
                {f.label}
              </button>
            ))}
          </div>

          {filteredQuestions.length === 0 && <p className="text-gray-400 text-sm py-10 text-center">Is category mein koi sawaal nahi hai.</p>}

          {currentQ && (
            <>
              <p className="text-xs text-gray-500 mb-3">Question {index + 1} of {filteredQuestions.length} &middot; {currentQ.subjectName}</p>
              <QuestionDetailCard q={currentQ} />
              <div className="flex justify-between items-center mt-6">
                <button onClick={() => setIndex((i) => Math.max(0, i - 1))} disabled={index === 0} className="px-4 py-2 rounded-lg border border-gray-700 text-sm text-gray-300 disabled:opacity-40">
                  &larr; Previous
                </button>
                <button onClick={() => setIndex((i) => Math.min(filteredQuestions.length - 1, i + 1))} disabled={index >= filteredQuestions.length - 1} className="px-4 py-2 rounded-lg bg-[#7C3AED] hover:bg-[#6D28D9] text-sm font-medium disabled:opacity-40">
                  Next &rarr;
                </button>
              </div>
            </>
          )}
        </div>
        <TeacherBottomNav />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0A0D14] text-white px-4 sm:px-6 py-8 pb-24">
      <div className="max-w-2xl mx-auto">
        <button onClick={onBack} className="text-sm text-gray-400 hover:text-white mb-5 flex items-center gap-1">
          &larr; Test History Par Wapas
        </button>

        <h1 className="text-xl font-bold mb-1">{overview.blueprintName}</h1>
        <p className="text-gray-400 text-sm mb-6">{overview.examName}</p>

        <div className="bg-[#111827] border border-gray-800 rounded-2xl p-6 text-center mb-6">
          <p className="text-4xl font-bold text-[#A78BFA]">{overview.totalScore}</p>
          <p className="text-sm text-gray-500 mt-1">Total Score &middot; {overview.accuracy}% Accuracy</p>
        </div>

        <div className="grid grid-cols-3 gap-3 mb-6">
          <button onClick={() => openReview("correct")} className="bg-[#1F2937] border border-gray-800 hover:border-green-500/50 rounded-xl p-3 text-center">
            <p className="text-lg font-bold text-green-400">{overview.correct}</p>
            <p className="text-[11px] text-gray-500">Correct</p>
          </button>
          <button onClick={() => openReview("wrong")} className="bg-[#1F2937] border border-gray-800 hover:border-red-500/50 rounded-xl p-3 text-center">
            <p className="text-lg font-bold text-red-400">{overview.wrong}</p>
            <p className="text-[11px] text-gray-500">Wrong</p>
          </button>
          <button onClick={() => openReview("unattempted")} className="bg-[#1F2937] border border-gray-800 hover:border-gray-500/50 rounded-xl p-3 text-center">
            <p className="text-lg font-bold text-gray-300">{overview.unattempted}</p>
            <p className="text-[11px] text-gray-500">Unattempted</p>
          </button>
        </div>

        <button onClick={() => openReview("all")} className="w-full py-3 rounded-lg bg-[#7C3AED] hover:bg-[#6D28D9] text-sm font-medium">
          Sabhi Sawaal Dekhein
        </button>
      </div>
      <TeacherBottomNav />
    </div>
  );
};

const QuestionDetailCard = ({ q }) => {
  const statusLabel = q.isCorrect === true ? "Correct" : q.isCorrect === false ? "Wrong" : "Unattempted";
  const statusColor = q.isCorrect === true ? "text-green-400 bg-green-500/10 border-green-500/30" : q.isCorrect === false ? "text-red-400 bg-red-500/10 border-red-500/30" : "text-gray-400 bg-gray-500/10 border-gray-500/30";

  return (
    <div className="bg-[#111827] border border-gray-800 rounded-2xl p-6">
      <div className="flex items-center justify-between mb-4 gap-3">
        <span className="text-xs text-gray-500">{q.topicName}</span>
        <span className={`text-xs px-2.5 py-1 rounded-full border font-medium ${statusColor}`}>{statusLabel}</span>
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
              <span className="w-6 h-6 flex-shrink-0 rounded-full border border-current flex items-center justify-center text-xs">{n}</span>
              <span className="flex-1">{optText}</span>
              {isCorrectOpt && <span className="text-xs flex-shrink-0">✅ Sahi</span>}
              {isUserPick && !isCorrectOpt && <span className="text-xs flex-shrink-0">❌ Student ka jawab</span>}
            </div>
          );
        })}
      </div>
      {q.answerExplain && (
        <div className="bg-[#1F2937]/50 border border-gray-700/50 rounded-lg p-4">
          <p className="text-xs font-semibold tracking-wider text-purple-400 uppercase mb-2">Explanation</p>
          <p className="text-sm text-gray-300 leading-relaxed">{q.answerExplain}</p>
        </div>
      )}
    </div>
  );
};

export default TeacherStudentAnalysis;