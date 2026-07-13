import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api/api";

// ──────────────────────────────────────────────
// Skeleton building blocks — pehle se established pattern
// ──────────────────────────────────────────────
const SkeletonBlock = ({ className = "" }) => (
  <div className={`bg-gray-800/70 rounded animate-pulse ${className}`} />
);

const PillsSkeleton = () => (
  <div className="min-h-screen bg-[#0A0D14] text-white px-6 py-12">
    <div className="max-w-2xl mx-auto">
      <SkeletonBlock className="w-56 h-7 mb-2" />
      <SkeletonBlock className="w-72 h-4 mb-8" />
      <div className="flex flex-wrap gap-3">
        {[1, 2, 3, 4].map((i) => (
          <SkeletonBlock key={i} className="w-32 h-11 rounded-xl" />
        ))}
      </div>
    </div>
  </div>
);

const QuestionBrowseSkeleton = () => (
  <div className="min-h-screen bg-[#0A0D14] text-white px-4 sm:px-6 py-8">
    <div className="max-w-3xl mx-auto">
      <SkeletonBlock className="w-32 h-4 mb-6" />
      <SkeletonBlock className="w-44 h-3 mb-3" />
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
      <div className="flex justify-between items-center mt-6">
        <SkeletonBlock className="w-28 h-10 rounded-lg" />
        <SkeletonBlock className="w-24 h-10 rounded-lg" />
      </div>
    </div>
  </div>
);

