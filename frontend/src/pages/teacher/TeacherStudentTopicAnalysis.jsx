import React, { useState, useEffect, useMemo } from "react";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import api from "../../api/api";
import TeacherBottomNav from "../../components/TeacherBottomNav";

const SkeletonBlock = ({ className = "" }) => <div className={`bg-gray-800/70 rounded animate-pulse ${className}`} />;

const STATUS_FILTERS = [
  { key: "all", label: "All" },
  { key: "correct", label: "Correct" },
  { key: "wrong", label: "Wrong" },
  { key: "unattempted", label: "Unattempted" },
];

const TeacherStudentTopicAnalysis = () => {
  const navigate = useNavigate();
  const { studentId } = useParams();
  const location = useLocation();
  const { examName, studentName, subjectName, topicName } = location.state || {};

  const [statusFilter, setStatusFilter] = useState("all");
  const [index, setIndex] = useState(0);

  // 👇 FIX: navigate render ke beech mein nahi, useEffect ke andar
  useEffect(() => {
    if (!examName || !subjectName || !topicName) {
      navigate("/TeacherStudentSearch");
    }
  }, [examName, subjectName, topicName, navigate]);

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["teacher-student-topic", studentId, examName, subjectName, topicName],
    queryFn: async () => {
      const res = await api.get(
        `/teacher/analysis/topic/${studentId}/${encodeURIComponent(examName)}/${encodeURIComponent(subjectName)}/${encodeURIComponent(topicName)}`
      );
      return res.data;
    },
    enabled: !!studentId && !!examName && !!subjectName && !!topicName,
  });

  const topic = data?.data;

  const combinedQuestions = useMemo(() => {
    if (!topic) return [];
    const good = (topic.goodAt || []).map((q) => ({ ...q, isCorrect: true }));
    const wrong = (topic.wrong || []).map((q) => ({ ...q, isCorrect: false }));
    const unattempted = (topic.unattempted || []).map((q) => ({ ...q, isCorrect: null }));
    return [...good, ...wrong, ...unattempted];
  }, [topic]);

  const filteredQuestions = useMemo(() => {
    return combinedQuestions.filter((q) => {
      if (statusFilter === "correct") return q.isCorrect === true;
      if (statusFilter === "wrong") return q.isCorrect === false;
      if (statusFilter === "unattempted") return q.isCorrect === null;
      return true;
    });
  }, [combinedQuestions, statusFilter]);

  const currentQ = filteredQuestions[index];

  if (!examName || !subjectName || !topicName) {
    return null;
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#0A0D14] text-white px-4 sm:px-6 py-8 pb-24">
        <div className="max-w-2xl mx-auto space-y-4">
          <SkeletonBlock className="w-40 h-6" />
          <SkeletonBlock className="w-full h-64 rounded-2xl" />
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="min-h-screen bg-[#0A0D14] text-white flex items-center justify-center px-6 pb-24">
        <div className="max-w-md text-center space-y-4">
          <p className="text-gray-300">{error?.response?.data?.message || "Data load nahi ho paaya."}</p>
          <button onClick={() => navigate(-1)} className="px-5 py-2 rounded-lg bg-[#7C3AED] hover:bg-[#6D28D9] text-sm font-medium">
            Wapas Jaayein
          </button>
        </div>
        <TeacherBottomNav />
      </div>
    );
  }

  const counts = {
    all: combinedQuestions.length,
    correct: topic?.summary?.totalCorrect ?? 0,
    wrong: topic?.summary?.totalWrong ?? 0,
    unattempted: topic?.summary?.totalUnattempted ?? 0,
  };

  return (
    <div className="min-h-screen bg-[#0A0D14] text-white px-4 sm:px-6 py-8 pb-24">
      <div className="max-w-2xl mx-auto space-y-6">
        <button onClick={() => navigate(-1)} className="text-sm text-gray-400 hover:text-white flex items-center gap-1">
          &larr; {subjectName} Par Wapas
        </button>

        <div>
          <h1 className="text-2xl font-bold text-[#A78BFA] mb-1">{topicName}</h1>
          <p className="text-gray-400 text-sm">{studentName} &middot; {subjectName}</p>
        </div>

        {!topic ? (
          <div className="bg-[#111827] border border-gray-800 rounded-2xl p-6 text-center">
            <p className="text-sm text-gray-400">Is topic ka data nahi mila.</p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
              <div className="bg-[#111827] border border-gray-800 rounded-xl p-3">
                <p className="text-[10px] text-gray-500 mb-1">Efficiency</p>
                <p className="text-lg font-bold text-[#A78BFA]">{topic.summary?.efficiency}%</p>
              </div>
              <div className="bg-[#111827] border border-gray-800 rounded-xl p-3">
                <p className="text-[10px] text-gray-500 mb-1">Attempted</p>
                <p className="text-lg font-bold text-white">{topic.summary?.totalAttempted}</p>
              </div>
              <div className="bg-[#111827] border border-gray-800 rounded-xl p-3">
                <p className="text-[10px] text-gray-500 mb-1">Correct</p>
                <p className="text-lg font-bold text-green-400">{topic.summary?.totalCorrect}</p>
              </div>
              <div className="bg-[#111827] border border-gray-800 rounded-xl p-3">
                <p className="text-[10px] text-gray-500 mb-1">Wrong</p>
                <p className="text-lg font-bold text-red-400">{topic.summary?.totalWrong}</p>
              </div>
              <div className="bg-[#111827] border border-gray-800 rounded-xl p-3 col-span-2 sm:col-span-1">
                <p className="text-[10px] text-gray-500 mb-1">Unattempted</p>
                <p className="text-lg font-bold text-gray-300">{topic.summary?.totalUnattempted}</p>
              </div>
            </div>

            <div className="flex gap-2 overflow-x-auto pb-1">
              {STATUS_FILTERS.map((f) => (
                <button
                  key={f.key}
                  onClick={() => { setStatusFilter(f.key); setIndex(0); }}
                  className={`px-3.5 py-1.5 rounded-full text-xs whitespace-nowrap flex-shrink-0 ${
                    statusFilter === f.key ? "bg-[#7C3AED] text-white" : "bg-[#111827] border border-gray-800 text-gray-400"
                  }`}
                >
                  {f.label} ({counts[f.key]})
                </button>
              ))}
            </div>

            {filteredQuestions.length === 0 && (
              <p className="text-gray-400 text-sm py-8 text-center">Is category mein koi sawaal nahi hai.</p>
            )}

            {currentQ && (
              <>
                <p className="text-xs text-gray-500">Question {index + 1} of {filteredQuestions.length}</p>
                <QuestionCard q={currentQ} />
                <div className="flex items-center gap-3">
                  <button onClick={() => setIndex((i) => Math.max(0, i - 1))} disabled={index === 0} className="flex-1 sm:flex-none px-4 py-2.5 rounded-lg border border-gray-700 text-sm text-gray-300 disabled:opacity-40">
                    &larr; Previous
                  </button>
                  <button onClick={() => setIndex((i) => Math.min(filteredQuestions.length - 1, i + 1))} disabled={index >= filteredQuestions.length - 1} className="flex-1 sm:flex-none sm:ml-auto px-4 py-2.5 rounded-lg bg-[#7C3AED] hover:bg-[#6D28D9] text-sm font-medium disabled:opacity-40">
                    Next &rarr;
                  </button>
                </div>
              </>
            )}
          </>
        )}
      </div>
      <TeacherBottomNav />
    </div>
  );
};

