import React, { useState, useEffect, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import api from "../api/api";

const formatTime = (totalSeconds) => {
  const safe = Math.max(0, Math.floor(totalSeconds || 0));
  const m = Math.floor(safe / 60);
  const s = safe % 60;
  const pad = (n) => String(n).padStart(2, "0");
  return `${pad(m)}:${pad(s)}`;
};

// 👇 NAYA: localStorage key + helpers — create-flow mein har page
// change/reload pe NAYA challenge generate na ho, isliye cache karte hain
const getChallengeStorageKey = (userId) => `activeChallenge_${userId}`;

const readCachedChallenge = (userId) => {
  try {
    const raw = localStorage.getItem(getChallengeStorageKey(userId));
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed?.expiresAt && new Date(parsed.expiresAt) < new Date()) {
      localStorage.removeItem(getChallengeStorageKey(userId));
      return null;
    }
    return parsed;
  } catch (err) {
    return null;
  }
};

const saveCachedChallenge = (userId, challengeData) => {
  try {
    localStorage.setItem(getChallengeStorageKey(userId), JSON.stringify(challengeData));
  } catch (err) {
    console.error("Challenge data save nahi ho paayi:", err);
  }
};

// ──────────────────────────────────────────────
// 👇 NAYA: Skeleton loading building blocks — spinner ki jagah
// ──────────────────────────────────────────────
const SkeletonBlock = ({ className = "" }) => (
  <div className={`bg-gray-800/70 rounded animate-pulse ${className}`} />
);

// Create-flow: challenge auto-generate hote waqt — "created" card jaisa shape
const CreateFlowSkeleton = () => (
  <div className="min-h-screen bg-[#0A0D14] text-white flex items-center justify-center px-6">
    <div className="max-w-md w-full bg-[#111827] border border-gray-800 rounded-2xl p-8 text-center">
      <SkeletonBlock className="w-16 h-16 rounded-full mx-auto mb-4" />
      <SkeletonBlock className="w-48 h-6 mx-auto mb-3" />
      <SkeletonBlock className="w-56 h-4 mx-auto mb-6" />
      <SkeletonBlock className="w-full h-12 rounded-lg mb-4" />
      <SkeletonBlock className="w-full h-12 rounded-lg mb-3" />
      <SkeletonBlock className="w-full h-12 rounded-lg mb-3" />
      <SkeletonBlock className="w-full h-12 rounded-lg" />
    </div>
  </div>
);

// Join-flow: challenge details load hote waqt — "instructions" card jaisa shape
const JoinFlowSkeleton = () => (
  <div className="min-h-screen bg-[#0A0D14] text-white px-6 py-12">
    <div className="max-w-2xl mx-auto bg-[#111827] border border-gray-800 rounded-2xl p-8">
      <SkeletonBlock className="w-64 h-7 mb-2" />
      <SkeletonBlock className="w-48 h-4 mb-6" />
      <div className="grid grid-cols-3 gap-4 mb-8">
        {[1, 2, 3].map((i) => (
          <div key={i} className="bg-[#1F2937] rounded-xl p-4">
            <SkeletonBlock className="w-10 h-6 mx-auto mb-2" />
            <SkeletonBlock className="w-14 h-3 mx-auto" />
          </div>
        ))}
      </div>
      <SkeletonBlock className="w-full h-4 mb-2" />
      <SkeletonBlock className="w-3/4 h-4 mb-8" />
      <SkeletonBlock className="w-full h-12 rounded-lg" />
    </div>
  </div>
);

