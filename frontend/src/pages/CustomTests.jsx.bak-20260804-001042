import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api/api";
import BottomNav from "../components/BottomNav";

// ─────────────────────────────────────────────
// NAYA PAGE — "Batch Tests" (Custom Tests) ki list
//
// KYUN BANAYA: backend mein teacher ke custom tests ke saare routes pehle se
// the (/custom-tests/:examName, /custom-test/:testId, submit, attempt-detail),
// aur teacher TeacherCustomTests.jsx se test bana bhi sakta tha —
// lekin STUDENT ke liye koi page hi nahi tha. Matlab teacher ka banaya
// test kabhi kisi student tak pahunchta hi nahi tha (dead-end feature).
// ─────────────────────────────────────────────

const SkeletonBlock = ({ className = "" }) => (
  <div className={`bg-gray-800/70 rounded animate-pulse ${className}`} />
);

const ListSkeleton = () => (
  <div className="min-h-screen bg-[#0A0D14] text-white px-6 py-12 pb-24">
    <div className="max-w-2xl mx-auto">
      <SkeletonBlock className="w-24 h-4 mb-6" />
      <SkeletonBlock className="w-56 h-7 mb-2" />
      <SkeletonBlock className="w-44 h-4 mb-8" />
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
    <BottomNav />
  </div>
);

const CustomTests = () => {
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

        const res = await api.get(`/custom-tests/${encodeURIComponent(exam)}`);
        if (cancelled) return;
        setTests(res.data.data || []);
        setPhase("list");
      } catch (err) {
        if (cancelled) return;
        if (err.response?.status === 401) {
          navigate("/Login");
          return;
        }
        setErrorMsg(err.response?.data?.message || "Batch tests load nahi ho paaye.");
        setPhase("error");
      }
    };
    load();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (phase === "loading") return <ListSkeleton />;

  if (phase === "error") {
    return (
      <div className="min-h-screen bg-[#0A0D14] text-white flex items-center justify-center px-6 pb-24">
        <div className="max-w-md text-center space-y-4">
          <p className="text-gray-300">{errorMsg}</p>
          <button
            onClick={() => navigate("/HomePage")}
            className="px-5 py-2 rounded-lg bg-[#7C3AED] hover:bg-[#6D28D9] text-sm font-medium"
          >
            Home Jaayein
          </button>
        </div>
        <BottomNav />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0A0D14] text-white px-6 py-12 pb-24">
      <div className="max-w-2xl mx-auto">
        <button
          onClick={() => navigate("/HomePage")}
          className="text-sm text-gray-400 hover:text-white mb-6 flex items-center gap-1"
        >
          &larr; Home
        </button>

        <h1 className="text-2xl font-bold mb-1">Batch Tests</h1>
        <p className="text-gray-400 text-sm mb-8">
          {tests.length === 0
            ? `${examName} — aapki batch ke liye abhi koi test nahi bana.`
            : `Aapke teacher ke banaye ${tests.length} test${tests.length > 1 ? "s" : ""}`}
        </p>

        {tests.length === 0 ? (
          <div className="bg-[#111827] border border-gray-800 rounded-2xl p-6 text-center">
            <div className="text-3xl mb-3">📋</div>
            <p className="text-sm text-gray-400 mb-5">
              Ye tests sirf batch (coupon) ke students ke liye hote hain. Agar aapne
              abhi tak koi coupon code redeem nahi kiya hai, to pehle apni batch join karein.
            </p>
            <button
              onClick={() => navigate("/MyBatch")}
              className="w-full py-3 rounded-lg bg-[#7C3AED] hover:bg-[#6D28D9] font-semibold mb-3"
            >
              Meri Batch / Coupon Redeem
            </button>
            <button
              onClick={() => navigate("/HomePage")}
              className="w-full py-3 rounded-lg border border-gray-700 text-gray-300"
            >
              Home Jaayein
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {tests.map((t) => (
              <button
                key={t.testId}
                onClick={() => navigate(`/CustomTest/${t.testId}`)}
                className="w-full text-left bg-[#111827] border border-gray-800 hover:border-[#7C3AED]/60 rounded-2xl p-5 transition-colors"
              >
                <div className="flex items-center justify-between gap-3 mb-1.5">
                  <h3 className="font-semibold text-base truncate">{t.testName}</h3>
                  <span className="text-[10px] px-2 py-1 rounded-full bg-[#7C3AED]/20 text-[#A78BFA] flex-shrink-0">
                    Batch
                  </span>
                </div>
                <p className="text-xs text-gray-500">
                  {t.totalQuestions} sawaal &middot; {t.durationMinutes} min &middot;{" "}
                  {t.negativeMarking > 0
                    ? `-${t.negativeMarking} negative`
                    : "no negative marking"}
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
      <BottomNav />
    </div>
  );
};

export default CustomTests;