// ── Ek question ka detail card — correct option green mein highlight ──
// (userAnswer/wrong ka concept nahi hai yahan — sirf raw review hai)
const QuestionCard = ({ q, index, total }) => (
  <div className="bg-[#111827] border border-gray-800 rounded-2xl p-6">
    <div className="flex items-center justify-between mb-4 gap-3">
      <span className="text-xs text-gray-500">
        {q.topicName} {q.questionNumber != null && <>&middot; #{q.questionNumber}</>}
      </span>
      <span className="text-xs px-2.5 py-1 rounded-full border border-gray-700 text-gray-400 font-medium">
        {index + 1} / {total}
      </span>
    </div>

    <p className="text-base sm:text-lg mb-6 leading-relaxed">{q.question}</p>

    <div className="space-y-2.5 mb-6">
      {[1, 2, 3, 4].map((n) => {
        const optText = q[`option${n}`];
        const isCorrectOpt = q.correctOption === n;
        const style = isCorrectOpt
          ? "border-green-500/40 bg-green-500/10 text-green-300"
          : "border-gray-800 bg-[#1F2937] text-gray-300";

        return (
          <div key={n} className={`px-4 py-3 rounded-xl border flex items-center gap-3 ${style}`}>
            <span className="w-6 h-6 flex-shrink-0 rounded-full border border-current flex items-center justify-center text-xs">
              {n}
            </span>
            <span className="flex-1">{optText}</span>
            {isCorrectOpt && <span className="text-xs flex-shrink-0">✅ Sahi jawab</span>}
          </div>
        );
      })}
    </div>

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

const QuestionBankReview = () => {
  const navigate = useNavigate();

  // loading-exams | pick-exam | loading-meta | pick-subject | pick-topic |
  // loading-questions | browsing | error | forbidden
  const [phase, setPhase] = useState("loading-exams");
  const [errorMsg, setErrorMsg] = useState("");

  const [examList, setExamList] = useState([]);
  const [selectedExam, setSelectedExam] = useState(null);

  const [subjectsMeta, setSubjectsMeta] = useState([]);
  const [selectedSubject, setSelectedSubject] = useState(null);

  const [questions, setQuestions] = useState([]);
  const [index, setIndex] = useState(0);
  const [breadcrumb, setBreadcrumb] = useState({ exam: "", subject: "", topic: "" });

  const handleApiError = (err) => {
    if (err.response?.status === 403) {
      setPhase("forbidden");
      return;
    }
    setErrorMsg(err.response?.data?.message || err.message || "Kuch galat ho gaya.");
    setPhase("error");
  };

  // ── Step 1: Exam list load karo ──
  useEffect(() => {
    let cancelled = false;
    const loadExams = async () => {
      setPhase("loading-exams");
      try {
        const res = await api.get("/allExamName");
        if (cancelled) return;
        setExamList(res.data.data || []);
        setPhase("pick-exam");
      } catch (err) {
        if (!cancelled) handleApiError(err);
      }
    };
    loadExams();
    return () => { cancelled = true; };
  }, []);

  // ── Step 2: Exam select karne pe subject/topic meta lao ──
  const pickExam = async (exam) => {
    setSelectedExam(exam);
    setPhase("loading-meta");
    try {
      const res = await api.get(`/questions/meta/${encodeURIComponent(exam)}`);
      setSubjectsMeta(res.data.data.subjects || []);
      setPhase("pick-subject");
    } catch (err) {
      handleApiError(err);
    }
  };

  // ── Step 3: Subject select karne pe topic list dikhao ──
  const pickSubject = (subj) => {
    setSelectedSubject(subj);
    setPhase("pick-topic");
  };

  // ── Step 4: Topic (ya "All Topics") select karne pe questions lao ──
  const pickTopic = async (topicName) => {
    setPhase("loading-questions");
    try {
      const res = await api.get(
        `/questions/list/${encodeURIComponent(selectedExam)}/${encodeURIComponent(
          selectedSubject.subjectName
        )}/${encodeURIComponent(topicName)}`
      );
      const list = res.data.data || [];
      if (list.length === 0) {
        setErrorMsg("Is topic mein koi question nahi mila.");
        setPhase("error");
        return;
      }
      setQuestions(list);
      setIndex(0);
      setBreadcrumb({
        exam: selectedExam,
        subject: selectedSubject.subjectName,
        topic: topicName === "all" ? "Sabhi Topics" : topicName,
      });
      setPhase("browsing");
    } catch (err) {
      handleApiError(err);
    }
  };

  const backToExams = () => {
    setSelectedExam(null);
    setSubjectsMeta([]);
    setPhase("pick-exam");
  };

  const backToSubjects = () => {
    setSelectedSubject(null);
    setPhase("pick-subject");
  };

  const backToTopics = () => {
    setQuestions([]);
    setPhase("pick-topic");
  };

  const currentQ = questions[index];

  // ────────────────────────────── RENDER ──────────────────────────────

  if (phase === "loading-exams" || phase === "loading-meta") return <PillsSkeleton />;
  if (phase === "loading-questions") return <QuestionBrowseSkeleton />;

  if (phase === "forbidden") {
    return (
      <div className="min-h-screen bg-[#0A0D14] text-white flex items-center justify-center px-6">
        <div className="max-w-md text-center space-y-4">
          <p className="text-gray-300">Ye page sirf admin ke liye hai.</p>
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

  if (phase === "error") {
    return (
      <div className="min-h-screen bg-[#0A0D14] text-white flex items-center justify-center px-6">
        <div className="max-w-md text-center space-y-4">
          <p className="text-gray-300">{errorMsg}</p>
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

  if (phase === "pick-exam") {
    return (
      <div className="min-h-screen bg-[#0A0D14] text-white px-6 py-12">
        <div className="max-w-2xl mx-auto">
          <h1 className="text-2xl font-bold mb-1">Question Bank Review</h1>
          <p className="text-gray-400 text-sm mb-8">Exam chuniye jiske questions review karne hain</p>
          <div className="flex flex-wrap gap-3">
            {examList.map((exam) => (
              <button
                key={exam}
                onClick={() => pickExam(exam)}
                className="px-5 py-2.5 rounded-xl bg-[#111827] border border-gray-800 hover:border-[#7C3AED]/60 text-sm font-medium transition-colors"
              >
                {exam}
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (phase === "pick-subject") {
    return (
      <div className="min-h-screen bg-[#0A0D14] text-white px-6 py-12">
        <div className="max-w-2xl mx-auto">
          <button
            onClick={backToExams}
            className="text-sm text-gray-400 hover:text-white mb-6 flex items-center gap-1"
          >
            &larr; Exam Badlein
          </button>
          <h1 className="text-2xl font-bold mb-1">{selectedExam}</h1>
          <p className="text-gray-400 text-sm mb-8">Subject chuniye</p>

          {subjectsMeta.length === 0 ? (
            <p className="text-gray-400 text-sm">Is exam ke liye koi question nahi mila.</p>
          ) : (
            <div className="space-y-3">
              {subjectsMeta.map((s) => (
                <button
                  key={s.subjectName}
                  onClick={() => pickSubject(s)}
                  className="w-full text-left bg-[#111827] border border-gray-800 hover:border-[#7C3AED]/60 rounded-2xl p-5 transition-colors flex items-center justify-between"
                >
                  <div>
                    <h3 className="font-semibold text-base">{s.subjectName}</h3>
                    <p className="text-xs text-gray-500 mt-1">{s.topics.length} topics</p>
                  </div>
                  <span className="text-sm px-2.5 py-1 rounded-full bg-[#7C3AED]/20 text-[#A78BFA] flex-shrink-0">
                    {s.totalQuestions} sawaal
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  if (phase === "pick-topic" && selectedSubject) {
    return (
      <div className="min-h-screen bg-[#0A0D14] text-white px-6 py-12">
        <div className="max-w-2xl mx-auto">
          <button
            onClick={backToSubjects}
            className="text-sm text-gray-400 hover:text-white mb-6 flex items-center gap-1"
          >
            &larr; Subject Badlein
          </button>
          <h1 className="text-2xl font-bold mb-1">{selectedSubject.subjectName}</h1>
          <p className="text-gray-400 text-sm mb-8">Topic chuniye (ya sabhi ek sath dekhein)</p>

          <div className="flex flex-wrap gap-3">
            <button
              onClick={() => pickTopic("all")}
              className="px-5 py-2.5 rounded-xl bg-[#7C3AED] hover:bg-[#6D28D9] text-sm font-medium"
            >
              Sabhi Topics ({selectedSubject.totalQuestions})
            </button>
            {selectedSubject.topics.map((t) => (
              <button
                key={t}
                onClick={() => pickTopic(t)}
                className="px-5 py-2.5 rounded-xl bg-[#111827] border border-gray-800 hover:border-[#7C3AED]/60 text-sm font-medium transition-colors"
              >
                {t}
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (phase === "browsing" && currentQ) {
    return (
      <div className="min-h-screen bg-[#0A0D14] text-white px-4 sm:px-6 py-8">
        <div className="max-w-3xl mx-auto">
          <button
            onClick={backToTopics}
            className="text-sm text-gray-400 hover:text-white mb-6 flex items-center gap-1"
          >
            &larr; Topic Badlein
          </button>

          <h1 className="text-xl sm:text-2xl font-bold mb-1">{breadcrumb.subject}</h1>
          <p className="text-gray-400 text-sm mb-6">
            {breadcrumb.exam} &middot; {breadcrumb.topic}
          </p>

          <QuestionCard q={currentQ} index={index} total={questions.length} />

          <div className="flex justify-between items-center mt-6">
            <button
              onClick={() => setIndex((i) => Math.max(0, i - 1))}
              disabled={index === 0}
              className="px-4 py-2 rounded-lg border border-gray-700 text-sm text-gray-300 hover:border-gray-500 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              &larr; Previous
            </button>
            <button
              onClick={() => setIndex((i) => Math.min(questions.length - 1, i + 1))}
              disabled={index >= questions.length - 1}
              className="px-4 py-2 rounded-lg bg-[#7C3AED] hover:bg-[#6D28D9] text-sm font-medium disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Next &rarr;
            </button>
          </div>
        </div>
      </div>
    );
  }

  return null;
};

export default QuestionBankReview;