// Submit ho raha hai — "result" screen jaisa shape
const SubmittingSkeleton = () => (
  <div className="min-h-screen bg-[#0A0D14] text-white px-6 py-12">
    <div className="max-w-xl mx-auto text-center">
      <SkeletonBlock className="w-56 h-7 mx-auto mb-2" />
      <SkeletonBlock className="w-40 h-4 mx-auto mb-8" />
      <div className="bg-[#111827] border border-gray-800 rounded-2xl p-8 mb-6">
        <SkeletonBlock className="w-24 h-12 mx-auto mb-2" />
        <SkeletonBlock className="w-20 h-3 mx-auto" />
      </div>
      <SkeletonBlock className="w-full h-24 rounded-2xl mb-8" />
      <div className="grid grid-cols-3 gap-4">
        {[1, 2, 3].map((i) => (
          <SkeletonBlock key={i} className="h-16 rounded-xl" />
        ))}
      </div>
    </div>
  </div>
);

// Leaderboard load ho raha hai
const LeaderboardSkeleton = () => (
  <div className="min-h-screen bg-[#0A0D14] text-white px-6 py-12">
    <div className="max-w-xl mx-auto">
      <SkeletonBlock className="w-40 h-7 mb-2" />
      <SkeletonBlock className="w-56 h-4 mb-8" />
      <div className="space-y-3">
        {[1, 2, 3, 4, 5].map((i) => (
          <SkeletonBlock key={i} className="w-full h-16 rounded-xl" />
        ))}
      </div>
    </div>
  </div>
);

