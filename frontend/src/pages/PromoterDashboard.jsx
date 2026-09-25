import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import api from "../api/api";

const SkeletonBlock = ({ className = "" }) => (
  <div className={`bg-gray-800/70 rounded animate-pulse ${className}`} />
);

const StatCard = ({ label, value }) => (
  <div className="bg-[#111827] border border-gray-800 rounded-2xl p-4">
    <p className="text-[11px] text-gray-500 uppercase tracking-wide mb-1">{label}</p>
    <p className="text-2xl font-bold text-white">{value}</p>
  </div>
);

const PromoterDashboard = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [copied, setCopied] = useState(false);

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ["promoter-dashboard"],
    queryFn: async () => {
      const res = await api.get("/promoter/dashboard");
      return res.data.data;
    },
    retry: (failureCount, err) => err?.response?.status !== 401 && failureCount < 1,
  });

  React.useEffect(() => {
    if (error?.response?.status === 401) navigate("/PromoterLogin");
  }, [error, navigate]);

  React.useEffect(() => {
    if (data?.mustChangePassword) navigate("/PromoterChangePassword");
  }, [data, navigate]);

  const handleLogout = async () => {
    try { await api.post("/promoter-logout"); } catch {}
    queryClient.clear();
    navigate("/PromoterLogin");
  };

  const copyLink = () => {
    if (!data?.referralLink) return;
    navigator.clipboard.writeText(data.referralLink).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#0A0D14] text-white px-6 py-8">
        <div className="max-w-2xl mx-auto space-y-4">
          <SkeletonBlock className="w-48 h-7" />
          <SkeletonBlock className="w-full h-40 rounded-2xl" />
        </div>
      </div>
    );
  }

  if (isError || !data) {
    if (error?.response?.status === 401) return null;
    return (
      <div className="min-h-screen bg-[#0A0D14] text-white flex items-center justify-center px-6">
        <div className="max-w-md text-center space-y-4">
          <p className="text-gray-300">{error?.response?.data?.message || "Dashboard load nahi ho paya."}</p>
          <button onClick={() => refetch()} className="px-5 py-2 rounded-lg bg-[#7C3AED] hover:bg-[#6D28D9] text-sm font-medium">
            Dobara Try Karein
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0A0D14] text-white px-4 sm:px-6 py-6 pb-16">
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-gray-500">Welcome back,</p>
            <h1 className="text-xl sm:text-2xl font-bold">{data.name}</h1>
          </div>
          <button
            onClick={handleLogout}
            className="text-xs px-3 py-2 rounded-lg border border-red-500/30 text-red-400 hover:bg-red-500/10"
          >
            Logout
          </button>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <StatCard label="Total Students" value={data.totalStudents} />
          <StatCard label="Pending Questions" value={data.pendingQuestionsCount} />
          <StatCard label="Total Questions (all time)" value={data.totalQuestionsAllTime} />
          <StatCard label="Your Code" value={data.code} />
        </div>

        <div className="bg-[#111827] border border-gray-800 rounded-2xl p-4">
          <h3 className="font-semibold text-sm mb-2">Aapka Signup Link</h3>
          <p className="text-[11px] text-gray-500 mb-3">
            Ye link students ko bhejein — wo is se signup karenge to seedhe aapke naam par jud jayenge.
          </p>
          <div className="flex items-center gap-2">
            <div className="flex-1 min-w-0 px-3 py-2.5 bg-[#0A0D14] border border-gray-700 rounded-xl text-xs text-gray-300 truncate">
              {data.referralLink}
            </div>
            <button
              onClick={copyLink}
              className="px-3 py-2.5 rounded-xl bg-[#7C3AED] hover:bg-[#6D28D9] text-xs font-semibold flex-shrink-0"
            >
              {copied ? "Copied!" : "Copy"}
            </button>
          </div>
        </div>

        <div className="bg-[#111827] border border-gray-800 rounded-2xl overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-800">
            <h3 className="font-semibold text-sm">Payment History</h3>
          </div>
          {data.paymentHistory?.length > 0 ? (
            <div className="divide-y divide-gray-800">
              {[...data.paymentHistory].reverse().map((entry, idx) => (
                <div key={idx} className="flex items-center justify-between px-4 py-3">
                  <div>
                    <p className="text-sm text-white">{new Date(entry.settledAt).toLocaleDateString()}</p>
                    <p className="text-[11px] text-gray-500">{entry.questionsSettled} questions settle hui</p>
                    {entry.note && <p className="text-[11px] text-gray-600 mt-0.5">{entry.note}</p>}
                  </div>
                  <span className="text-sm font-semibold text-[#A78BFA]">₹{entry.amount}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-gray-500 px-4 py-6 text-center">Abhi tak koi hisab settle nahi hua hai.</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default PromoterDashboard;
