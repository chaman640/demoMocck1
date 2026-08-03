import React, { useState, useEffect, useRef, useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import api from "../api/api";

const SkeletonBlock = ({ className = "" }) => (
  <div className={`bg-gray-800/70 rounded animate-pulse ${className}`} />
);

const ReadingSkeleton = () => (
  <div className="min-h-screen bg-[#0A0D14] text-white px-6 py-12">
    <div className="max-w-2xl mx-auto">
      <SkeletonBlock className="w-32 h-4 mb-6" />
      <SkeletonBlock className="w-64 h-7 mb-2" />
      <SkeletonBlock className="w-40 h-4 mb-8" />
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="bg-[#111827] border border-gray-800 rounded-2xl p-5">
            <SkeletonBlock className="w-20 h-3 mb-3" />
            <SkeletonBlock className="w-3/4 h-5 mb-3" />
            <SkeletonBlock className="w-full h-4 mb-1" />
            <SkeletonBlock className="w-full h-4 mb-1" />
            <SkeletonBlock className="w-2/3 h-4" />
          </div>
        ))}
      </div>
    </div>
  </div>
);

// "YYYY-MM-DD" ko manually parse karke display karta hai — Date object use
// nahi kiya taaki koi timezone-shift bug na aaye
const formatDateDisplay = (dateStr) => {
  if (!dateStr) return "";
  const [y, m, d] = dateStr.split("-").map(Number);
  const months = ["January","February","March","April","May","June","July","August","September","October","November","December"];
  return `${d} ${months[m - 1]} ${y}`;
};

const STATUS_FILTERS = [
  { key: "all", label: "All" },
  { key: "correct", label: "Correct" },
  { key: "wrong", label: "Wrong" },
  { key: "unattempted", label: "Unattempted" },
];