const Challenge = () => {
  const navigate = useNavigate();
  const { code } = useParams(); // agar URL mein code hai to "join" flow, warna "create" flow

  const [phase, setPhase] = useState("loading");
  const [errorMsg, setErrorMsg] = useState("");
  const [userName, setUserName] = useState("");
  const [copied, setCopied] = useState(false);

  // ── Create-flow state ──
  const [createdChallenge, setCreatedChallenge] = useState(null);

  // ── Join/Test-flow state ──
  const [challengeMeta, setChallengeMeta] = useState(null);
  const [activeSubjectIdx, setActiveSubjectIdx] = useState(0);
  const [activeQIdx, setActiveQIdx] = useState(0);
  const [answers, setAnswers] = useState({});
  const [timeSpent, setTimeSpent] = useState({});
  const [remainingSeconds, setRemainingSeconds] = useState(0);
  const [endTimestamp, setEndTimestamp] = useState(null);
  const [resultData, setResultData] = useState(null);
  const [leaderboard, setLeaderboard] = useState(null);

  const questionStartRef = useRef(Date.now());
  const currentQIdRef = useRef(null);
  const submittingRef = useRef(false);

  // Join-flow ke URL wale `code` ya create-flow ke `createdChallenge.challengeCode` —
  // dono situations mein "abhi active challenge kaunsa hai" yahi se pata chalega
  const activeCode = code || createdChallenge?.challengeCode || null;

  // ── Step 1: Init — decide karo create-flow ya join-flow ──
  useEffect(() => {
    let cancelled = false;
    const init = async () => {
      try {
        const meRes = await api.get("/me");
        if (cancelled) return;
        const me = meRes.data.data;
        setUserName(me.name);

        if (code) {
          // ── JOIN FLOW: kisi ne link bheja hai ──
          const chRes = await api.get(`/challenge/${code}`);
          if (cancelled) return;
          const data = chRes.data.data;
          setChallengeMeta(data);

          if (data.alreadyAttempted) {
            setPhase("leaderboard-loading");
            await loadLeaderboard(code);
            if (cancelled) return;
            setPhase("leaderboard");
          } else {
            setPhase("instructions");
          }
        } else {
          // ── CREATE FLOW: pehle localStorage check karo — pehle se bana
          // challenge mile (aur expire na hua ho) to usi ko dikhao, naya mat banao
          const cached = readCachedChallenge(me._id);
          if (cached) {
            setCreatedChallenge(cached);
            setPhase("created");
            return;
          }

          // Cache khali hai — exam khud user ke profile se lo, blueprint
          // khud pick karo (Full mock priority), aur seedha challenge bana do
          const bpRes = await api.get(`/blueprints/${encodeURIComponent(me.exam)}`);
          if (cancelled) return;
          const list = bpRes.data.data || [];

          if (list.length === 0) {
            throw new Error("Aapke exam ke liye abhi koi mock test available nahi hai.");
          }

          const chosenBlueprint = list.find((b) => b.mockType === "Full") || list[0];

          const createRes = await api.post("/create-challenge", {
            examName: me.exam,
            blueprintName: chosenBlueprint.blueprintName,
          });
          if (cancelled) return;

          const newChallenge = createRes.data.data;
          saveCachedChallenge(me._id, newChallenge);
          setCreatedChallenge(newChallenge);
          setPhase("created");
        }
      } catch (err) {
        if (!cancelled) {
          setErrorMsg(err.response?.data?.message || err.message);
          setPhase("error");
        }
      }
    };
    init();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [code]);

  // ── Creator khud bhi test dena chahta hai ──
  const startOwnAttempt = async () => {
    if (!createdChallenge) return;
    setPhase("loading");
    try {
      const chRes = await api.get(`/challenge/${createdChallenge.challengeCode}`);
      const data = chRes.data.data;
      setChallengeMeta(data);

      if (data.alreadyAttempted) {
        setPhase("leaderboard-loading");
        await loadLeaderboard(createdChallenge.challengeCode);
        setPhase("leaderboard");
      } else {
        setPhase("instructions");
      }
    } catch (err) {
      setErrorMsg(err.response?.data?.message || "Challenge load nahi ho paaya.");
      setPhase("error");
    }
  };

  // ── Test start karo (join-flow / own-attempt dono) ──
  const startChallengeTest = () => {
    setAnswers({});
    setTimeSpent({});
    setActiveSubjectIdx(0);
    setActiveQIdx(0);
    submittingRef.current = false;

    const firstQ = challengeMeta.subjects[0].questions[0];
    currentQIdRef.current = firstQ._id;
    questionStartRef.current = Date.now();

    const totalSeconds = challengeMeta.durationMinutes * 60;
    setEndTimestamp(Date.now() + totalSeconds * 1000);
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

  const goToQuestion = (subjIdx, qIdx) => {
    flushTime();
    const q = challengeMeta.subjects[subjIdx].questions[qIdx];
    currentQIdRef.current = q ? q._id : null;
    setActiveSubjectIdx(subjIdx);
    setActiveQIdx(qIdx);
  };

  const currentSubject = challengeMeta ? challengeMeta.subjects[activeSubjectIdx] : null;
  const currentQuestion = currentSubject ? currentSubject.questions[activeQIdx] : null;

  const selectAnswer = (n) => {
    if (!currentQuestion) return;
    setAnswers((prev) => ({ ...prev, [currentQuestion._id]: String(n) }));
  };

  const goNext = () => {
    const subj = challengeMeta.subjects[activeSubjectIdx];
    if (activeQIdx < subj.questions.length - 1) {
      goToQuestion(activeSubjectIdx, activeQIdx + 1);
    } else if (activeSubjectIdx < challengeMeta.subjects.length - 1) {
      goToQuestion(activeSubjectIdx + 1, 0);
    }
  };

  const goPrev = () => {
    if (activeQIdx > 0) {
      goToQuestion(activeSubjectIdx, activeQIdx - 1);
    } else if (activeSubjectIdx > 0) {
      const prevSubj = challengeMeta.subjects[activeSubjectIdx - 1];
      goToQuestion(activeSubjectIdx - 1, prevSubj.questions.length - 1);
    }
  };

  const loadLeaderboard = async (challengeCode) => {
    try {
      const res = await api.get(`/challenge/${challengeCode}/leaderboard`);
      setLeaderboard(res.data.data);
    } catch (err) {
      // silently fail — leaderboard optional hai result ke saath
    }
  };

  const handleSubmit = async () => {
    if (!challengeMeta || submittingRef.current) return;
    submittingRef.current = true;
    flushTime();
    setPhase("submitting");
    try {
      const attemptedQuestions = challengeMeta.subjects.flatMap((subj) =>
        subj.questions.map((q) => ({
          questionId: q._id,
          userAnswer: answers[q._id] || null,
          timeTakenInSeconds: timeSpent[q._id] || 0,
        }))
      );

      const res = await api.post(`/challenge/${activeCode}/submit`, { attemptedQuestions });
      setResultData(res.data.data);
      await loadLeaderboard(activeCode);
      setPhase("result");
    } catch (err) {
      // Agar already-attempted error aaye, seedha leaderboard dikha do
      if (err.response?.status === 409) {
        setPhase("leaderboard-loading");
        await loadLeaderboard(activeCode);
        setPhase("leaderboard");
      } else {
        setErrorMsg(err.response?.data?.message || "Submit fail ho gaya.");
        setPhase("error");
      }
    }
  };

  // ── Countdown timer ──
  useEffect(() => {
    if (phase !== "test") return;
    if (remainingSeconds <= 0) {
      const t = setTimeout(() => handleSubmit(), 0);
      return () => clearTimeout(t);
    }
    const t = setTimeout(() => {
      if (endTimestamp) {
        setRemainingSeconds(Math.max(0, Math.round((endTimestamp - Date.now()) / 1000)));
      } else {
        setRemainingSeconds((s) => Math.max(0, s - 1));
      }
    }, 1000);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, remainingSeconds, endTimestamp]);

  const copyLink = () => {
    const link = `${window.location.origin}${window.location.pathname}#/Challenge/${createdChallenge.challengeCode}`;
    navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // ────────────────────────────── RENDER ──────────────────────────────

  if (phase === "loading") {
    return code || createdChallenge ? <JoinFlowSkeleton /> : <CreateFlowSkeleton />;
  }

  if (phase === "leaderboard-loading") {
    return <LeaderboardSkeleton />;
  }

  if (phase === "submitting") {
    return <SubmittingSkeleton />;
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

  // ── Challenge ban gaya — 3 options: Copy Link / Khud Test Dein / Home ──
  if (phase === "created" && createdChallenge) {
    const shareLink = `${window.location.origin}${window.location.pathname}#/Challenge/${createdChallenge.challengeCode}`;
    return (
      <div className="min-h-screen bg-[#0A0D14] text-white flex items-center justify-center px-6">
        <div className="max-w-md w-full bg-[#111827] border border-gray-800 rounded-2xl p-8 text-center">
          <div className="w-16 h-16 mx-auto rounded-full bg-green-500/10 text-green-400 flex items-center justify-center text-3xl mb-4">
            🎉
          </div>
          <h2 className="text-xl font-bold mb-2">Challenge Taiyaar Hai!</h2>
          <p className="text-gray-400 text-sm mb-6">
            {createdChallenge.examName} — {createdChallenge.blueprintName} &middot; {createdChallenge.totalQuestions} sawaal
          </p>

          <div className="bg-[#1F2937] border border-gray-700 rounded-lg p-3 mb-6 text-sm break-all text-gray-300">
            {shareLink}
          </div>

          <button
            onClick={copyLink}
            className="w-full py-3 rounded-lg bg-[#7C3AED] hover:bg-[#6D28D9] font-semibold mb-3"
          >
            {copied ? "Link Copy Ho Gaya ✓" : "Link Copy Karein"}
          </button>
          <button
            onClick={startOwnAttempt}
            className="w-full py-3 rounded-lg border border-gray-700 hover:border-gray-500 text-gray-200 font-semibold mb-3"
          >
            Khud Mock Test Dein
          </button>
          <button
            onClick={() => navigate("/HomePage")}
            className="w-full py-3 rounded-lg border border-gray-700 text-gray-300"
          >
            Home Jaayein
          </button>
        </div>
      </div>
    );
  }

  // ── Instructions dikhao (join-flow ya creator ka khud ka attempt, dono ke liye) ──
  if (phase === "instructions" && challengeMeta) {
    return (
      <div className="min-h-screen bg-[#0A0D14] text-white px-6 py-12">
        <div className="max-w-2xl mx-auto bg-[#111827] border border-gray-800 rounded-2xl p-8">
          <h1 className="text-2xl font-bold mb-1">Tumhe Challenge Mila Hai! ⚔️</h1>
          <p className="text-gray-400 text-sm mb-6">{challengeMeta.blueprintName} — {challengeMeta.examName}</p>

          <div className="grid grid-cols-3 gap-4 mb-8">
            <div className="bg-[#1F2937] rounded-xl p-4 text-center">
              <p className="text-xl font-bold">{challengeMeta.totalQuestions}</p>
              <p className="text-[11px] text-gray-500 mt-1">Questions</p>
            </div>
            <div className="bg-[#1F2937] rounded-xl p-4 text-center">
              <p className="text-xl font-bold">{challengeMeta.durationMinutes} min</p>
              <p className="text-[11px] text-gray-500 mt-1">Duration</p>
            </div>
            <div className="bg-[#1F2937] rounded-xl p-4 text-center">
              <p className="text-xl font-bold">+{challengeMeta.marksPerQuestion}</p>
              <p className="text-[11px] text-gray-500 mt-1">Marks/Q</p>
            </div>
          </div>

          <p className="text-sm text-gray-400 mb-8">
            Ye test sirf ek baar diya ja sakta hai. Submit karte hi tumhara score leaderboard mein sabke saamne aa jayega.
          </p>

          <button
            onClick={startChallengeTest}
            className="w-full py-3 rounded-lg bg-[#7C3AED] hover:bg-[#6D28D9] font-semibold"
          >
            Challenge Accept Karo — Test Shuru Karo
          </button>
        </div>
      </div>
    );
  }

  // ── TEST SCREEN ──
  if (phase === "test" && challengeMeta && currentQuestion) {
    const subject = challengeMeta.subjects[activeSubjectIdx];
    const selected = answers[currentQuestion._id];
    const timeLow = remainingSeconds <= 60;

    return (
      <div className="min-h-screen bg-[#0A0D14] text-white flex flex-col">
        <div className="flex items-center justify-between px-4 sm:px-6 py-3 border-b border-gray-800 sticky top-0 bg-[#0A0D14] z-10">
          <span className="font-semibold text-sm sm:text-base">{challengeMeta.blueprintName}</span>
          <span
            className={`text-sm font-mono px-3 py-1 rounded-lg border ${
              timeLow ? "border-red-500 text-red-400 bg-red-500/10" : "border-gray-700 text-gray-200 bg-[#111827]"
            }`}
          >
            {formatTime(remainingSeconds)}
          </span>
        </div>

        <div className="flex gap-2 px-4 sm:px-6 py-3 overflow-x-auto border-b border-gray-800">
          {challengeMeta.subjects.map((s, i) => (
            <button
              key={s.subjectName}
              onClick={() => goToQuestion(i, 0)}
              className={`px-4 py-1.5 rounded-full text-sm whitespace-nowrap ${
                i === activeSubjectIdx ? "bg-[#7C3AED] text-white" : "bg-[#111827] border border-gray-800 text-gray-400"
              }`}
            >
              {s.subjectName}
            </button>
          ))}
        </div>

        <div className="flex-1 px-4 sm:px-6 py-6">
          <div className="max-w-2xl mx-auto bg-[#111827] border border-gray-800 rounded-2xl p-6">
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
                    onClick={() => selectAnswer(n)}
                    className={`w-full text-left px-4 py-3 rounded-xl border flex items-center gap-3 ${
                      isSelected
                        ? "border-[#7C3AED] bg-[#7C3AED]/15 text-white"
                        : "border-gray-800 bg-[#1F2937] text-gray-300"
                    }`}
                  >
                    <span
                      className={`w-6 h-6 flex-shrink-0 rounded-full border flex items-center justify-center text-xs ${
                        isSelected ? "border-[#A78BFA] bg-[#7C3AED] text-white" : "border-gray-600 text-gray-500"
                      }`}
                    >
                      {n}
                    </span>
                    <span>{optText}</span>
                  </button>
                );
              })}
            </div>

            <div className="flex flex-wrap gap-3">
              <button onClick={goPrev} className="px-4 py-2 rounded-lg border border-gray-700 text-sm text-gray-300">
                Previous
              </button>
              <button onClick={goNext} className="px-4 py-2 rounded-lg border border-gray-700 text-sm text-gray-300">
                Next
              </button>
              <button
                onClick={handleSubmit}
                className="ml-auto px-5 py-2 rounded-lg bg-[#7C3AED] hover:bg-[#6D28D9] text-sm font-medium"
              >
                Submit Karo
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── RESULT SCREEN — score + rank ──
  if (phase === "result" && resultData) {
    return (
      <div className="min-h-screen bg-[#0A0D14] text-white px-6 py-12">
        <div className="max-w-xl mx-auto text-center">
          <h1 className="text-2xl font-bold mb-1">Challenge Complete! 🏁</h1>
          <p className="text-gray-400 text-sm mb-8">Dekho tum kahan khade ho</p>

          <div className="bg-[#111827] border border-gray-800 rounded-2xl p-8 mb-6">
            <p className="text-5xl font-bold text-[#A78BFA]">{resultData.totalScore}</p>
            <p className="text-sm text-gray-500 mt-1">Total Score</p>
          </div>

          <div className="bg-gradient-to-r from-[#7C3AED] to-[#6D28D9] rounded-2xl p-6 mb-8">
            <p className="text-3xl font-bold">#{resultData.currentRank}</p>
            <p className="text-sm text-white/80 mt-1">
              {resultData.totalParticipants} logo mein se aapki rank
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

          <button
            onClick={() => setPhase("leaderboard")}
            className="w-full py-3 rounded-lg bg-[#7C3AED] hover:bg-[#6D28D9] font-semibold mb-3"
          >
            Poora Leaderboard Dekho
          </button>
          <button
            onClick={() => navigate("/HomePage")}
            className="w-full py-3 rounded-lg border border-gray-700 text-gray-300"
          >
            Home Jaayein
          </button>
        </div>
      </div>
    );
  }

  // ── LEADERBOARD SCREEN ──
  if (phase === "leaderboard") {
    return (
      <div className="min-h-screen bg-[#0A0D14] text-white px-6 py-12">
        <div className="max-w-xl mx-auto">
          <h1 className="text-2xl font-bold mb-1">Leaderboard 🏆</h1>
          <p className="text-gray-400 text-sm mb-8">
            {leaderboard?.challenge?.blueprintName} &middot; {leaderboard?.totalParticipants || 0} participants
          </p>

          {!leaderboard || leaderboard.leaderboard.length === 0 ? (
            <p className="text-gray-400 text-sm">Abhi tak koi attempt nahi hua.</p>
          ) : (
            <div className="space-y-3">
              {leaderboard.leaderboard.map((entry) => (
                <div
                  key={entry.userId}
                  className={`flex items-center justify-between px-5 py-4 rounded-xl border ${
                    entry.userName === userName
                      ? "border-[#7C3AED] bg-[#7C3AED]/10"
                      : "border-gray-800 bg-[#111827]"
                  }`}
                >
                  <div className="flex items-center gap-4">
                    <span
                      className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                        entry.rank === 1
                          ? "bg-yellow-500/20 text-yellow-400"
                          : entry.rank === 2
                          ? "bg-gray-400/20 text-gray-300"
                          : entry.rank === 3
                          ? "bg-orange-500/20 text-orange-400"
                          : "bg-gray-800 text-gray-500"
                      }`}
                    >
                      {entry.rank}
                    </span>
                    <span className="font-medium">{entry.userName}</span>
                  </div>
                  <span className="font-bold text-[#A78BFA]">{entry.totalScore}</span>
                </div>
              ))}
            </div>
          )}

          <button
            onClick={() => navigate("/HomePage")}
            className="w-full py-3 mt-8 rounded-lg border border-gray-700 text-gray-300"
          >
            Home Jaayein
          </button>
        </div>
      </div>
    );
  }

  return null;
};

export default Challenge;