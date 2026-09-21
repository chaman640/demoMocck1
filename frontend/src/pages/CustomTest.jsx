import React, { useState, useEffect, useRef, useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import api from "../api/api";

// ─────────────────────────────────────────────
// Custom (batch) tests are practice tools set by a teacher — not exam
// simulations. So this page works differently from the main Mock Test:
//   • No overall countdown timer and no time limit at all.
//   • Each question has its own stopwatch (counting UP) so the student
//     can see how long they're taking, and so the teacher can see it in
//     analytics later — but nothing here is timed out or penalized.
//   • Clicking "Save & Next" does NOT move to the next question. It
//     locks in the answer and immediately reveals whether it was
//     correct, plus the explanation. The button then turns into "Next"
//     (or "Finish Test" on the last question) to move forward.
//   • Progress still resumes after a refresh (localStorage), same as
//     before.
// ─────────────────────────────────────────────

const formatTime = (totalSeconds) => {
  const safe = Math.max(0, Math.floor(totalSeconds || 0));
  const m = Math.floor(safe / 60);
  const s = safe % 60;
  const pad = (n) => String(n).padStart(2, "0");
  return `${pad(m)}:${pad(s)}`;
};

const STATUS = {
  NOT_VISITED: "not-visited",
  UNCHECKED: "unchecked", // visited, has an answer selected, not yet checked
  CORRECT: "correct",
  WRONG: "wrong",
  SKIPPED: "skipped", // checked with no answer selected
};

const statusStyles = {
  [STATUS.NOT_VISITED]: "bg-[#1F2937] border-gray-700 text-gray-400",
  [STATUS.UNCHECKED]: "bg-amber-500/20 border-amber-500 text-amber-400",
  [STATUS.CORRECT]: "bg-green-500/20 border-green-500 text-green-400",
  [STATUS.WRONG]: "bg-red-500/20 border-red-500 text-red-400",
  [STATUS.SKIPPED]: "bg-gray-600/30 border-gray-600 text-gray-400",
};

const STATUS_FILTERS = [
  { key: "all", label: "All" },
  { key: "correct", label: "Correct" },
  { key: "wrong", label: "Wrong" },
  { key: "unattempted", label: "Unattempted" },
];

const getStorageKey = (userId, testId) => `activeCustomTest_${userId}_${testId}`;

const CustomTest = () => {
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
  const [revealed, setRevealed] = useState(() => new Set()); // 🆕 questions already checked
  const [timeSpent, setTimeSpent] = useState({});
  const [liveElapsed, setLiveElapsed] = useState(0); // 🆕 ticking seconds for the CURRENT unrevealed question
  const [showSubmitConfirm, setShowSubmitConfirm] = useState(false);
  const [resultData, setResultData] = useState(null);

  const questionStartRef = useRef(Date.now());
  const currentQIdRef = useRef(null);
  const submittingRef = useRef(false);

  // ── Init: resume a saved attempt or fetch a fresh test ──
  useEffect(() => {
    let cancelled = false;
    const init = async () => {
      setPhase("loading");
      try {
        const meRes = await api.get("/me");
        if (cancelled) return;
        const uid = meRes.data.data._id;
        setUserId(uid);

        const savedRaw = localStorage.getItem(getStorageKey(uid, testId));
        if (savedRaw) {
          try {
            const saved = JSON.parse(savedRaw);
            if (saved.testData) {
              setTestData(saved.testData);
              setAnswers(saved.answers || {});
              setVisited(new Set(saved.visited || []));
              setRevealed(new Set(saved.revealed || []));
              setTimeSpent(saved.timeSpent || {});
              setActiveSubjectIdx(saved.activeSubjectIdx || 0);
              setActiveQIdx(saved.activeQIdx || 0);

              const subj = saved.testData.subjects[saved.activeSubjectIdx || 0];
              const q = subj ? subj.questions[saved.activeQIdx || 0] : null;
              currentQIdRef.current = q ? q._id : null;
              questionStartRef.current = Date.now();
              submittingRef.current = false;

              setPhase("test");
              return;
            }
          } catch {
            localStorage.removeItem(getStorageKey(uid, testId));
          }
        }

        const res = await api.get(`/custom-test/${testId}`);
        if (cancelled) return;

        // Safety: an empty test shouldn't crash the page
        const subjects = (res.data.data.subjects || []).filter(
          (s) => s.questions && s.questions.length > 0
        );
        if (subjects.length === 0) {
          setErrorMsg("This test doesn't have any questions yet. Please contact your teacher.");
          setPhase("error");
          return;
        }

        setTestData({ ...res.data.data, subjects });
        setPhase("instructions");
      } catch (err) {
        if (cancelled) return;
        if (err.response?.status === 401) {
          navigate("/Login");
          return;
        }
        setErrorMsg(err.response?.data?.message || "Could not load the test.");
        setPhase("error");
      }
    };
    init();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [testId]);

  const startTest = () => {
    setAnswers({});
    setVisited(new Set());
    setRevealed(new Set());
    setTimeSpent({});
    setActiveSubjectIdx(0);
    setActiveQIdx(0);
    submittingRef.current = false;

    const firstQ = testData.subjects[0].questions[0];
    currentQIdRef.current = firstQ._id;
    questionStartRef.current = Date.now();
    setVisited(new Set([firstQ._id]));
    setLiveElapsed(0);

    setPhase("test");
  };

  // 🆕 Freezes the stopwatch for a question — called the moment it's
  // checked/revealed, so time keeps counting only while the student is
  // actually deciding on an answer.
  const freezeTime = (qId) => {
    if (!qId) return;
    const elapsed = Math.round((Date.now() - questionStartRef.current) / 1000);
    if (elapsed > 0) {
      setTimeSpent((prev) => ({ ...prev, [qId]: (prev[qId] || 0) + elapsed }));
    }
  };

  const goToQuestion = (subjectIdx, qIdx) => {
    if (!testData) return;
    const q = testData.subjects[subjectIdx].questions[qIdx];
    currentQIdRef.current = q ? q._id : null;
    questionStartRef.current = Date.now();
    setLiveElapsed(0);
    setActiveSubjectIdx(subjectIdx);
    setActiveQIdx(qIdx);
    if (q) {
      setVisited((prev) => new Set(prev).add(q._id));
    }
  };

  const currentSubject = testData ? testData.subjects[activeSubjectIdx] : null;
  const currentQuestion = currentSubject ? currentSubject.questions[activeQIdx] : null;
  const isCurrentRevealed = currentQuestion ? revealed.has(currentQuestion._id) : false;

  // 🆕 Live-ticking stopwatch — only runs while the current question has
  // not yet been checked. Purely informational, never limits anything.
  useEffect(() => {
    if (phase !== "test" || isCurrentRevealed) return;
    const interval = setInterval(() => {
      setLiveElapsed(Math.round((Date.now() - questionStartRef.current) / 1000));
    }, 1000);
    return () => clearInterval(interval);
  }, [phase, isCurrentRevealed, currentQuestion?._id]);

  const selectAnswer = (optionNum) => {
    if (!currentQuestion || isCurrentRevealed) return;
    setAnswers((prev) => ({ ...prev, [currentQuestion._id]: String(optionNum) }));
  };

  const clearResponse = () => {
    if (!currentQuestion || isCurrentRevealed) return;
    setAnswers((prev) => {
      const next = { ...prev };
      delete next[currentQuestion._id];
      return next;
    });
  };

  // 🆕 Core of the new flow — locks the answer in and reveals whether it
  // was correct, right here on the same question (no navigation yet).
  const checkAnswer = () => {
    if (!currentQuestion || isCurrentRevealed) return;
    freezeTime(currentQuestion._id);
    setRevealed((prev) => new Set(prev).add(currentQuestion._id));
  };

  const isLastQuestion =
    testData &&
    activeSubjectIdx === testData.subjects.length - 1 &&
    activeQIdx === currentSubject.questions.length - 1;

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

  const getStatus = (qId, correctOption) => {
    if (revealed.has(qId)) {
      if (answers[qId] === undefined) return STATUS.SKIPPED;
      return Number(answers[qId]) === correctOption ? STATUS.CORRECT : STATUS.WRONG;
    }
    if (answers[qId] !== undefined) return STATUS.UNCHECKED;
    return STATUS.NOT_VISITED;
  };

  const summary = useMemo(() => {
    if (!testData) return { total: 0, checked: 0, correct: 0, wrong: 0, skipped: 0, remaining: 0 };
    let total = 0, checked = 0, correct = 0, wrong = 0, skipped = 0;
    testData.subjects.forEach((subj) => {
      subj.questions.forEach((q) => {
        total++;
        const st = getStatus(q._id, q.correctOption);
        if (st === STATUS.CORRECT) { checked++; correct++; }
        else if (st === STATUS.WRONG) { checked++; wrong++; }
        else if (st === STATUS.SKIPPED) { checked++; skipped++; }
      });
    });
    return { total, checked, correct, wrong, skipped, remaining: total - checked };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [answers, revealed, testData]);

  // ── localStorage checkpoint ──
  useEffect(() => {
    if (phase !== "test" || !testData || !userId) return;
    try {
      localStorage.setItem(
        getStorageKey(userId, testId),
        JSON.stringify({
          testData,
          answers,
          visited: [...visited],
          revealed: [...revealed],
          timeSpent,
          activeSubjectIdx,
          activeQIdx,
        })
      );
    } catch (err) {
      console.error("Could not save custom test progress:", err);
    }
  }, [phase, testData, answers, visited, revealed, timeSpent, activeSubjectIdx, activeQIdx, userId, testId]);

  const handleSubmit = async () => {
    if (!testData || submittingRef.current) return;
    submittingRef.current = true;
    if (currentQuestion && !isCurrentRevealed) freezeTime(currentQuestion._id);
    setPhase("submitting");
    try {
      const attemptedQuestions = testData.subjects.flatMap((subj) =>
        subj.questions.map((q) => ({
          questionId: q._id,
          userAnswer: answers[q._id] || null,
          timeTakenInSeconds: timeSpent[q._id] || 0,
        }))
      );

      const res = await api.post(`/custom-test/${testId}/submit`, { attemptedQuestions });

      localStorage.removeItem(getStorageKey(userId, testId));

      setResultData(res.data.data);
      setPhase("result");
    } catch (err) {
      submittingRef.current = false;
      setErrorMsg(err.response?.data?.message || "Submission failed.");
      setPhase("error");
    }
  };

  // ────────────────────────────── RENDER ──────────────────────────────

  if (phase === "loading" || phase === "submitting") {
    return (
      <div className="min-h-screen bg-[#0A0D14] text-white flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-gray-700 border-t-[#8B5CF6] rounded-full animate-spin" />
          <p className="text-gray-400 text-sm">
            {phase === "submitting" ? "Submitting..." : "Loading test..."}
          </p>
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
            onClick={() => navigate("/CustomTests")}
            className="px-5 py-2 rounded-lg bg-[#7C3AED] hover:bg-[#6D28D9] text-sm font-medium"
          >
            All Batch Tests
          </button>
        </div>
      </div>
    );
  }

  if (phase === "instructions" && testData) {
    return <InstructionsScreen testData={testData} onStart={startTest} onBack={() => navigate("/CustomTests")} />;
  }

  if (phase === "test" && testData && currentQuestion) {
    const selected = answers[currentQuestion._id];
    const isCorrectSelected = isCurrentRevealed && Number(selected) === currentQuestion.correctOption;

    return (
      <div className="min-h-screen bg-[#0A0D14] text-white flex flex-col">
        <div className="flex items-center justify-between px-4 sm:px-6 py-3 border-b border-gray-800 bg-[#0A0D14] sticky top-0 z-10">
          <div className="flex items-center gap-2 min-w-0">
            <span className="font-semibold text-sm sm:text-base truncate">{testData.testName}</span>
            <span className="hidden sm:inline text-[10px] px-2 py-0.5 rounded-full bg-[#7C3AED]/20 text-[#A78BFA] flex-shrink-0">
              Practice Mode
            </span>
          </div>
          <div className="flex items-center gap-4 flex-shrink-0">
            {/* 🆕 Per-question stopwatch — counts UP, purely informational, never limits anything */}
            <span className="flex items-center gap-1.5 text-sm font-mono px-3 py-1 rounded-lg border border-gray-700 text-gray-300 bg-[#111827]">
              <span className="w-1.5 h-1.5 rounded-full bg-[#A78BFA] animate-pulse" />
              {formatTime(isCurrentRevealed ? timeSpent[currentQuestion._id] || 0 : liveElapsed)}
            </span>
            <button
              onClick={() => setShowSubmitConfirm(true)}
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
              onClick={() => goToQuestion(i, 0)}
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
              Question {activeQIdx + 1} of {currentSubject.questions.length} &middot;{" "}
              {currentSubject.subjectName}
            </p>
            <p className="text-base sm:text-lg mb-4 leading-relaxed">{currentQuestion.question}</p>

            {currentQuestion.questionPhoto && (
              <img
                src={currentQuestion.questionPhoto}
                alt="Question"
                className="w-full max-h-72 object-contain rounded-lg mb-5 bg-black/20"
              />
            )}

            <div className="space-y-3 mb-6">
              {[1, 2, 3, 4].map((n) => {
                const optText = currentQuestion[`option${n}`];
                const isSelected = selected === String(n);
                const isCorrectOpt = currentQuestion.correctOption === n;

                // 🆕 Once revealed: correct option always green; a wrong
                // pick is shown in red; everything else stays neutral.
                let style = "border-gray-800 bg-[#1F2937] text-gray-300";
                if (isCurrentRevealed) {
                  if (isCorrectOpt) style = "border-green-500/60 bg-green-500/10 text-green-300";
                  else if (isSelected) style = "border-red-500/60 bg-red-500/10 text-red-300";
                  else style = "border-gray-800 bg-[#1F2937]/50 text-gray-500";
                } else if (isSelected) {
                  style = "border-[#7C3AED] bg-[#7C3AED]/15 text-white";
                }

                return (
                  <button
                    key={n}
                    onClick={() => selectAnswer(n)}
                    disabled={isCurrentRevealed}
                    className={`w-full text-left px-4 py-3 rounded-xl border transition-colors flex items-center gap-3 ${style} ${
                      isCurrentRevealed ? "cursor-default" : "hover:border-gray-600"
                    }`}
                  >
                    <span
                      className={`w-6 h-6 flex-shrink-0 rounded-full border flex items-center justify-center text-xs ${
                        isSelected && !isCurrentRevealed
                          ? "border-[#A78BFA] bg-[#7C3AED] text-white"
                          : "border-gray-600 text-gray-500"
                      }`}
                    >
                      {n}
                    </span>
                    <span className="flex-1">{optText}</span>
                    {isCurrentRevealed && isCorrectOpt && <span className="text-xs flex-shrink-0">✅ Correct answer</span>}
                    {isCurrentRevealed && isSelected && !isCorrectOpt && <span className="text-xs flex-shrink-0">❌ Your answer</span>}
                  </button>
                );
              })}
            </div>

            {/* 🆕 Immediate feedback panel — appears right after "Save & Next" is clicked */}
            {isCurrentRevealed && (
              <div className={`rounded-xl border p-4 mb-6 ${isCorrectSelected ? "border-green-500/30 bg-green-500/5" : selected ? "border-red-500/30 bg-red-500/5" : "border-gray-700 bg-gray-500/5"}`}>
                <p className={`text-sm font-semibold mb-2 ${isCorrectSelected ? "text-green-400" : selected ? "text-red-400" : "text-gray-400"}`}>
                  {isCorrectSelected ? "✅ Correct!" : selected ? "❌ Incorrect" : "⚠️ You skipped this question"}
                </p>
                {currentQuestion.answerExplain && (
                  <>
                    <p className="text-xs font-semibold tracking-wider text-purple-400 uppercase mb-1.5">Explanation</p>
                    <p className="text-sm text-gray-300 leading-relaxed">{currentQuestion.answerExplain}</p>
                  </>
                )}
                {currentQuestion.answerExplainWithPhoto && (
                  <img src={currentQuestion.answerExplainWithPhoto} alt="Explanation" className="mt-3 max-w-full rounded-lg border border-gray-700" />
                )}
                {currentQuestion.askedIn && (
                  <span className="inline-block mt-3 px-2.5 py-1 rounded-full text-[11px] font-medium bg-[#A78BFA]/10 text-[#A78BFA] border border-[#A78BFA]/25">
                    📌 {currentQuestion.askedIn}
                  </span>
                )}
              </div>
            )}

            <div className="mt-auto flex flex-wrap gap-3">
              <button
                onClick={goPrev}
                className="px-4 py-2 rounded-lg border border-gray-700 text-sm text-gray-300 hover:border-gray-500"
              >
                Previous
              </button>
              {!isCurrentRevealed && (
                <button
                  onClick={clearResponse}
                  className="px-4 py-2 rounded-lg border border-gray-700 text-sm text-gray-300 hover:border-gray-500"
                >
                  Clear Response
                </button>
              )}

              {/* 🆕 The core new behaviour: check → reveal, then a separate click to advance */}
              {!isCurrentRevealed ? (
                <button
                  onClick={checkAnswer}
                  className="ml-auto px-5 py-2 rounded-lg bg-[#7C3AED] hover:bg-[#6D28D9] text-sm font-medium"
                >
                  Save &amp; Next
                </button>
              ) : (
                <button
                  onClick={isLastQuestion ? () => setShowSubmitConfirm(true) : goNext}
                  className="ml-auto px-5 py-2 rounded-lg bg-[#7C3AED] hover:bg-[#6D28D9] text-sm font-medium"
                >
                  {isLastQuestion ? "Finish Test" : "Next →"}
                </button>
              )}
            </div>
          </div>

          <div className="w-full lg:w-72 bg-[#111827] border border-gray-800 rounded-2xl p-5 h-fit">
            <div className="grid grid-cols-1 gap-2 text-[11px] mb-5">
              <div className="flex items-center gap-1.5 text-gray-400">
                <span className="w-2.5 h-2.5 rounded-full bg-green-500" /> Correct ({summary.correct})
              </div>
              <div className="flex items-center gap-1.5 text-gray-400">
                <span className="w-2.5 h-2.5 rounded-full bg-red-500" /> Wrong ({summary.wrong})
              </div>
              <div className="flex items-center gap-1.5 text-gray-400">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500" /> Answered, Not Checked
              </div>
              <div className="flex items-center gap-1.5 text-gray-400">
                <span className="w-2.5 h-2.5 rounded-full bg-gray-600" /> Not Visited
              </div>
            </div>
            <div className="grid grid-cols-5 gap-2">
              {currentSubject.questions.map((q, i) => (
                <button
                  key={q._id}
                  onClick={() => goToQuestion(activeSubjectIdx, i)}
                  className={`w-9 h-9 rounded-lg border text-xs font-medium flex items-center justify-center transition-all ${
                    statusStyles[
                      visited.has(q._id) || answers[q._id] !== undefined || revealed.has(q._id)
                        ? getStatus(q._id, q.correctOption)
                        : STATUS.NOT_VISITED
                    ]
                  } ${i === activeQIdx ? "ring-2 ring-white/70" : ""}`}
                >
                  {i + 1}
                </button>
              ))}
            </div>
          </div>
        </div>

        {showSubmitConfirm && (
          <div className="fixed inset-0 bg-black/70 flex items-center justify-center px-6 z-20">
            <div className="bg-[#111827] border border-gray-800 rounded-2xl p-6 max-w-sm w-full">
              <h3 className="text-lg font-semibold mb-4">Submit the test?</h3>
              <div className="space-y-1.5 text-sm text-gray-400 mb-6">
                <p>
                  Correct: <span className="text-green-400">{summary.correct}</span>
                </p>
                <p>
                  Wrong: <span className="text-red-400">{summary.wrong}</span>
                </p>
                <p>
                  Not checked yet: <span className="text-gray-300">{summary.remaining}</span>
                </p>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowSubmitConfirm(false)}
                  className="flex-1 py-2 rounded-lg border border-gray-700 text-sm text-gray-300"
                >
                  Go Back
                </button>
                <button
                  onClick={handleSubmit}
                  className="flex-1 py-2 rounded-lg bg-[#7C3AED] hover:bg-[#6D28D9] text-sm font-medium"
                >
                  Yes, Submit
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  if (phase === "result" && resultData) {
    return (
      <div className="min-h-screen bg-[#0A0D14] text-white px-6 py-12">
        <div className="max-w-xl mx-auto">
          <h1 className="text-2xl font-bold mb-1">Test Complete! 🏁</h1>
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
              onClick={() => setPhase("review")}
              className="w-full py-3 rounded-lg bg-[#7C3AED] hover:bg-[#6D28D9] font-semibold"
            >
              Review Answers
            </button>
            <button
              onClick={() => {
                setResultData(null);
                setPhase("instructions");
              }}
              className="w-full py-3 rounded-lg border border-[#7C3AED] text-[#A78BFA] hover:bg-[#7C3AED]/10 font-semibold"
            >
              Retry Test
            </button>
            <button
              onClick={() => navigate("/CustomTests")}
              className="w-full py-3 rounded-lg border border-gray-700 text-gray-300"
            >
              All Batch Tests
            </button>
            <button
              onClick={() => navigate("/HomePage")}
              className="w-full py-3 rounded-lg border border-gray-700 text-gray-300"
            >
              Go Home
            </button>
          </div>
        </div>
      </div>
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

const InstructionsScreen = ({ testData, onStart, onBack }) => {
  const [agreed, setAgreed] = useState(false);
  return (
    <div className="min-h-screen bg-[#0A0D14] text-white px-6 py-12">
      <div className="max-w-3xl mx-auto bg-[#111827] border border-gray-800 rounded-2xl p-8">
        <button onClick={onBack} className="text-sm text-gray-400 hover:text-white mb-5">
          &larr; All Batch Tests
        </button>

        <div className="flex items-center gap-2 mb-1 flex-wrap">
          <h1 className="text-2xl font-bold">{testData.testName}</h1>
          <span className="text-xs px-2 py-1 rounded-full bg-[#7C3AED]/20 text-[#A78BFA]">
            Practice Mode
          </span>
        </div>
        <p className="text-gray-400 text-sm mb-6">{testData.examName}</p>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-8">
          <Stat label="Questions" value={testData.totalQuestions} />
          <Stat label="Marks / Question" value={`+${testData.marksPerQuestion}`} />
          <Stat
            label="Negative Marking"
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
              <span className="text-gray-400">{s.questions.length} questions</span>
            </div>
          ))}
        </div>

        <h3 className="text-sm font-semibold text-gray-300 mb-3">How This Test Works</h3>
        <ul className="text-sm text-gray-400 space-y-1.5 mb-8 list-disc list-inside">
          <li>This test was created by your teacher for practice — there is no overall time limit.</li>
          <li>Each question has its own stopwatch, just to track how long you take.</li>
          <li>After you answer, click "Save &amp; Next" to see immediately whether you were right, along with the explanation.</li>
          <li>Click "Next" to move on once you've reviewed the explanation.</li>
          <li>Each correct answer is worth {testData.marksPerQuestion} mark(s).</li>
          {testData.negativeMarking > 0 && (
            <li>Each wrong answer deducts {testData.negativeMarking} mark(s).</li>
          )}
          <li>If the page reloads, don't worry — the test resumes exactly where you left off.</li>
        </ul>

        <label className="flex items-center gap-2 mb-6 text-sm text-gray-300">
          <input
            type="checkbox"
            checked={agreed}
            onChange={(e) => setAgreed(e.target.checked)}
            className="w-4 h-4 accent-[#7C3AED]"
          />
          I have read all the instructions
        </label>

        <button
          onClick={onStart}
          disabled={!agreed}
          className={`w-full py-3 rounded-lg font-semibold transition-colors ${
            agreed ? "bg-[#7C3AED] hover:bg-[#6D28D9]" : "bg-gray-700 cursor-not-allowed text-gray-400"
          }`}
        >
          Start Test
        </button>
      </div>
    </div>
  );
};

const ReviewScreen = ({ attemptId, onBack }) => {
  const [subjectFilter, setSubjectFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [index, setIndex] = useState(0);

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["custom-test-attempt-detail", attemptId],
    queryFn: async () => {
      const res = await api.get(`/custom-test-attempt/${attemptId}`);
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
        <div className="w-10 h-10 border-4 border-gray-700 border-t-[#8B5CF6] rounded-full animate-spin" />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="min-h-screen bg-[#0A0D14] text-white flex items-center justify-center px-6">
        <div className="max-w-md text-center space-y-4">
          <p className="text-gray-300">
            {error?.response?.data?.message || "Could not load the data."}
          </p>
          <button
            onClick={onBack}
            className="px-5 py-2 rounded-lg bg-[#7C3AED] hover:bg-[#6D28D9] text-sm font-medium"
          >
            Go Back
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
          &larr; Back to Result
        </button>

        <h1 className="text-xl sm:text-2xl font-bold mb-1">Answer Review</h1>
        <p className="text-gray-400 text-sm mb-6">{data?.testName}</p>

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
              All Subjects
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
            No questions in this category.
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

      <div className="mb-6">
        <p className="text-base sm:text-lg leading-relaxed">{q.question}</p>
        {q.questionPhoto && (
          <img src={q.questionPhoto} alt="Question" className="mt-3 max-w-full rounded-lg border border-gray-800" />
        )}
        {q.askedIn && (
          <span className="inline-block mt-2 px-2.5 py-1 rounded-full text-[11px] font-medium bg-[#A78BFA]/10 text-[#A78BFA] border border-[#A78BFA]/25">
            📌 {q.askedIn}
          </span>
        )}
      </div>

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
              {isCorrectOpt && <span className="text-xs flex-shrink-0">✅ Correct answer</span>}
              {isUserPick && !isCorrectOpt && (
                <span className="text-xs flex-shrink-0">❌ Your answer</span>
              )}
            </div>
          );
        })}
      </div>

      {q.userAnswer == null && (
        <p className="text-xs text-yellow-500 mb-4">You did not attempt this question.</p>
      )}

      {q.timeTakenInSeconds != null && (
        <p className="text-xs text-gray-500 mb-4">Time taken: {q.timeTakenInSeconds}s</p>
      )}

      {q.answerExplain && (
        <div className="bg-[#1F2937]/50 border border-gray-700/50 rounded-lg p-4">
          <p className="text-xs font-semibold tracking-wider text-purple-400 uppercase mb-2">
            Explanation
          </p>
          <p className="text-sm text-gray-300 leading-relaxed">{q.answerExplain}</p>
          {q.answerExplainWithPhoto && (
            <img src={q.answerExplainWithPhoto} alt="Explanation" className="mt-3 max-w-full rounded-lg border border-gray-700" />
          )}
        </div>
      )}
    </div>
  );
};

export default CustomTest;
