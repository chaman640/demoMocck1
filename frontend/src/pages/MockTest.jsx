import React, { useState, useEffect, useRef, useMemo } from "react";
import { useNavigate, useLocation } from "react-router-dom";

const BASE_URL = "http://localhost:5000/api";

const STATUS = {
  NOT_VISITED: "not-visited",
  NOT_ANSWERED: "not-answered",
  ANSWERED: "answered",
  MARKED: "marked",
  ANSWERED_MARKED: "answered-marked",
};

const statusStyles = {
  [STATUS.NOT_VISITED]: "bg-[#1F2937] border-gray-700 text-gray-400",
  [STATUS.NOT_ANSWERED]: "bg-red-500/20 border-red-500 text-red-400",
  [STATUS.ANSWERED]: "bg-green-500/20 border-green-500 text-green-400",
  [STATUS.MARKED]: "bg-purple-500/20 border-purple-500 text-purple-300",
  [STATUS.ANSWERED_MARKED]: "bg-purple-500/20 border-purple-500 text-purple-300",
};

const formatTime = (totalSeconds) => {
  const safe = Math.max(0, Math.floor(totalSeconds || 0));
  const h = Math.floor(safe / 3600);
  const m = Math.floor((safe % 3600) / 60);
  const s = safe % 60;
  const pad = (n) => String(n).padStart(2, "0");
  return h > 0 ? `${pad(h)}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`;
};

