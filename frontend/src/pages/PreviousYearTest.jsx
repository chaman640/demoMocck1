import React, { useState, useEffect, useRef, useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import api from "../api/api";

const formatTime = (totalSeconds) => {
  const safe = Math.max(0, Math.floor(totalSeconds || 0));
  const h = Math.floor(safe / 3600);
  const m = Math.floor((safe % 3600) / 60);
  const s = safe % 60;
  const pad = (n) => String(n).padStart(2, "0");
  return h > 0 ? `${pad(h)}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`;
};

const STATUS = {
  NOT_VISITED: "not-visited",
  NOT_ANSWERED: "not-answered",
  ANSWERED: "answered",
};

const statusStyles = {
  [STATUS.NOT_VISITED]: "bg-[#1F2937] border-gray-700 text-gray-400",
  [STATUS.NOT_ANSWERED]: "bg-red-500/20 border-red-500 text-red-400",
  [STATUS.ANSWERED]: "bg-green-500/20 border-green-500 text-green-400",
};

// localStorage key — har user ka apna alag saved in-progress attempt, har test ke liye alag
const getStorageKey = (userId, testId) => `activePYQ_${userId}_${testId}`;

const PreviousYearTest = () => {
  const navigate = useNavigate();
  const { testId } = useParams();

  const [phase, setPhase] = useState("loading");
  const [errorMsg, setErrorMsg] = useState("");
  const [userId, setUserId] = useState("");
  const [testData, setTestData] = useState(null);

  const [activeSubjectIdx, setActiveSubjectIdx] = useState(0);
  const [activeQIdx, setActiveQIdx] = useState(0);
  const [answers, setAnswers] = useState({});
  const [visited, setVisited] = useState(() => new Set());
  const [timeSpent, setTimeSpent] = useState({});
  const [remainingSeconds, setRemainingSeconds] = useState(0);
  const [isVisible, setIsVisible] = useState(true);
  const [showSubmitConfirm, setShowSubmitConfirm] = useState(false);
  const [resultData, setResultData] = useState(null);

  const questionStartRef = useRef(Date.now());
  const currentQIdRef = useRef(null);
  const submittingRef = useRef(false);
  const remainingSecondsRef = useRef(0);

  // ── Step 1: Init — resume saved attempt ya fresh test fetch karo ──
  useEffect(() => {
    let cancelled = false;
    const init = async () => {
      setPhase("loading");
      try {
        const meRes = await api.get("/me");
        if (cancelled) return;
        const uid = meRes.data.data._id;
        setUserId(uid);

        const storageKey = getStorageKey(uid, testId);
        const savedRaw = localStorage.getItem(storageKey);
        if (savedRaw) {
          try {
            const saved = JSON.parse(savedRaw);
            if (saved.testData) {
              setTestData(saved.testData);
              setAnswers(saved.answers || {});
              setVisited(new Set(saved.visited || []));
              setTimeSpent(saved.timeSpent || {});
              setActiveSubjectIdx(saved.activeSubjectIdx || 0);
              setActiveQIdx(saved.activeQIdx || 0);
              setRemainingSeconds(Math.max(0, saved.remainingSeconds ?? 0));

              const subj = saved.testData.subjects[saved.activeSubjectIdx || 0];
              const q = subj ? subj.questions[saved.activeQIdx || 0] : null;
              currentQIdRef.current = q ? q._id : null;
              questionStartRef.current = Date.now();
              submittingRef.current = false;

              setPhase("test");
              return;
            }
          } catch {
            localStorage.removeItem(storageKey);
          }
        }

        const res = await api.get(`/previous-year-test/${testId}`);
        if (cancelled) return;
        setTestData(res.data.data);
        setPhase("instructions");
      } catch (err) {
        if (!cancelled) {
          setErrorMsg(err.response?.data?.message || "Test load nahi ho paaya.");
          setPhase("error");
        }
      }
    };
    init();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [testId]);

  const startTest = () => {
    setAnswers({});
    setVisited(new Set());
    setTimeSpent({});
    setActiveSubjectIdx(0);
    setActiveQIdx(0);
    submittingRef.current = false;

    const firstQ = testData.subjects[0].questions[0];
    currentQIdRef.current = firstQ._id;
    questionStartRef.current = Date.now();
    setVisited(new Set([firstQ._id]));

    const totalSeconds = testData.durationMinutes * 60;
    setRemainingSeconds(totalSeconds);
    setPhase("test");
  };

  const flushTime = () => {
    const qId = currentQIdRef.current;
    if (!qId) return;
    const elapsed = Math.round((Date.now() - questionStartRef.current) / 1000);
    if (elapsed > 0) {
      setTimeSpent((prev) => ({ ...prev, [qId]: (prev[qId] || 0) + elapsed }));
    }
    questionStartRef.current = Date.now();
  };

  const goToQuestion = (subjectIdx, qIdx) => {
    if (!testData) return;
    flushTime();
    const q = testData.subjects[subjectIdx].questions[qIdx];
    currentQIdRef.current = q ? q._id : null;
    setActiveSubjectIdx(subjectIdx);
    setActiveQIdx(qIdx);
    if (q) {
      setVisited((prev) => {
        const next = new Set(prev);
        next.add(q._id);
        return next;
      });
    }
  };

  const currentSubject = testData ? testData.subjects[activeSubjectIdx] : null;
  const currentQuestion = currentSubject ? currentSubject.questions[activeQIdx] : null;

  const selectAnswer = (optionNum) => {
    if (!currentQuestion) return;
    setAnswers((prev) => ({ ...prev, [currentQuestion._id]: String(optionNum) }));
  };

  const clearResponse = () => {
    if (!currentQuestion) return;
    setAnswers((prev) => {
      const next = { ...prev };
      delete next[currentQuestion._id];
      return next;
    });
  };

  const goNext = () => {
    if (!testData) return;
    const subj = testData.subjects[activeSubjectIdx];
    if (activeQIdx < subj.questions.length - 1) {
      goToQuestion(activeSubjectIdx, activeQIdx + 1);
    } else if (activeSubjectIdx < testData.subjects.length - 1) {
      goToQuestion(activeSubjectIdx + 1, 0);
    }
  };

  const goPrev = () => {
    if (!testData) return;
    if (activeQIdx > 0) {
      goToQuestion(activeSubjectIdx, activeQIdx - 1);
    } else if (activeSubjectIdx > 0) {
      const prevSubj = testData.subjects[activeSubjectIdx - 1];
      goToQuestion(activeSubjectIdx - 1, prevSubj.questions.length - 1);
    }
  };

  const getStatus = (qId) => {
    const isAnswered = answers[qId] !== undefined;
    const isVisitedQ = visited.has(qId);
    if (isAnswered) return STATUS.ANSWERED;
    if (isVisitedQ) return STATUS.NOT_ANSWERED;
    return STATUS.NOT_VISITED;
  };

  const summary = useMemo(() => {
    if (!testData) return { total: 0, answered: 0, notAnswered: 0, notVisited: 0 };
    let total = 0, answered = 0, notAnswered = 0, notVisited = 0;
    testData.subjects.forEach((subj) => {
      subj.questions.forEach((q) => {
        total++;
        const st = getStatus(q._id);
        if (st === STATUS.ANSWERED) answered++;
        else if (st === STATUS.NOT_ANSWERED) notAnswered++;
        else notVisited++;
      });
    });
    return { total, answered, notAnswered, notVisited };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [answers, visited, testData]);

  // ── localStorage checkpoint — jab bhi test progress badle ──
  useEffect(() => {
    if (phase !== "test" || !testData || !userId) return;
    const toSave = {
      testData,
      answers,
      visited: [...visited],
      timeSpent,
      activeSubjectIdx,
      activeQIdx,
      remainingSeconds: remainingSecondsRef.current,
    };
    try {
      localStorage.setItem(getStorageKey(userId, testId), JSON.stringify(toSave));
    } catch (err) {
      console.error("PYQ state save nahi ho paayi:", err);
    }
  }, [phase, testData, answers, visited, timeSpent, activeSubjectIdx, activeQIdx, userId, testId]);

  useEffect(() => {
    remainingSecondsRef.current = remainingSeconds;
  }, [remainingSeconds]);

  // ── Tab hide/minimize hote hi time freeze karke save karo ──
  useEffect(() => {
    const handleVisibility = () => {
      const visible = document.visibilityState === "visible";
      setIsVisible(visible);

      if (!visible && phase === "test" && testData && userId) {
        const qId = currentQIdRef.current;
        let updatedTimeSpent = timeSpent;
        if (qId) {
          const elapsed = Math.round((Date.now() - questionStartRef.current) / 1000);
          if (elapsed > 0) {
            updatedTimeSpent = { ...timeSpent, [qId]: (timeSpent[qId] || 0) + elapsed };
            setTimeSpent(updatedTimeSpent);
          }
          questionStartRef.current = Date.now();
        }

        const toSave = {
          testData,
          answers,
          visited: [...visited],
          timeSpent: updatedTimeSpent,
          activeSubjectIdx,
          activeQIdx,
          remainingSeconds: remainingSecondsRef.current,
        };
        try {
          localStorage.setItem(getStorageKey(userId, testId), JSON.stringify(toSave));
        } catch (err) {
          console.error("Hide-time save fail:", err);
        }
      } else if (visible && phase === "test") {
        questionStartRef.current = Date.now();
      }
    };

    document.addEventListener("visibilitychange", handleVisibility);
    window.addEventListener("pagehide", handleVisibility);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibility);
      window.removeEventListener("pagehide", handleVisibility);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, testData, userId, answers, visited, timeSpent, activeSubjectIdx, activeQIdx]);

  const handleSubmit = async () => {
    if (!testData || submittingRef.current) return;
    submittingRef.current = true;
    flushTime();
    setPhase("submitting");
    try {
      const attemptedQuestions = testData.subjects.flatMap((subj) =>
        subj.questions.map((q) => ({
          questionId: q._id,
          userAnswer: answers[q._id] || null,
          timeTakenInSeconds: visited.has(q._id) ? timeSpent[q._id] || 0 : null,
        }))
      );

      const res = await api.post(`/previous-year-test/${testId}/submit`, { attemptedQuestions });

      localStorage.removeItem(getStorageKey(userId, testId));

      setResultData(res.data.data);
      setPhase("result");
    } catch (err) {
      submittingRef.current = false;
      setErrorMsg(err.response?.data?.message || "Submit fail ho gaya.");
      setPhase("error");
    }
  };

  // ── Timer — sirf tab visible hone par tick karta hai ──
  useEffect(() => {
    if (phase !== "test" || !isVisible) return;

    if (remainingSeconds <= 0) {
      const timer = setTimeout(() => {
        handleSubmit();
      }, 0);
      return () => clearTimeout(timer);
    }

    const timer = setTimeout(() => {
      setRemainingSeconds((s) => Math.max(0, s - 1));
    }, 1000);

    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, remainingSeconds, isVisible]);

  const retakeTest = () => {
    setResultData(null);
    setPhase("instructions");
  };

  // ────────────────────────────── RENDER ──────────────────────────────

  if (phase === "loading") {
    return (
      <div className="min-h-screen bg-[#0A0D14] text-white flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-gray-700 border-t-[#8B5CF6] rounded-full animate-spin" />
          <p className="text-gray-400 text-sm">Paper load ho raha hai...</p>
        </div>
      </div>
    );
  }

  if (phase === "error") {
    return (
      <div className="min-h-screen bg-[#0A0D14] text-white flex items-center justify-center px-6">
        <div className="max-w-md text-center space-y-4">
          <div className="w-14 h-14 mx-auto rounded-full bg-red-500/10 flex items-center justify-center text-red-400 text-2xl">
            !
          </div>
          <p className="text-gray-300">{errorMsg}</p>
          <button
            onClick={() => navigate("/PreviousYearTests")}
            className="px-5 py-2 rounded-lg bg-[#7C3AED] hover:bg-[#6D28D9] text-sm font-medium"
          >
            Papers List Par Jaayein
          </button>
        </div>
      </div>
    );
  }

  if (phase === "instructions" && testData) {
    return <InstructionsScreen testData={testData} onStart={startTest} />;
  }

  if ((phase === "test" || phase === "submitting") && testData && currentQuestion) {
    return (
      <TestScreen
        testData={testData}
        activeSubjectIdx={activeSubjectIdx}
        activeQIdx={activeQIdx}
        currentQuestion={currentQuestion}
        answers={answers}
        remainingSeconds={remainingSeconds}
        summary={summary}
        getStatus={getStatus}
        onSwitchSubject={(idx) => goToQuestion(idx, 0)}
        onGoToQuestion={(qIdx) => goToQuestion(activeSubjectIdx, qIdx)}
        onSelectAnswer={selectAnswer}
        onClear={clearResponse}
        onPrev={goPrev}
        onNext={goNext}
        onSubmitClick={() => setShowSubmitConfirm(true)}
        showSubmitConfirm={showSubmitConfirm}
        onCancelSubmit={() => setShowSubmitConfirm(false)}
        onConfirmSubmit={handleSubmit}
        submitting={phase === "submitting"}
      />
    );
  }

  if (phase === "result" && resultData) {
    return (
      <ResultScreen
        resultData={resultData}
        onHome={() => navigate("/HomePage")}
        onReview={() => setPhase("review")}
        onRetake={retakeTest}
        onBackToList={() => navigate("/PreviousYearTests")}
      />
    );
  }

  if (phase === "review" && resultData) {
    return <ReviewScreen attemptId={resultData.attemptId} onBack={() => setPhase("result")} />;
  }

  return null;
};

// ──────────────────────────── Sub-components ────────────────────────────

const Stat = ({ label, value }) => (
  <div className="bg-[#1F2937] border border-gray-800 rounded-xl p-4 text-center">
    <p className="text-xl font-bold">{value}</p>
    <p className="text-[11px] text-gray-500 mt-1">{label}</p>
  </div>
);

const InstructionsScreen = ({ testData, onStart }) => {
  const [agreed, setAgreed] = useState(false);
  return (
    <div className="min-h-screen bg-[#0A0D14] text-white px-6 py-12">
      <div className="max-w-3xl mx-auto bg-[#111827] border border-gray-800 rounded-2xl p-8">
        <div className="flex items-center gap-2 mb-1">
          <h1 className="text-2xl font-bold">{testData.testName}</h1>
          <span className="text-xs px-2 py-1 rounded-full bg-[#7C3AED]/20 text-[#A78BFA]">
            {testData.year}
          </span>
        </div>
        <p className="text-gray-400 text-sm mb-6">
          {testData.examName}
          {testData.description ? ` · ${testData.description}` : ""}
        </p>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
          <Stat label="Questions" value={testData.totalQuestions} />
          <Stat label="Duration" value={`${testData.durationMinutes} min`} />
          <Stat label="Marks / Q" value={`+${testData.marksPerQuestion}`} />
          <Stat
            label="Negative"
            value={testData.negativeMarking > 0 ? `-${testData.negativeMarking}` : "None"}
          />
        </div>

        <h3 className="text-sm font-semibold text-gray-300 mb-3">Subjects</h3>
        <div className="space-y-2 mb-8">
          {testData.subjects.map((s, i) => (
            <div
              key={i}
              className="flex justify-between items-center bg-[#1F2937] border border-gray-800 rounded-lg px-4 py-2 text-sm"
            >
              <span>{s.subjectName}</span>
              <span className="text-gray-400">{s.questions.length} sawaal</span>
            </div>
          ))}
        </div>

        <h3 className="text-sm font-semibold text-gray-300 mb-3">Instructions</h3>
        <ul className="text-sm text-gray-400 space-y-1.5 mb-8 list-disc list-inside">
          <li>Ye ek ASLI purane exam ka paper hai — bilkul real exam jaisa mahaul mein dein.</li>
          <li>Timer khatam hote hi test apne aap submit ho jayega.</li>
          <li>Har sahi jawab ke {testData.marksPerQuestion} marks milenge.</li>
          {testData.negativeMarking > 0 && (
            <li>Har galat jawab ke {testData.negativeMarking} marks katenge.</li>
          )}
          <li>Agar galti se page reload ho jaaye to chinta na karein — aapka test wahi se resume ho jayega.</li>
          <li>Submit karne ke baad aap apne jawab explanation ke sath review kar sakte hain.</li>
        </ul>

        <label className="flex items-center gap-2 mb-6 text-sm text-gray-300">
          <input
            type="checkbox"
            checked={agreed}
            onChange={(e) => setAgreed(e.target.checked)}
            className="w-4 h-4 accent-[#7C3AED]"
          />
          Maine sabhi instructions padh liye hain
        </label>

        <button
          onClick={onStart}
          disabled={!agreed}
          className={`w-full py-3 rounded-lg font-semibold transition-colors ${
            agreed ? "bg-[#7C3AED] hover:bg-[#6D28D9]" : "bg-gray-700 cursor-not-allowed text-gray-400"
          }`}
        >
          Paper Shuru Karein
        </button>
      </div>
    </div>
  );
};

const LegendItem = ({ colorClass, label, count }) => (
  <div className="flex items-center gap-1.5 text-gray-400">
    <span className={`w-2.5 h-2.5 rounded-full ${colorClass}`} />
    {label} ({count})
  </div>
);

const TestScreen = ({
  testData,
  activeSubjectIdx,
  activeQIdx,
  currentQuestion,
  answers,
  remainingSeconds,
  summary,
  getStatus,
  onSwitchSubject,
  onGoToQuestion,
  onSelectAnswer,
  onClear,
  onPrev,
  onNext,
  onSubmitClick,
  showSubmitConfirm,
  onCancelSubmit,
  onConfirmSubmit,
  submitting,
}) => {
  const subject = testData.subjects[activeSubjectIdx];
  const selected = answers[currentQuestion._id];
  const timeLow = remainingSeconds <= 300;

  return (
    <div className="min-h-screen bg-[#0A0D14] text-white flex flex-col">
      <div className="flex items-center justify-between px-4 sm:px-6 py-3 border-b border-gray-800 bg-[#0A0D14] sticky top-0 z-10">
        <div className="flex items-center gap-2 min-w-0">
          <span className="font-semibold text-sm sm:text-base truncate">{testData.testName}</span>
          <span className="hidden sm:inline text-[10px] px-2 py-0.5 rounded-full bg-[#7C3AED]/20 text-[#A78BFA] flex-shrink-0">
            {testData.year}
          </span>
        </div>
        <div className="flex items-center gap-4 flex-shrink-0">
          <span
            className={`text-sm font-mono px-3 py-1 rounded-lg border ${
              timeLow ? "border-red-500 text-red-400 bg-red-500/10" : "border-gray-700 text-gray-200 bg-[#111827]"
            }`}
          >
            {formatTime(remainingSeconds)}
          </span>
          <button
            onClick={onSubmitClick}
            className="px-4 py-1.5 rounded-lg bg-[#7C3AED] hover:bg-[#6D28D9] text-sm font-medium"
          >
            Submit
          </button>
        </div>
      </div>

      <div className="flex gap-2 px-4 sm:px-6 py-3 overflow-x-auto border-b border-gray-800">
        {testData.subjects.map((s, i) => (
          <button
            key={s.subjectName}
            onClick={() => onSwitchSubject(i)}
            className={`px-4 py-1.5 rounded-full text-sm whitespace-nowrap transition-colors ${
              i === activeSubjectIdx
                ? "bg-[#7C3AED] text-white"
                : "bg-[#111827] border border-gray-800 text-gray-400 hover:text-gray-200"
            }`}
          >
            {s.subjectName}
          </button>
        ))}
      </div>

      <div className="flex flex-col lg:flex-row flex-1 px-4 sm:px-6 py-6 gap-6">
        <div className="flex-1 bg-[#111827] border border-gray-800 rounded-2xl p-6 flex flex-col">
          <p className="text-xs text-gray-500 mb-3">
            Question {activeQIdx + 1} of {subject.questions.length} &middot; {subject.subjectName}
          </p>
          <p className="text-base sm:text-lg mb-6 leading-relaxed">{currentQuestion.question}</p>

          <div className="space-y-3 mb-8">
            {[1, 2, 3, 4].map((n) => {
              const optText = currentQuestion[`option${n}`];
              const isSelected = selected === String(n);
              return (
                <button
                  key={n}
                  onClick={() => onSelectAnswer(n)}
                  className={`w-full text-left px-4 py-3 rounded-xl border transition-colors flex items-center gap-3 ${
                    isSelected
                      ? "border-[#7C3AED] bg-[#7C3AED]/15 text-white"
                      : "border-gray-800 bg-[#1F2937] text-gray-300 hover:border-gray-600"
                  }`}
                >
                  <span
                    className={`w-6 h-6 flex-shrink-0 rounded-full border flex items-center justify-center text-xs ${
                      isSelected
                        ? "border-[#A78BFA] bg-[#7C3AED] text-white"
                        : "border-gray-600 text-gray-500"
                    }`}
                  >
                    {n}
                  </span>
                  <span>{optText}</span>
                </button>
              );
            })}
          </div>

          <div className="mt-auto flex flex-wrap gap-3">
            <button
              onClick={onPrev}
              className="px-4 py-2 rounded-lg border border-gray-700 text-sm text-gray-300 hover:border-gray-500"
            >
              Previous
            </button>
            <button
              onClick={onClear}
              className="px-4 py-2 rounded-lg border border-gray-700 text-sm text-gray-300 hover:border-gray-500"
            >
              Clear Response
            </button>
            <button
              onClick={onNext}
              className="ml-auto px-5 py-2 rounded-lg bg-[#7C3AED] hover:bg-[#6D28D9] text-sm font-medium"
            >
              Save &amp; Next
            </button>
          </div>
        </div>

        <div className="w-full lg:w-72 bg-[#111827] border border-gray-800 rounded-2xl p-5 h-fit">
          <div className="grid grid-cols-1 gap-2 text-[11px] mb-5">
            <LegendItem colorClass="bg-green-500" label="Answered" count={summary.answered} />
            <LegendItem colorClass="bg-red-500" label="Not Answered" count={summary.notAnswered} />
            <LegendItem colorClass="bg-gray-600" label="Not Visited" count={summary.notVisited} />
          </div>
          <div className="grid grid-cols-5 gap-2">
            {subject.questions.map((q, i) => {
              const st = getStatus(q._id);
              const isCurrent = i === activeQIdx;
              return (
                <button
                  key={q._id}
                  onClick={() => onGoToQuestion(i)}
                  className={`w-9 h-9 rounded-lg border text-xs font-medium flex items-center justify-center transition-all ${
                    statusStyles[st]
                  } ${isCurrent ? "ring-2 ring-white/70" : ""}`}
                >
                  {i + 1}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {showSubmitConfirm && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center px-6 z-20">
          <div className="bg-[#111827] border border-gray-800 rounded-2xl p-6 max-w-sm w-full">
            <h3 className="text-lg font-semibold mb-4">Paper submit karein?</h3>
            <div className="space-y-1.5 text-sm text-gray-400 mb-6">
              <p>Answered: <span className="text-green-400">{summary.answered}</span></p>
              <p>Not Answered: <span className="text-red-400">{summary.notAnswered}</span></p>
              <p>Not Visited: <span className="text-gray-300">{summary.notVisited}</span></p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={onCancelSubmit}
                disabled={submitting}
                className="flex-1 py-2 rounded-lg border border-gray-700 text-sm text-gray-300"
              >
                Wapas Jaayein
              </button>
              <button
                onClick={onConfirmSubmit}
                disabled={submitting}
                className="flex-1 py-2 rounded-lg bg-[#7C3AED] hover:bg-[#6D28D9] text-sm font-medium"
              >
                {submitting ? "Submit ho raha hai..." : "Haan, Submit Karein"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const ResultScreen = ({ resultData, onHome, onReview, onRetake, onBackToList }) => {
  return (
    <div className="min-h-screen bg-[#0A0D14] text-white px-6 py-12">
      <div className="max-w-xl mx-auto">
        <h1 className="text-2xl font-bold mb-1">Paper Complete! 🏁</h1>
        <p className="text-gray-400 text-sm mb-8">{resultData.testName}</p>

        <div className="bg-[#111827] border border-gray-800 rounded-2xl p-8 text-center mb-6">
          <p className="text-5xl font-bold text-[#A78BFA]">{resultData.totalScore}</p>
          <p className="text-sm text-gray-500 mt-1">Total Score</p>
        </div>

        <div className="grid grid-cols-3 gap-4 mb-10">
          <div className="bg-[#1F2937] rounded-xl p-4 text-center">
            <p className="text-lg font-bold text-green-400">{resultData.correctCount}</p>
            <p className="text-[11px] text-gray-500">Correct</p>
          </div>
          <div className="bg-[#1F2937] rounded-xl p-4 text-center">
            <p className="text-lg font-bold text-red-400">{resultData.wrongCount}</p>
            <p className="text-[11px] text-gray-500">Wrong</p>
          </div>
          <div className="bg-[#1F2937] rounded-xl p-4 text-center">
            <p className="text-lg font-bold text-gray-300">{resultData.unattemptedCount}</p>
            <p className="text-[11px] text-gray-500">Unattempted</p>
          </div>
        </div>

        <div className="space-y-3">
          <button
            onClick={onReview}
            className="w-full py-3 rounded-lg bg-[#7C3AED] hover:bg-[#6D28D9] font-semibold"
          >
            Jawab Review Karein
          </button>
          <button
            onClick={onRetake}
            className="w-full py-3 rounded-lg border border-[#7C3AED] text-[#A78BFA] hover:bg-[#7C3AED]/10 font-semibold"
          >
            Dobara Attempt Karein
          </button>
          <button
            onClick={onBackToList}
            className="w-full py-3 rounded-lg border border-gray-700 text-gray-300"
          >
            Sabhi Papers Dekhein
          </button>
          <button
            onClick={onHome}
            className="w-full py-3 rounded-lg border border-gray-700 text-gray-300"
          >
            Home Jaayein
          </button>
        </div>
      </div>
    </div>
  );
};

const STATUS_FILTERS = [
  { key: "all", label: "All" },
  { key: "correct", label: "Correct" },
  { key: "wrong", label: "Wrong" },
  { key: "unattempted", label: "Unattempted" },
];

const ReviewScreen = ({ attemptId, onBack }) => {
  const [subjectFilter, setSubjectFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [index, setIndex] = useState(0);

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["pyq-attempt-detail", attemptId],
    queryFn: async () => {
      const res = await api.get(`/previous-year-attempt/${attemptId}`);
      return res.data.data;
    },
    enabled: !!attemptId,
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

  useEffect(() => {
    setIndex(0);
  }, [subjectFilter, statusFilter]);

  const currentQ = filteredQuestions[index];

  const counts = useMemo(() => {
    const base = allQuestions.filter(
      (q) => subjectFilter === "all" || q.subjectName === subjectFilter
    );
    return {
      all: base.length,
      correct: base.filter((q) => q.isCorrect === true).length,
      wrong: base.filter((q) => q.isCorrect === false).length,
      unattempted: base.filter((q) => q.isCorrect === null).length,
    };
  }, [allQuestions, subjectFilter]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#0A0D14] text-white flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-gray-700 border-t-[#8B5CF6] rounded-full animate-spin" />
          <p className="text-gray-400 text-sm">Sawaal load ho rahe hain...</p>
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="min-h-screen bg-[#0A0D14] text-white flex items-center justify-center px-6">
        <div className="max-w-md text-center space-y-4">
          <p className="text-gray-300">
            {error?.response?.data?.message || "Data load nahi ho paaya."}
          </p>
          <button
            onClick={onBack}
            className="px-5 py-2 rounded-lg bg-[#7C3AED] hover:bg-[#6D28D9] text-sm font-medium"
          >
            Wapas Jaayein
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0A0D14] text-white px-4 sm:px-6 py-8">
      <div className="max-w-3xl mx-auto">
        <button
          onClick={onBack}
          className="text-sm text-gray-400 hover:text-white mb-6 flex items-center gap-1"
        >
          &larr; Result par wapas jaayein
        </button>

        <h1 className="text-xl sm:text-2xl font-bold mb-1">Answer Review</h1>
        <p className="text-gray-400 text-sm mb-6">{data?.testName} &middot; {data?.year}</p>

        <div className="bg-[#111827] border border-gray-800 rounded-2xl p-8 text-center mb-6">
          <p className="text-5xl font-bold text-[#A78BFA]">{data?.overview?.totalScore}</p>
          <p className="text-sm text-gray-500 mt-1">Total Score</p>
        </div>

        {subjects.length > 1 && (
          <div className="flex gap-2 mb-4 overflow-x-auto pb-1">
            <button
              onClick={() => setSubjectFilter("all")}
              className={`px-4 py-1.5 rounded-full text-sm whitespace-nowrap transition-colors ${
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
                onClick={() => setSubjectFilter(s)}
                className={`px-4 py-1.5 rounded-full text-sm whitespace-nowrap transition-colors ${
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

        <div className="flex gap-2 mb-6 overflow-x-auto pb-1">
          {STATUS_FILTERS.map((f) => (
            <button
              key={f.key}
              onClick={() => setStatusFilter(f.key)}
              className={`px-4 py-1.5 rounded-full text-sm whitespace-nowrap transition-colors ${
                statusFilter === f.key
                  ? "bg-[#7C3AED] text-white"
                  : "bg-[#111827] border border-gray-800 text-gray-400 hover:text-gray-200"
              }`}
            >
              {f.label} ({counts[f.key]})
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
    </div>
  );
};

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
    <div className="bg-[#111827] border border-gray-800 rounded-2xl p-6">
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

export default PreviousYearTest;