const CurrentAffairs = () => {
  const navigate = useNavigate();
  const { date: dateParam } = useParams();

  const [phase, setPhase] = useState("loading"); // loading | reading | quiz | submitting | result | review | error
  const [errorMsg, setErrorMsg] = useState("");
  const [examName, setExamName] = useState("");

  const [affair, setAffair] = useState(null);
  const [quiz, setQuiz] = useState(null);
  const [answers, setAnswers] = useState({});
  const [activeQIdx, setActiveQIdx] = useState(0);
  const [resultData, setResultData] = useState(null);

  const [reviewData, setReviewData] = useState(null);
  const [statusFilter, setStatusFilter] = useState("all");
  const [reviewIdx, setReviewIdx] = useState(0);

  const submittingRef = useRef(false);

  useEffect(() => {
    let cancelled = false;
    const init = async () => {
      setPhase("loading");
      try {
        const meRes = await api.get("/me");
        if (cancelled) return;
        const exam = meRes.data.data.exam;
        setExamName(exam);

        const url = dateParam
          ? `/current-affair/${encodeURIComponent(exam)}/${dateParam}`
          : `/current-affair/${encodeURIComponent(exam)}`;

        const res = await api.get(url);
        if (cancelled) return;

        setAffair(res.data.available ? res.data.data : null);
        setPhase("reading");
      } catch (err) {
        if (!cancelled) {
          setErrorMsg(err.response?.data?.message || "Current affairs load nahi ho paaye.");
          setPhase("error");
        }
      }
    };
    init();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dateParam]);

  const startQuiz = async () => {
    if (!affair) return;
    setPhase("loading");
    try {
      const res = await api.get(
        `/current-affair-quiz/${encodeURIComponent(examName)}/${affair.date}`
      );
      setQuiz(res.data.data);
      setAnswers({});
      setActiveQIdx(0);
      submittingRef.current = false;
      setPhase("quiz");
    } catch (err) {
      setErrorMsg(err.response?.data?.message || "Quiz load nahi ho paaya.");
      setPhase("error");
    }
  };

  const currentQuestion = quiz ? quiz.questions[activeQIdx] : null;

  const selectAnswer = (n) => {
    if (!currentQuestion) return;
    setAnswers((prev) => ({ ...prev, [currentQuestion._id]: String(n) }));
  };

  const goNext = () => {
    if (quiz && activeQIdx < quiz.questions.length - 1) setActiveQIdx((i) => i + 1);
  };
  const goPrev = () => {
    if (activeQIdx > 0) setActiveQIdx((i) => i - 1);
  };

  const handleSubmit = async () => {
    if (!quiz || submittingRef.current) return;
    submittingRef.current = true;
    setPhase("submitting");
    try {
      const attemptedQuestions = quiz.questions.map((q) => ({
        questionId: q._id,
        userAnswer: answers[q._id] || null,
      }));

      const res = await api.post(
        `/current-affair-quiz/${encodeURIComponent(examName)}/${affair.date}/submit`,
        { attemptedQuestions }
      );
      setResultData(res.data.data);
      setPhase("result");
    } catch (err) {
      submittingRef.current = false;
      if (err.response?.status === 409) {
        setResultData(affair.attemptSummary);
        setPhase("result");
      } else {
        setErrorMsg(err.response?.data?.message || "Submit fail ho gaya.");
        setPhase("error");
      }
    }
  };

  const openReview = async () => {
    setPhase("loading");
    try {
      const res = await api.get(
        `/current-affair-quiz/${encodeURIComponent(examName)}/${affair.date}/my-attempt`
      );
      setReviewData(res.data.data);
      setStatusFilter("all");
      setReviewIdx(0);
      setPhase("review");
    } catch (err) {
      setErrorMsg(err.response?.data?.message || "Review load nahi ho paaya.");
      setPhase("error");
    }
  };

  const filteredReviewQuestions = useMemo(() => {
    if (!reviewData) return [];
    return reviewData.questionBreakdown.filter((q) => {
      if (statusFilter === "correct") return q.isCorrect === true;
      if (statusFilter === "wrong") return q.isCorrect === false;
      if (statusFilter === "unattempted") return q.isCorrect === null;
      return true;
    });
  }, [reviewData, statusFilter]);

  useEffect(() => setReviewIdx(0), [statusFilter]);

  // ────────────────────────────── RENDER ──────────────────────────────

  if (phase === "loading") return <ReadingSkeleton />;
  if (phase === "submitting") return <ReadingSkeleton />;

  if (phase === "error") {
    return (
      <div className="min-h-screen bg-[#0A0D14] text-white flex items-center justify-center px-6">
        <div className="max-w-md text-center space-y-4">
          <p className="text-gray-300">{errorMsg}</p>
          <button onClick={() => navigate("/HomePage")} className="px-5 py-2 rounded-lg bg-[#7C3AED] hover:bg-[#6D28D9] text-sm font-medium">
            Home Jaayein
          </button>
        </div>
      </div>
    );
  }

  if (phase === "reading") {
    if (!affair) {
      return (
        <div className="min-h-screen bg-[#0A0D14] text-white flex items-center justify-center px-6">
          <div className="max-w-md text-center space-y-4">
            <div className="text-4xl mb-2">📰</div>
            <h2 className="text-lg font-semibold">Aaj Ka Current Affairs Abhi Nahi Aaya</h2>
            <p className="text-gray-400 text-sm">Thodi der baad wapas check karein.</p>
            <button onClick={() => navigate("/HomePage")} className="px-5 py-2 rounded-lg border border-gray-700 text-sm text-gray-300">
              Home Jaayein
            </button>
          </div>
        </div>
      );
    }

    return (
      <div className="min-h-screen bg-[#0A0D14] text-white px-6 py-10">
        <div className="max-w-2xl mx-auto">
          <button onClick={() => navigate("/HomePage")} className="text-sm text-gray-400 hover:text-white mb-6 flex items-center gap-1">
            &larr; Home
          </button>

          <h1 className="text-2xl font-bold mb-1">{affair.title || "Current Affairs"}</h1>
          <p className="text-gray-400 text-sm mb-8">
            {formatDateDisplay(affair.date)} &middot; {examName}
          </p>

          <div className="space-y-4 mb-10">
            {affair.items.map((item, i) => (
              <div key={i} className="bg-[#111827] border border-gray-800 rounded-2xl p-5">
                <span className="inline-block text-[11px] px-2.5 py-1 rounded-full mb-3 bg-[#1F2937] text-[#A78BFA] border border-gray-700">
                  {item.category || "General"}
                </span>
                <h3 className="text-base font-semibold mb-2 leading-relaxed">{item.headline}</h3>
                {item.imageUrl && (
                  <img src={item.imageUrl} alt={item.headline} className="w-full rounded-lg mb-3 object-cover max-h-56" />
                )}
                <p className="text-sm text-gray-300 leading-relaxed">{item.content}</p>
                {item.source && <p className="text-[11px] text-gray-600 mt-2">Source: {item.source}</p>}
              </div>
            ))}
          </div>

          <div className="bg-[#111827] border border-gray-800 rounded-2xl p-6 text-center">
            {!affair.quizAvailable ? (
              <p className="text-sm text-gray-400">Is din ka quiz abhi taiyar nahi hai.</p>
            ) : affair.alreadyAttempted ? (
              <>
                <p className="text-sm text-gray-400 mb-1">Aapne ye quiz de diya hai</p>
                <p className="text-3xl font-bold text-[#A78BFA] mb-4">
                  {affair.attemptSummary?.correctCount} / {affair.attemptSummary?.correctCount + affair.attemptSummary?.wrongCount + affair.attemptSummary?.unattemptedCount}
                </p>
                <button onClick={openReview} className="w-full py-3 rounded-lg bg-[#7C3AED] hover:bg-[#6D28D9] font-semibold">
                  Answers Review Karein
                </button>
              </>
            ) : (
              <>
                <p className="text-sm text-gray-400 mb-4">Ab is din ki current affairs par apni understanding test karein</p>
                <button onClick={startQuiz} className="w-full py-3 rounded-lg bg-[#7C3AED] hover:bg-[#6D28D9] font-semibold">
                  Quiz Shuru Karein ({affair.totalQuizQuestions} sawaal)
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (phase === "quiz" && currentQuestion) {
    const selected = answers[currentQuestion._id];
    const isLast = activeQIdx === quiz.questions.length - 1;

    return (
      <div className="min-h-screen bg-[#0A0D14] text-white px-6 py-10">
        <div className="max-w-xl mx-auto">
          <p className="text-xs text-gray-500 mb-6">Question {activeQIdx + 1} of {quiz.questions.length}</p>

          <div className="bg-[#111827] border border-gray-800 rounded-2xl p-6 mb-6">
            <p className="text-base sm:text-lg mb-6 leading-relaxed">{currentQuestion.question}</p>
            <div className="space-y-3">
              {[1, 2, 3, 4].map((n) => {
                const optText = currentQuestion[`option${n}`];
                const isSelected = selected === String(n);
                return (
                  <button
                    key={n}
                    onClick={() => selectAnswer(n)}
                    className={`w-full text-left px-4 py-3 rounded-xl border flex items-center gap-3 transition-colors ${
                      isSelected ? "border-[#7C3AED] bg-[#7C3AED]/15 text-white" : "border-gray-800 bg-[#1F2937] text-gray-300 hover:border-gray-600"
                    }`}
                  >
                    <span className={`w-6 h-6 flex-shrink-0 rounded-full border flex items-center justify-center text-xs ${
                      isSelected ? "border-[#A78BFA] bg-[#7C3AED] text-white" : "border-gray-600 text-gray-500"
                    }`}>
                      {n}
                    </span>
                    <span>{optText}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex gap-3">
            <button onClick={goPrev} disabled={activeQIdx === 0} className="px-4 py-2 rounded-lg border border-gray-700 text-sm text-gray-300 disabled:opacity-40">
              Previous
            </button>
            {isLast ? (
              <button onClick={handleSubmit} className="ml-auto px-5 py-2 rounded-lg bg-[#7C3AED] hover:bg-[#6D28D9] text-sm font-medium">
                Submit Karein
              </button>
            ) : (
              <button onClick={goNext} className="ml-auto px-5 py-2 rounded-lg bg-[#7C3AED] hover:bg-[#6D28D9] text-sm font-medium">
                Next
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (phase === "result" && resultData) {
    return (
      <div className="min-h-screen bg-[#0A0D14] text-white px-6 py-12">
        <div className="max-w-xl mx-auto text-center">
          <h1 className="text-2xl font-bold mb-1">Quiz Complete! ✅</h1>
          <p className="text-gray-400 text-sm mb-8">Dekho kitna samjhe aaj ki khabrein</p>

          <div className="bg-[#111827] border border-gray-800 rounded-2xl p-8 mb-6">
            <p className="text-5xl font-bold text-[#A78BFA]">{resultData.totalScore}</p>
            <p className="text-sm text-gray-500 mt-1">
              / {resultData.correctCount + resultData.wrongCount + resultData.unattemptedCount} Score
            </p>
          </div>

          <div className="grid grid-cols-3 gap-4 mb-8">
            <div className="bg-[#1F2937] rounded-xl p-4">
              <p className="text-lg font-bold text-green-400">{resultData.correctCount}</p>
              <p className="text-[11px] text-gray-500">Correct</p>
            </div>
            <div className="bg-[#1F2937] rounded-xl p-4">
              <p className="text-lg font-bold text-red-400">{resultData.wrongCount}</p>
              <p className="text-[11px] text-gray-500">Wrong</p>
            </div>
            <div className="bg-[#1F2937] rounded-xl p-4">
              <p className="text-lg font-bold text-gray-300">{resultData.unattemptedCount}</p>
              <p className="text-[11px] text-gray-500">Unattempted</p>
            </div>
          </div>

          <button onClick={openReview} className="w-full py-3 rounded-lg bg-[#7C3AED] hover:bg-[#6D28D9] font-semibold mb-3">
            Answers Review Karein
          </button>
          <button onClick={() => navigate("/HomePage")} className="w-full py-3 rounded-lg border border-gray-700 text-gray-300">
            Home Jaayein
          </button>
        </div>
      </div>
    );
  }

  if (phase === "review" && reviewData) {
    const currentQ = filteredReviewQuestions[reviewIdx];
    const counts = {
      all: reviewData.questionBreakdown.length,
      correct: reviewData.questionBreakdown.filter((q) => q.isCorrect === true).length,
      wrong: reviewData.questionBreakdown.filter((q) => q.isCorrect === false).length,
      unattempted: reviewData.questionBreakdown.filter((q) => q.isCorrect === null).length,
    };

    return (
      <div className="min-h-screen bg-[#0A0D14] text-white px-4 sm:px-6 py-8">
        <div className="max-w-3xl mx-auto">
          <button onClick={() => setPhase("reading")} className="text-sm text-gray-400 hover:text-white mb-6 flex items-center gap-1">
            &larr; Wapas
          </button>

          <h1 className="text-xl sm:text-2xl font-bold mb-6">Answers Review</h1>

          <div className="flex gap-2 mb-6 overflow-x-auto pb-1">
            {STATUS_FILTERS.map((f) => (
              <button
                key={f.key}
                onClick={() => setStatusFilter(f.key)}
                className={`px-4 py-1.5 rounded-full text-sm whitespace-nowrap transition-colors ${
                  statusFilter === f.key ? "bg-[#7C3AED] text-white" : "bg-[#111827] border border-gray-800 text-gray-400 hover:text-gray-200"
                }`}
              >
                {f.label} ({counts[f.key]})
              </button>
            ))}
          </div>

          {filteredReviewQuestions.length === 0 && (
            <p className="text-gray-400 text-sm py-10 text-center">Is category mein koi sawaal nahi hai.</p>
          )}

          {currentQ && (
            <>
              <p className="text-xs text-gray-500 mb-3">Question {reviewIdx + 1} of {filteredReviewQuestions.length}</p>
              <div className="bg-[#111827] border border-gray-800 rounded-2xl p-6">
                <div className="flex justify-end mb-4">
                  <span className={`text-xs px-2.5 py-1 rounded-full border font-medium ${
                    currentQ.isCorrect === true ? "text-green-400 bg-green-500/10 border-green-500/30" :
                    currentQ.isCorrect === false ? "text-red-400 bg-red-500/10 border-red-500/30" :
                    "text-gray-400 bg-gray-500/10 border-gray-500/30"
                  }`}>
                    {currentQ.isCorrect === true ? "Correct" : currentQ.isCorrect === false ? "Wrong" : "Unattempted"}
                  </span>
                </div>
                <p className="text-base sm:text-lg mb-6 leading-relaxed">{currentQ.question}</p>
                <div className="space-y-2.5 mb-6">
                  {[1, 2, 3, 4].map((n) => {
                    const optText = currentQ.options?.[`option${n}`];
                    const isCorrectOpt = currentQ.correctOption === n;
                    const isUserPick = currentQ.userAnswer === String(n);
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
                {currentQ.answerExplain && (
                  <div className="bg-[#1F2937]/50 border border-gray-700/50 rounded-lg p-4">
                    <p className="text-xs font-semibold tracking-wider text-purple-400 uppercase mb-2">Explanation</p>
                    <p className="text-sm text-gray-300 leading-relaxed">{currentQ.answerExplain}</p>
                  </div>
                )}
              </div>

              <div className="flex justify-between items-center mt-6">
                <button onClick={() => setReviewIdx((i) => Math.max(0, i - 1))} disabled={reviewIdx === 0} className="px-4 py-2 rounded-lg border border-gray-700 text-sm text-gray-300 disabled:opacity-40">
                  &larr; Previous
                </button>
                <button onClick={() => setReviewIdx((i) => Math.min(filteredReviewQuestions.length - 1, i + 1))} disabled={reviewIdx >= filteredReviewQuestions.length - 1} className="px-4 py-2 rounded-lg bg-[#7C3AED] hover:bg-[#6D28D9] text-sm font-medium disabled:opacity-40">
                  Next &rarr;
                </button>
              </div>
            </>
          )}

          <button onClick={() => navigate("/HomePage")} className="w-full py-3 mt-8 rounded-lg border border-gray-700 text-gray-300">
            Home Jaayein
          </button>
        </div>
      </div>
    );
  }

  return null;
};

export default CurrentAffairs;