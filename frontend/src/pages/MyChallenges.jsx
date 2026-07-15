import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api/api";

const SkeletonBlock = ({ className = "" }) => (
  <div className={`bg-gray-800/70 rounded animate-pulse ${className}`} />
);

const ListSkeleton = () => (
  <div className="min-h-screen bg-[#0A0D14] text-white px-6 py-12">
    <div className="max-w-2xl mx-auto">
      <SkeletonBlock className="w-32 h-4 mb-6" />
      <SkeletonBlock className="w-56 h-7 mb-8" />
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="bg-[#111827] border border-gray-800 rounded-2xl p-5">
            <SkeletonBlock className="w-40 h-5 mb-2" />
            <SkeletonBlock className="w-32 h-3 mb-1" />
            <SkeletonBlock className="w-28 h-3" />
          </div>
        ))}
      </div>
    </div>
  </div>
);

const LeaderboardSkeleton = () => (
  <div className="min-h-screen bg-[#0A0D14] text-white px-6 py-12">
    <div className="max-w-xl mx-auto">
      <SkeletonBlock className="w-32 h-4 mb-6" />
      <SkeletonBlock className="w-48 h-6 mb-2" />
      <SkeletonBlock className="w-40 h-4 mb-8" />
      <div className="space-y-2.5">
        {[1, 2, 3, 4].map((i) => (
          <SkeletonBlock key={i} className="w-full h-16 rounded-xl" />
        ))}
      </div>
    </div>
  </div>
);

