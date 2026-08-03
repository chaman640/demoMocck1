import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api/api";
import BottomNav from "../components/BottomNav";

const SkeletonBlock = ({ className = "" }) => (
  <div className={`bg-gray-800/70 rounded animate-pulse ${className}`} />
);

const MyBatchSkeleton = () => (
  <div className="min-h-screen bg-[#0A0D14] text-white px-6 py-12 pb-24">
    <div className="max-w-lg mx-auto">
      <SkeletonBlock className="w-24 h-4 mb-6" />
      <SkeletonBlock className="w-48 h-7 mb-2" />
      <SkeletonBlock className="w-64 h-4 mb-8" />
      <SkeletonBlock className="w-full h-40 rounded-2xl" />
    </div>
  </div>
);

const MyBatch = () => {
  const navigate = useNavigate();

  const [phase, setPhase] = useState("loading"); // loading | enrolled | not-enrolled | redeeming | error
  const [errorMsg, setErrorMsg] = useState("");
  const [batch, setBatch] = useState(null);
  const [examName, setExamName] = useState("");

  const [couponCode, setCouponCode] = useState("");
  const [redeemError, setRedeemError] = useState("");
  const [redeemLoading, setRedeemLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");

  const loadBatch = async () => {
    setPhase("loading");
    try {
      const meRes = await api.get("/me");
      setExamName(meRes.data.data.exam);

      const res = await api.get("/my-batch");
      if (res.data.enrolled) {
        setBatch(res.data.data);
        setPhase("enrolled");
      } else {
        setBatch(null);
        setPhase("not-enrolled");
      }
    } catch (err) {
      setErrorMsg(err.response?.data?.message || "Batch details load nahi ho paayi.");
      setPhase("error");
    }
  };

  useEffect(() => {
    loadBatch();
  }, []);

  const handleRedeem = async (e) => {
    e.preventDefault();
    setRedeemError("");
    if (!couponCode.trim()) {
      setRedeemError("Coupon code zaroori hai!");
      return;
    }

    setRedeemLoading(true);
    try {
      const res = await api.post("/redeem-coupon", { code: couponCode.trim() });
      setSuccessMsg(res.data.message || "Batch join ho gaya!");
      setCouponCode("");
      setTimeout(async () => {
        setSuccessMsg("");
        await loadBatch();
      }, 1500);
    } catch (err) {
      setRedeemError(err.response?.data?.message || "Coupon redeem nahi ho paaya.");
    } finally {
      setRedeemLoading(false);
    }
  };

  if (phase === "loading") return <MyBatchSkeleton />;

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
      <div className="max-w-lg mx-auto">
        <button
          onClick={() => navigate("/HomePage")}
          className="text-sm text-gray-400 hover:text-white mb-6 flex items-center gap-1"
        >
          &larr; Home
        </button>

        <h1 className="text-2xl font-bold mb-1">Meri Batch</h1>
        <p className="text-gray-400 text-sm mb-8">
          {phase === "enrolled"
            ? "Aap is batch mein enrolled hain"
            : `${examName} ke liye apni batch/teacher ka coupon code daalein`}
        </p>

        {successMsg && (
          <div className="mb-5 p-3.5 bg-green-500/10 text-green-400 border border-green-500/25 rounded-xl text-sm font-medium text-center">
            ✓ {successMsg}
          </div>
        )}

        {/* ── ENROLLED VIEW ── */}
        {phase === "enrolled" && batch && (
          <>
            <div className="bg-[#111827] border border-gray-800 rounded-2xl p-6 mb-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold">{batch.name}</h2>
                <span className="text-xs px-2.5 py-1 rounded-full bg-[#7C3AED]/20 text-[#A78BFA]">
                  {batch.exam}
                </span>
              </div>

              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500">Batch Code</span>
                  <span className="font-mono text-gray-200">{batch.code}</span>
                </div>
                {batch.mainTeacherName && (
                  <div className="flex justify-between">
                    <span className="text-gray-500">Main Teacher</span>
                    <span className="text-gray-200">{batch.mainTeacherName}</span>
                  </div>
                )}
                {batch.joinedAt && (
                  <div className="flex justify-between">
                    <span className="text-gray-500">Join Kiya</span>
                    <span className="text-gray-200">
                      {new Date(batch.joinedAt).toLocaleDateString("en-IN", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                    </span>
                  </div>
                )}
              </div>

              {batch.subjectCoverage && batch.subjectCoverage.length > 0 && (
                <div className="mt-5 pt-5 border-t border-gray-800">
                  <p className="text-xs text-gray-500 uppercase tracking-wide mb-3">
                    Subject-wise Teachers
                  </p>
                  <div className="space-y-2">
                    {batch.subjectCoverage.map((sc, i) => (
                      <div
                        key={i}
                        className="flex justify-between items-center bg-[#1F2937] rounded-lg px-3 py-2 text-sm"
                      >
                        <span className="text-gray-300">{sc.subject}</span>
                        <span className="text-gray-500">{sc.teacherName}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="space-y-3">
              <button
                onClick={() => navigate("/PreviousYearTests")}
                className="w-full py-3 rounded-lg bg-[#7C3AED] hover:bg-[#6D28D9] font-semibold"
              >
                Batch Papers Dekhein
              </button>
              <button
                onClick={() => setPhase("redeeming")}
                className="w-full py-3 rounded-lg border border-gray-700 text-gray-300 hover:border-gray-500"
              >
                Doosri Batch Join Karein
              </button>
            </div>
          </>
        )}

        {/* ── NOT ENROLLED / REDEEMING VIEW ── */}
        {(phase === "not-enrolled" || phase === "redeeming") && (
          <div className="bg-[#111827] border border-gray-800 rounded-2xl p-6">
            {phase === "redeeming" && (
              <p className="text-xs text-yellow-500 mb-4">
                Naya coupon redeem karne par aapki purani batch se link khatam ho jayega (data safe rahega).
              </p>
            )}

            {redeemError && (
              <div className="mb-4 p-3 bg-red-500/10 text-red-400 border border-red-500/25 rounded-xl text-sm text-center">
                {redeemError}
              </div>
            )}

            <form onSubmit={handleRedeem} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold mb-1.5 uppercase tracking-wide text-gray-400">
                  Coupon Code
                </label>
                <input
                  type="text"
                  value={couponCode}
                  onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                  placeholder="e.g. AB3XK9L2"
                  className="w-full px-4 py-2.5 text-sm bg-[#0A0D14] border border-gray-700 focus:border-[#7C3AED] rounded-xl outline-none transition-colors text-white placeholder-gray-600 font-mono tracking-wider"
                />
              </div>

              <button
                type="submit"
                disabled={redeemLoading}
                className="w-full py-3 rounded-lg bg-[#7C3AED] hover:bg-[#6D28D9] font-semibold disabled:opacity-50"
              >
                {redeemLoading ? "Join ho raha hai..." : "Batch Join Karein"}
              </button>

              {phase === "redeeming" && (
                <button
                  type="button"
                  onClick={() => {
                    setPhase("enrolled");
                    setRedeemError("");
                  }}
                  className="w-full py-3 rounded-lg border border-gray-700 text-gray-300"
                >
                  Cancel
                </button>
              )}
            </form>
          </div>
        )}
      </div>
      <BottomNav />
    </div>
  );
};

export default MyBatch;