const QuestionCard = ({ q }) => {
  const statusLabel = q.isCorrect === true ? "Correct" : q.isCorrect === false ? "Wrong" : "Unattempted";
  const statusColor = q.isCorrect === true ? "text-green-400 bg-green-500/10 border-green-500/30" : q.isCorrect === false ? "text-red-400 bg-red-500/10 border-red-500/30" : "text-gray-400 bg-gray-500/10 border-gray-500/30";

  return (
    <div className="bg-[#111827] border border-gray-800 rounded-xl p-4 sm:p-6">
      <div className="flex items-center justify-between mb-4 gap-2">
        <span className={`text-xs px-2.5 py-1 rounded-full border font-medium ${statusColor}`}>{statusLabel}</span>
        <span className="text-[10px] text-gray-500 font-mono">Time: {q.timeTakenInSeconds ?? "—"}s</span>
      </div>
      <p className="text-sm sm:text-base text-gray-200 mb-5 leading-relaxed">{q.question}</p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 mb-5">
        {[1, 2, 3, 4].map((n) => {
          const isCorrect = q.correctOption === n;
          const isUser = q.userAnswer === String(n);
          let style = "bg-[#1F2937] border-gray-700 text-gray-400";
          if (isCorrect) style = "bg-green-500/10 border-green-500/30 text-green-400 font-semibold";
          else if (isUser) style = "bg-red-500/10 border-red-500/30 text-red-400 font-semibold";
          return (
            <div key={n} className={`p-2.5 rounded-lg border text-xs flex items-start gap-2.5 ${style}`}>
              <span>{n}.</span>
              <span className="flex-1">{q.options?.[`option${n}`]}</span>
              {isCorrect && <span>✅</span>}
              {isUser && !isCorrect && <span className="text-[10px] mt-0.5">(Student) ❌</span>}
            </div>
          );
        })}
      </div>
      {q.answerExplain && (
        <div className="bg-[#1F2937]/50 border border-gray-700/50 rounded-lg p-3">
          <p className="text-[10px] font-semibold tracking-wider text-purple-400 uppercase mb-1.5">Explanation</p>
          <p className="text-xs text-gray-300 leading-relaxed">{q.answerExplain}</p>
        </div>
      )}
    </div>
  );
};

export default TeacherStudentTopicAnalysis;