// ── Rank list — Challenge.jsx wale LeaderboardList jaisa hi pattern ──
const LeaderboardList = ({ leaderboard, currentUserName }) => {
  if (!leaderboard || leaderboard.leaderboard.length === 0) {
    return <p className="text-gray-400 text-sm text-center py-6">Abhi tak koi attempt nahi hua.</p>;
  }
  return (
    <div className="space-y-2.5">
      {leaderboard.leaderboard.map((entry) => {
        const isMe = entry.userName === currentUserName;
        return (
          <div
            key={entry.userId}
            className={`flex items-center justify-between px-4 py-3.5 rounded-xl border transition-colors ${
              isMe ? "border-[#7C3AED] bg-[#7C3AED]/10" : "border-gray-800 bg-[#1F2937]/60"
            }`}
          >
            <div className="flex items-center gap-3.5 min-w-0">
              <span
                className={`w-8 h-8 flex-shrink-0 rounded-full flex items-center justify-center text-xs font-bold ${
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
              <div className="min-w-0">
                <p className="font-medium text-sm truncate">
                  {entry.userName} {isMe && <span className="text-[#A78BFA]">(Aap)</span>}
                </p>
                <p className="text-[11px] text-gray-500 mt-0.5">
                  {entry.correctCount} sahi &middot; {entry.wrongCount} galat
                </p>
              </div>
            </div>
            <span className="font-bold text-[#A78BFA] flex-shrink-0 ml-2">{entry.totalScore}</span>
          </div>
        );
      })}
    </div>
  );
};

const MyChallenges = () => {
  const navigate = useNavigate();

  // phase: "loading-list" | "list" | "loading-leaderboard" | "leaderboard" | "error"
  const [phase, setPhase] = useState("loading-list");
  const [errorMsg, setErrorMsg] = useState("");

  const [challenges, setChallenges] = useState([]);
  const [userName, setUserName] = useState("");

  const [selectedChallenge, setSelectedChallenge] = useState(null);
  const [leaderboard, setLeaderboard] = useState(null);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setPhase("loading-list");
      try {
        const [meRes, listRes] = await Promise.all([api.get("/me"), api.get("/my-challenges")]);
        if (cancelled) return;
        setUserName(meRes.data.data.name);
        setChallenges(listRes.data.data || []);
        setPhase("list");
      } catch (err) {
        if (cancelled) return;
        if (err.response?.status === 401) {
          navigate("/Singup");
          return;
        }
        setErrorMsg(err.response?.data?.message || "Challenges load nahi ho paaye.");
        setPhase("error");
      }
    };
    load();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const openChallenge = async (challenge) => {
    setSelectedChallenge(challenge);
    setPhase("loading-leaderboard");
    try {
      const res = await api.get(`/challenge/${challenge.challengeCode}/leaderboard`);
      setLeaderboard(res.data.data);
      setPhase("leaderboard");
    } catch (err) {
      // 7 din baad Challenge document apne aap delete ho jaata hai (TTL) — tab ye 404 dega
      setErrorMsg(
        err.response?.status === 404
          ? "Ye challenge expire ho chuka hai, ab iska data available nahi hai."
          : err.response?.data?.message || "Leaderboard load nahi ho paaya."
      );
      setPhase("error");
    }
  };

  const backToList = () => {
    setSelectedChallenge(null);
    setLeaderboard(null);
    setPhase("list");
  };

  const goToPerformance = () => {
    if (!selectedChallenge) return;
    navigate(`/Challenge/${selectedChallenge.challengeCode}/review`);
  };

  if (phase === "loading-list") return <ListSkeleton />;
  if (phase === "loading-leaderboard") return <LeaderboardSkeleton />;

  if (phase === "error") {
    return (
      <div className="min-h-screen bg-[#0A0D14] text-white flex items-center justify-center px-6">
        <div className="max-w-md text-center space-y-4">
          <p className="text-gray-300">{errorMsg}</p>
          <div className="flex gap-3 justify-center">
            {selectedChallenge && (
              <button
                onClick={backToList}
                className="px-5 py-2 rounded-lg border border-gray-700 text-sm text-gray-300 hover:border-gray-500"
              >
                List Par Wapas
              </button>
            )}
            <button
              onClick={() => navigate("/HomePage")}
              className="px-5 py-2 rounded-lg bg-[#7C3AED] hover:bg-[#6D28D9] text-sm font-medium"
            >
              Home Jaayein
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (phase === "list") {
    return (
      <div className="min-h-screen bg-[#0A0D14] text-white px-6 py-12">
        <div className="max-w-2xl mx-auto">
          <button
            onClick={() => navigate("/HomePage")}
            className="text-sm text-gray-400 hover:text-white mb-6 flex items-center gap-1"
          >
            &larr; Home
          </button>

          <h1 className="text-2xl font-bold mb-1">Aapke Challenges</h1>
          <p className="text-gray-400 text-sm mb-8">
            {challenges.length === 0
              ? "Aapne abhi tak koi challenge attempt nahi kiya hai."
              : `Aapne ab tak ${challenges.length} challenge${challenges.length > 1 ? "s" : ""} diye hain`}
          </p>

          {challenges.length === 0 ? (
            <button
              onClick={() => navigate("/Challenge")}
              className="w-full py-3 rounded-lg bg-[#7C3AED] hover:bg-[#6D28D9] font-semibold"
            >
              Ek Challenge Shuru Karein
            </button>
          ) : (
            <div className="space-y-3">
              {challenges.map((c) => (
                <button
                  key={c.challengeCode}
                  onClick={() => openChallenge(c)}
                  className="w-full text-left bg-[#111827] border border-gray-800 hover:border-[#7C3AED]/60 rounded-2xl p-5 transition-colors"
                >
                  <div className="flex items-center justify-between gap-3 mb-2">
                    <h3 className="font-semibold text-base truncate">{c.blueprintName}</h3>
                    <span className="text-sm font-bold text-[#A78BFA] flex-shrink-0">{c.totalScore}</span>
                  </div>
                  <p className="text-xs text-gray-500">
                    {c.examName} &middot; Banaya: {c.createdByName}
                    {c.createdByName === userName ? " (Aap)" : ""}
                  </p>
                  <p className="text-xs text-gray-600 mt-1">
                    {new Date(c.attemptedAt).toLocaleString("en-IN", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  if (phase === "leaderboard" && selectedChallenge && leaderboard) {
    return (
      <div className="min-h-screen bg-[#0A0D14] text-white px-6 py-12">
        <div className="max-w-xl mx-auto">
          <button
            onClick={backToList}
            className="text-sm text-gray-400 hover:text-white mb-6 flex items-center gap-1"
          >
            &larr; Sabhi Challenges
          </button>

          <h1 className="text-2xl font-bold mb-1">Leaderboard 🏆</h1>
          <p className="text-gray-400 text-sm mb-8">
            {leaderboard.challenge?.blueprintName} &middot; {leaderboard.totalParticipants} participants
          </p>

          <LeaderboardList leaderboard={leaderboard} currentUserName={userName} />

          <div className="space-y-3 mt-8">
            <button
              onClick={goToPerformance}
              className="w-full py-3 rounded-lg bg-[#7C3AED] hover:bg-[#6D28D9] font-semibold"
            >
              See Your Performance
            </button>
            <button
              onClick={() => navigate("/HomePage")}
              className="w-full py-3 rounded-lg border border-gray-700 text-gray-300"
            >
              Home Jaayein
            </button>
          </div>
        </div>
      </div>
    );
  }

  return null;
};

export default MyChallenges;