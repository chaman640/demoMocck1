import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api/api";

const SkeletonBlock = ({ className = "" }) => (
  <div className={`bg-gray-800/70 rounded animate-pulse ${className}`} />
);

const ListSkeleton = () => (
  <div className="min-h-screen bg-[#0A0D14] text-white px-6 py-12">
    <div className="max-w-2xl mx-auto">
      <SkeletonBlock className="w-24 h-4 mb-6" />
      <SkeletonBlock className="w-64 h-7 mb-2" />
      <SkeletonBlock className="w-48 h-4 mb-8" />
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="bg-[#111827] border border-gray-800 rounded-2xl p-5">
            <SkeletonBlock className="w-40 h-5 mb-2" />
            <SkeletonBlock className="w-56 h-3 mb-3" />
            <SkeletonBlock className="w-32 h-3" />
          </div>
        ))}
      </div>
    </div>
  </div>
);

const PreviousYearTests = () => {
  const navigate = useNavigate();
  const [phase, setPhase] = useState("loading"); // loading | list | error
  const [errorMsg, setErrorMsg] = useState("");
  const [tests, setTests] = useState([]);
  const [examName, setExamName] = useState("");

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setPhase("loading");
      try {
        const meRes = await api.get("/me");
        if (cancelled) return;
        const exam = meRes.data.data.exam;
        setExamName(exam);

        const res = await api.get(`/previous-year-tests/${encodeURIComponent(exam)}`);
        if (cancelled) return;
        setTests(res.data.data || []);
        setPhase("list");
      } catch (err) {
        if (cancelled) return;
        if (err.response?.status === 401) {
          navigate("/Singup");
          return;
        }
        setErrorMsg(err.response?.data?.message || "Previous Year Tests load nahi ho paaye.");
        setPhase("error");
      }
    };
    load();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (phase === "loading") return <ListSkeleton />;

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

  return (
    <div className="min-h-screen bg-[#0A0D14] text-white px-6 py-12">
      <div className="max-w-2xl mx-auto">
        <button
          onClick={() => navigate("/HomePage")}
          className="text-sm text-gray-400 hover:text-white mb-6 flex items-center gap-1"
        >
          &larr; Home
        </button>

        <h1 className="text-2xl font-bold mb-1">Previous Year Papers</h1>
        <p className="text-gray-400 text-sm mb-8">
          {tests.length === 0
            ? `${examName} ke liye abhi koi previous year paper available nahi hai.`
            : `${examName} ke ${tests.length} paper${tests.length > 1 ? "s" : ""} available hain`}
        </p>

        {tests.length === 0 ? (
          <button
            onClick={() => navigate("/HomePage")}
            className="w-full py-3 rounded-lg border border-gray-700 text-gray-300"
          >
            Home Jaayein
          </button>
        ) : (
          <div className="space-y-3">
            {tests.map((t) => (
              <button
                key={t.testId}
                onClick={() => navigate(`/PreviousYearTest/${t.testId}`)}
                className="w-full text-left bg-[#111827] border border-gray-800 hover:border-[#7C3AED]/60 rounded-2xl p-5 transition-colors"
              >
                <div className="flex items-center justify-between gap-3 mb-1.5">
                  <h3 className="font-semibold text-base truncate">{t.testName}</h3>
                  <span className="text-xs px-2 py-1 rounded-full bg-[#7C3AED]/20 text-[#A78BFA] flex-shrink-0">
                    {t.year}
                  </span>
                </div>
                {t.description && (
                  <p className="text-xs text-gray-500 mb-2">{t.description}</p>
                )}
                <p className="text-xs text-gray-500">
                  {t.totalQuestions} sawaal &middot; {t.durationMinutes} min &middot;{" "}
                  {t.negativeMarking > 0 ? `-${t.negativeMarking} negative` : "no negative marking"}
                </p>
                {t.attemptsCount > 0 && (
                  <p className="text-xs text-[#A78BFA] mt-2">
                    {t.attemptsCount} baar diya &middot; Best Score: {t.bestScore}
                  </p>
                )}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default PreviousYearTests;