const MockTest = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const preferredMockType =
    location.state && location.state.mockType ? location.state.mockType : null;

  // loading | select | instructions | test | submitting | results | error
  const [phase, setPhase] = useState("loading");
  const [errorMsg, setErrorMsg] = useState("");

  const [userId, setUserId] = useState("");
  const [examName, setExamName] = useState("");

  const [blueprints, setBlueprints] = useState([]);
  const [selectedBlueprint, setSelectedBlueprint] = useState(null);

  const [mockData, setMockData] = useState(null);

  const [activeSubjectIdx, setActiveSubjectIdx] = useState(0);
  const [activeQIdx, setActiveQIdx] = useState(0);

  const [answers, setAnswers] = useState({});
  const [marked, setMarked] = useState(() => new Set());
  const [visited, setVisited] = useState(() => new Set());
  const [timeSpent, setTimeSpent] = useState({});

  const [remainingSeconds, setRemainingSeconds] = useState(0);
  const [showSubmitConfirm, setShowSubmitConfirm] = useState(false);
  const [resultData, setResultData] = useState(null);

  const questionStartRef = useRef(Date.now());
  const currentQIdRef = useRef(null);
  const submittingRef = useRef(false);

  // ── Step 1: who is logged in + which mocks exist for their exam ──
  useEffect(() => {
    let cancelled = false;
    const init = async () => {
      try {
        const meRes = await fetch(`${BASE_URL}/me`, { credentials: "include" });
        const meJson = await meRes.json();
        if (!meRes.ok || !meJson.success) {
          throw new Error(meJson.message || "Pehle login karein.");
        }
        if (cancelled) return;
        setUserId(meJson.data._id);
        setExamName(meJson.data.exam);

        const bpRes = await fetch(
          `${BASE_URL}/blueprints/${encodeURIComponent(meJson.data.exam)}`,
          { credentials: "include" }
        );
        const bpJson = await bpRes.json();
        if (!bpRes.ok || !bpJson.success) {
          throw new Error(bpJson.message || "Mock test list fetch nahi hui.");
        }
        if (cancelled) return;

        let list = bpJson.data || [];
        if (preferredMockType) {
          const filtered = list.filter((b) => b.mockType === preferredMockType);
          if (filtered.length > 0) list = filtered;
        }

        if (list.length === 0) {
          throw new Error(`${meJson.data.exam} ke liye abhi koi mock test available nahi hai.`);
        }

        setBlueprints(list);
        if (list.length === 1) {
          setSelectedBlueprint(list[0]);
          setPhase("instructions");
        } else {
          setPhase("select");
        }
      } catch (err) {
        if (!cancelled) {
          setErrorMsg(err.message);
          setPhase("error");
        }
      }
    };
    init();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const chooseBlueprint = (bp) => {
    setSelectedBlueprint(bp);
    setPhase("instructions");
  };

  // ── Step 2: generate the actual mock (called from instructions screen) ──
  const startTest = async () => {
    setPhase("loading");
    setErrorMsg("");
    try {
      const res = await fetch(`${BASE_URL}/generate-mock`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          userId,
          examName,
          blueprintName: selectedBlueprint.blueprintName,
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.message || "Mock test generate nahi ho paaya.");
      }

      const mt = json.mockTest;
      const nonEmptySubjects = (mt.subjects || []).filter(
        (s) => s.questions && s.questions.length > 0
      );
      if (nonEmptySubjects.length === 0) {
        throw new Error("Is blueprint ke liye abhi questions database mein maujood nahi hain.");
      }

      const cleanMock = { ...mt, subjects: nonEmptySubjects };
      setMockData(cleanMock);
      setAnswers({});
      setMarked(new Set());
      setVisited(new Set());
      setTimeSpent({});
      setActiveSubjectIdx(0);
      setActiveQIdx(0);
      submittingRef.current = false;

      const firstQ = nonEmptySubjects[0].questions[0];
      currentQIdRef.current = firstQ._id;
      questionStartRef.current = Date.now();
      setVisited(new Set([firstQ._id]));

      const durMin =
        selectedBlueprint.durationMinutes && selectedBlueprint.durationMinutes > 0
          ? selectedBlueprint.durationMinutes
          : Math.max(10, Math.round(selectedBlueprint.totalQuestions * 0.8));
      setRemainingSeconds(durMin * 60);

      setPhase("test");
    } catch (err) {
      setErrorMsg(err.message);
      setPhase("error");
    }
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
    if (!mockData) return;
    flushTime();
    const q = mockData.subjects[subjectIdx].questions[qIdx];
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

  const currentSubject = mockData ? mockData.subjects[activeSubjectIdx] : null;
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

  const toggleMark = () => {
    if (!currentQuestion) return;
    setMarked((prev) => {
      const next = new Set(prev);
      if (next.has(currentQuestion._id)) next.delete(currentQuestion._id);
      else next.add(currentQuestion._id);
      return next;
    });
  };

  const goNext = () => {
    if (!mockData) return;
    const subj = mockData.subjects[activeSubjectIdx];
    if (activeQIdx < subj.questions.length - 1) {
      goToQuestion(activeSubjectIdx, activeQIdx + 1);
    } else if (activeSubjectIdx < mockData.subjects.length - 1) {
      goToQuestion(activeSubjectIdx + 1, 0);
    }
  };

  const goPrev = () => {
    if (!mockData) return;
    if (activeQIdx > 0) {
      goToQuestion(activeSubjectIdx, activeQIdx - 1);
    } else if (activeSubjectIdx > 0) {
      const prevSubj = mockData.subjects[activeSubjectIdx - 1];
      goToQuestion(activeSubjectIdx - 1, prevSubj.questions.length - 1);
    }
  };

  const markAndNext = () => {
    toggleMark();
    goNext();
  };

  const getStatus = (qId) => {
    const isAnswered = answers[qId] !== undefined;
    const isMarked = marked.has(qId);
    const isVisited = visited.has(qId);
    if (isAnswered && isMarked) return STATUS.ANSWERED_MARKED;
    if (isMarked) return STATUS.MARKED;
    if (isAnswered) return STATUS.ANSWERED;
    if (isVisited) return STATUS.NOT_ANSWERED;
    return STATUS.NOT_VISITED;
  };

  const summary = useMemo(() => {
    if (!mockData) return { total: 0, answered: 0, notAnswered: 0, markedCount: 0, notVisited: 0 };
    let total = 0,
      answered = 0,
      notAnswered = 0,
      markedCount = 0,
      notVisited = 0;
    mockData.subjects.forEach((subj) => {
      subj.questions.forEach((q) => {
        total++;
        const st = getStatus(q._id);
        if (st === STATUS.ANSWERED || st === STATUS.ANSWERED_MARKED) answered++;
        if (st === STATUS.MARKED || st === STATUS.ANSWERED_MARKED) markedCount++;
        if (st === STATUS.NOT_ANSWERED) notAnswered++;
        if (st === STATUS.NOT_VISITED) notVisited++;
      });
    });
    return { total, answered, notAnswered, markedCount, notVisited };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [answers, marked, visited, mockData]);

  // ── Countdown timer — auto-submits at zero ──
  useEffect(() => {
    if (phase !== "test") return undefined;
    if (remainingSeconds <= 0) {
      handleSubmit();
      return undefined;
    }
    const timer = setTimeout(() => {
      setRemainingSeconds((s) => s - 1);
    }, 1000);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, remainingSeconds]);

  const handleSubmit = async () => {
    if (!mockData || submittingRef.current) return;
    submittingRef.current = true;
    flushTime();
    setShowSubmitConfirm(false);
    setPhase("submitting");
    try {
      const attemptedQuestions = [];
      mockData.subjects.forEach((subj) => {
        subj.questions.forEach((q) => {
          const userAns = answers[q._id] !== undefined ? answers[q._id] : null;
          const wasVisited = visited.has(q._id);
          const isCorrect = userAns === null ? null : userAns === String(q.correctOption);
          attemptedQuestions.push({
            questionId: q._id,
            userAnswer: userAns,
            isCorrect,
            timeTakenInSeconds: wasVisited ? timeSpent[q._id] || 0 : null,
          });
        });
      });

      const res = await fetch(`${BASE_URL}/add-performence`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          userId,
          examName,
          blueprintName: selectedBlueprint.blueprintName,
          attemptedQuestions,
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.message || "Performance save nahi ho payi.");
      }
      setResultData(json.data);
      setPhase("results");
    } catch (err) {
      submittingRef.current = false;
      setErrorMsg(err.message);
      setPhase("error");
    }
  };

  // ────────────────────────────── RENDER ──────────────────────────────

  if (phase === "loading") {
    return (
      <div className="min-h-screen bg-[#0A0D14] text-white flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-gray-700 border-t-[#8B5CF6] rounded-full animate-spin" />
          <p className="text-gray-400 text-sm">Test taiyaar ho raha hai...</p>
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
          <div className="flex gap-3 justify-center pt-2">
            <button
              onClick={() => navigate("/Login")}
              className="px-5 py-2 rounded-lg bg-[#7C3AED] hover:bg-[#6D28D9] text-sm font-medium"
            >
              Login page par jaayein
            </button>
            <button
              onClick={() => window.location.reload()}
              className="px-5 py-2 rounded-lg border border-gray-700 hover:border-gray-500 text-sm font-medium text-gray-300"
            >
              Dobara try karein
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (phase === "select") {
    return (
      <div className="min-h-screen bg-[#0A0D14] text-white px-6 py-12">
        <div className="max-w-2xl mx-auto">
          <h1 className="text-2xl font-bold mb-1">Mock Test Chuniye</h1>
          <p className="text-gray-400 text-sm mb-8">{examName} ke liye ye tests available hain</p>
          <div className="space-y-4">
            {blueprints.map((bp) => (
              <button
                key={bp._id}
                onClick={() => chooseBlueprint(bp)}
                className="w-full text-left bg-[#111827] border border-gray-800 hover:border-[#7C3AED]/60 rounded-2xl p-5 transition-colors"
              >
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-semibold text-lg">{bp.blueprintName}</h3>
                  <span className="text-xs px-2 py-1 rounded-full bg-[#7C3AED]/20 text-[#A78BFA]">
                    {bp.mockType}
                  </span>
                </div>
                <p className="text-sm text-gray-400">
                  {bp.totalQuestions} sawaal &middot; {bp.marksPerQuestion} marks/sawaal &middot;{" "}
                  {bp.negativeMarking > 0 ? `-${bp.negativeMarking} negative` : "no negative marking"}
                </p>
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (phase === "instructions" && selectedBlueprint) {
    const durMin =
      selectedBlueprint.durationMinutes && selectedBlueprint.durationMinutes > 0
        ? selectedBlueprint.durationMinutes
        : Math.max(10, Math.round(selectedBlueprint.totalQuestions * 0.8));

    return (
      <InstructionsScreen
        examName={examName}
        blueprint={selectedBlueprint}
        durMin={durMin}
        onStart={startTest}
      />
    );
  }

  if ((phase === "test" || phase === "submitting") && mockData && currentQuestion) {
    return (
      <TestScreen
        mockData={mockData}
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
        onMarkAndNext={markAndNext}
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

  if (phase === "results" && resultData) {
    return (
      <ResultsScreen
        resultData={resultData}
        onHome={() => navigate("/HomePage")}
        onAnalysis={() => navigate("/UserAllAnalysis")}
      />
    );
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

const InstructionsScreen = ({ examName, blueprint, durMin, onStart }) => {
  const [agreed, setAgreed] = useState(false);
  return (
    <div className="min-h-screen bg-[#0A0D14] text-white px-6 py-12">
      <div className="max-w-3xl mx-auto bg-[#111827] border border-gray-800 rounded-2xl p-8">
        <h1 className="text-2xl font-bold mb-1">{blueprint.blueprintName}</h1>
        <p className="text-gray-400 text-sm mb-6">{examName}</p>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
          <Stat label="Questions" value={blueprint.totalQuestions} />
          <Stat label="Duration" value={`${durMin} min`} />
          <Stat label="Marks / Q" value={`+${blueprint.marksPerQuestion}`} />
          <Stat
            label="Negative"
            value={blueprint.negativeMarking > 0 ? `-${blueprint.negativeMarking}` : "None"}
          />
        </div>

        <h3 className="text-sm font-semibold text-gray-300 mb-3">Subjects</h3>
        <div className="space-y-2 mb-8">
          {blueprint.subjects.map((s, i) => (
            <div
              key={i}
              className="flex justify-between items-center bg-[#1F2937] border border-gray-800 rounded-lg px-4 py-2 text-sm"
            >
              <span>{s.subjectName}</span>
              <span className="text-gray-400">{s.questionCount} sawaal</span>
            </div>
          ))}
        </div>

        <h3 className="text-sm font-semibold text-gray-300 mb-3">Instructions</h3>
        <ul className="text-sm text-gray-400 space-y-1.5 mb-8 list-disc list-inside">
          <li>Timer khatam hote hi test apne aap submit ho jayega.</li>
          <li>Har sahi jawab ke {blueprint.marksPerQuestion} marks milenge.</li>
          {blueprint.negativeMarking > 0 && (
            <li>Har galat jawab ke {blueprint.negativeMarking} marks katenge.</li>
          )}
          <li>Test ke beech mein page reload ya close na karein.</li>
          <li>Kisi bhi sawaal ko "Mark for Review" karke baad mein wapas aa sakte hain.</li>
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
          Test Shuru Karein
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
  mockData,
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
  onMarkAndNext,
  onPrev,
  onNext,
  onSubmitClick,
  showSubmitConfirm,
  onCancelSubmit,
  onConfirmSubmit,
  submitting,
}) => {
  const subject = mockData.subjects[activeSubjectIdx];
  const selected = answers[currentQuestion._id];
  const timeLow = remainingSeconds <= 300;

  return (
    <div className="min-h-screen bg-[#0A0D14] text-white flex flex-col">
      {/* Top bar */}
      <div className="flex items-center justify-between px-4 sm:px-6 py-3 border-b border-gray-800 bg-[#0A0D14] sticky top-0 z-10">
        <div className="flex items-center gap-2 min-w-0">
          <span className="font-semibold text-sm sm:text-base truncate">{mockData.blueprintName}</span>
          {mockData.isPersonalized && (
            <span className="hidden sm:inline text-[10px] px-2 py-0.5 rounded-full bg-[#7C3AED]/20 text-[#A78BFA] flex-shrink-0">
              Personalized
            </span>
          )}
        </div>
        <div className="flex items-center gap-4 flex-shrink-0">
          <span
            className={`text-sm font-mono px-3 py-1 rounded-lg border ${
              timeLow
                ? "border-red-500 text-red-400 bg-red-500/10"
                : "border-gray-700 text-gray-200 bg-[#111827]"
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

      {/* Subject tabs */}
      <div className="flex gap-2 px-4 sm:px-6 py-3 overflow-x-auto border-b border-gray-800">
        {mockData.subjects.map((s, i) => (
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
        {/* Main question panel */}
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
              onClick={onMarkAndNext}
              className="px-4 py-2 rounded-lg border border-purple-700 text-sm text-purple-300 hover:border-purple-500"
            >
              Mark for Review &amp; Next
            </button>
            <button
              onClick={onNext}
              className="ml-auto px-5 py-2 rounded-lg bg-[#7C3AED] hover:bg-[#6D28D9] text-sm font-medium"
            >
              Save &amp; Next
            </button>
          </div>
        </div>

        {/* Palette sidebar */}
        <div className="w-full lg:w-72 bg-[#111827] border border-gray-800 rounded-2xl p-5 h-fit">
          <div className="grid grid-cols-2 gap-2 text-[11px] mb-5">
            <LegendItem colorClass="bg-green-500" label="Answered" count={summary.answered} />
            <LegendItem colorClass="bg-red-500" label="Not Answered" count={summary.notAnswered} />
            <LegendItem colorClass="bg-purple-500" label="Marked" count={summary.markedCount} />
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
            <h3 className="text-lg font-semibold mb-4">Test submit karein?</h3>
            <div className="space-y-1.5 text-sm text-gray-400 mb-6">
              <p>
                Answered: <span className="text-green-400">{summary.answered}</span>
              </p>
              <p>
                Not Answered: <span className="text-red-400">{summary.notAnswered}</span>
              </p>
              <p>
                Marked for Review: <span className="text-purple-400">{summary.markedCount}</span>
              </p>
              <p>
                Not Visited: <span className="text-gray-300">{summary.notVisited}</span>
              </p>
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

const ResultsScreen = ({ resultData, onHome, onAnalysis }) => {
  const { scoreDetails, subjectAnalysis } = resultData;
  return (
    <div className="min-h-screen bg-[#0A0D14] text-white px-6 py-12">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-2xl font-bold mb-1">Test Complete!</h1>
        <p className="text-gray-400 text-sm mb-8">Aapka result neeche hai</p>

        <div className="bg-[#111827] border border-gray-800 rounded-2xl p-8 text-center mb-6">
          <p className="text-5xl font-bold text-[#A78BFA]">{scoreDetails.totalScore}</p>
          <p className="text-sm text-gray-500 mt-1">Total Score</p>
        </div>

        <div className="grid grid-cols-3 gap-4 mb-8">
          <Stat label="Correct" value={scoreDetails.correct} />
          <Stat label="Wrong" value={scoreDetails.wrong} />
          <Stat label="Unattempted" value={scoreDetails.unattempted} />
        </div>

        <h3 className="text-sm font-semibold text-gray-300 mb-3">Subject-wise Breakdown</h3>
        <div className="space-y-2 mb-10">
          {subjectAnalysis.map((s, i) => (
            <div
              key={i}
              className="flex justify-between items-center bg-[#1F2937] border border-gray-800 rounded-lg px-4 py-3 text-sm"
            >
              <span>{s.subjectName}</span>
              <span className="text-gray-400">
                {s.accuracy}% accuracy &middot; {s.correctCount}/{s.totalQuestions}
              </span>
            </div>
          ))}
        </div>

        <div className="flex gap-3">
          <button
            onClick={onHome}
            className="flex-1 py-3 rounded-lg border border-gray-700 text-sm font-medium text-gray-300 hover:border-gray-500"
          >
            Home
          </button>
          <button
            onClick={onAnalysis}
            className="flex-1 py-3 rounded-lg bg-[#7C3AED] hover:bg-[#6D28D9] text-sm font-medium"
          >
            Detailed Analysis Dekhein
          </button>
        </div>
      </div>
    </div>
  );
};

export default MockTest;