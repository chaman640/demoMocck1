import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../api/api";
import TeacherBottomNav from "../../components/TeacherBottomNav";
import ActiveCouponSwitcher from "../../components/ActiveCouponSwitcher";

const SkeletonBlock = ({ className = "" }) => (
  <div className={`bg-gray-800/70 rounded animate-pulse ${className}`} />
);

const DashboardSkeleton = () => (
  <div className="min-h-screen bg-[#0A0D14] text-white px-6 py-8 pb-24">
    <div className="max-w-3xl mx-auto space-y-6">
      <SkeletonBlock className="w-48 h-7" />
      <SkeletonBlock className="w-full h-16 rounded-xl" />
      <div className="grid grid-cols-2 gap-3">
        {[1, 2, 3, 4].map((i) => <SkeletonBlock key={i} className="h-20 rounded-2xl" />)}
      </div>
    </div>
  </div>
);

const StatCard = ({ label, value, sub }) => (
  <div className="bg-[#111827] border border-gray-800 rounded-2xl p-4">
    <p className="text-[11px] text-gray-500 uppercase tracking-wide mb-1">{label}</p>
    <p className="text-2xl font-bold text-white">{value}</p>
    {sub && <p className="text-[11px] text-gray-500 mt-0.5">{sub}</p>}
  </div>
);

const TeacherDashboard = () => {
  const navigate = useNavigate();
  const [phase, setPhase] = useState("loading");
  const [teacher, setTeacher] = useState(null);
  const [dashboard, setDashboard] = useState(null);
  const [errorMsg, setErrorMsg] = useState("");

  const load = useCallback(async () => {
    setPhase("loading");
    try {
      const [meRes, dashRes] = await Promise.all([
        api.get("/teacher-me"),
        api.get("/teacher/dashboard"),
      ]);
      setTeacher(meRes.data.data);
      setDashboard(dashRes.data.data);
      setPhase("view");
    } catch (err) {
      if (err.response?.status === 401) {
        navigate("/TeacherLogin");
        return;
      }
      setErrorMsg(err.response?.data?.message || "Dashboard load nahi ho paaya.");
      setPhase("error");
    }
  }, [navigate]);

  useEffect(() => { load(); }, [load]);

  const handleLogout = async () => {
    try { await api.post("/teacher-logout"); } catch {}
    navigate("/TeacherLogin");
  };

  if (phase === "loading") return <DashboardSkeleton />;

  if (phase === "error") {
    return (
      <div className="min-h-screen bg-[#0A0D14] text-white flex items-center justify-center px-6 pb-24">
        <div className="max-w-md text-center space-y-4">
          <p className="text-gray-300">{errorMsg}</p>
          <button onClick={load} className="px-5 py-2 rounded-lg bg-[#7C3AED] hover:bg-[#6D28D9] text-sm font-medium">
            Dobara Try Karein
          </button>
        </div>
        <TeacherBottomNav />
      </div>
    );
  }

  const isMain = dashboard.role === "main";

  return (
    <div className="min-h-screen bg-[#0A0D14] text-white px-4 sm:px-6 py-6 pb-24">
      <div className="max-w-3xl mx-auto space-y-6">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-gray-500">Welcome back,</p>
            <h1 className="text-xl sm:text-2xl font-bold">{dashboard.teacherName}</h1>
            <span className="inline-block mt-1 text-[10px] px-2 py-0.5 rounded-full bg-[#7C3AED]/20 text-[#A78BFA]">
              {isMain ? "Main Teacher" : "Sub Teacher"}
            </span>
          </div>
          <button
            onClick={handleLogout}
            className="text-xs px-3 py-2 rounded-lg border border-red-500/30 text-red-400 hover:bg-red-500/10"
          >
            Logout
          </button>
        </div>

        {/* Active Batch switcher */}
        <ActiveCouponSwitcher activeCouponId={teacher?.activeCoupon} onChanged={load} />

        {/* ── MAIN TEACHER VIEW ── */}
        {isMain && (
          <>
            <div className="grid grid-cols-2 gap-3">
              <StatCard label="Total Batches" value={dashboard.totalCoupons} />
              <StatCard label="Total Students" value={dashboard.totalStudents} />
              <StatCard
                label="Sub-Teachers"
                value={dashboard.totalSubTeachers.active}
                sub={dashboard.totalSubTeachers.pending > 0 ? `${dashboard.totalSubTeachers.pending} pending` : null}
              />
              <StatCard label="Questions Added" value={dashboard.totalQuestionsAdded} />
              <StatCard
                label="PYQ Papers"
                value={dashboard.previousYearPapers.total}
                sub={`${dashboard.previousYearPapers.complete} complete, ${dashboard.previousYearPapers.draft} draft`}
              />
              <StatCard label="Custom Tests" value={dashboard.totalCustomTests} />
            </div>

            {dashboard.coupons.length > 0 && (
              <div className="bg-[#111827] border border-gray-800 rounded-2xl overflow-hidden">
                <div className="px-4 py-3 border-b border-gray-800">
                  <h3 className="font-semibold text-sm">Aapke Batches</h3>
                </div>
                <div className="divide-y divide-gray-800">
                  {dashboard.coupons.map((c) => (
                    <div key={c.couponId} className="flex items-center justify-between px-4 py-3">
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-white truncate">{c.name}</p>
                        <p className="text-[11px] text-gray-500">{c.exam} &middot; {c.code}</p>
                      </div>
                      <span className="text-sm font-semibold text-[#A78BFA] flex-shrink-0 ml-2">
                        {c.studentCount} students
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}

        {/* ── SUB-TEACHER VIEW ── */}
        {!isMain && (
          <>
            <div className="grid grid-cols-2 gap-3">
              <StatCard label="Authorized Batches" value={dashboard.totalAuthorizedCoupons} />
              <StatCard label="Active Batch Students" value={dashboard.activeCouponStudentCount} />
              <StatCard label="Questions Added (by you)" value={dashboard.myContribution.questionsAdded} />
              <StatCard label="Custom Tests Created" value={dashboard.myContribution.customTestsCreated} />
            </div>

            {dashboard.coupons.length > 0 && (
              <div className="bg-[#111827] border border-gray-800 rounded-2xl overflow-hidden">
                <div className="px-4 py-3 border-b border-gray-800">
                  <h3 className="font-semibold text-sm">Aapke Authorized Batches</h3>
                </div>
                <div className="divide-y divide-gray-800">
                  {dashboard.coupons.map((c) => (
                    <div key={c.couponId} className="px-4 py-3">
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <p className="text-sm font-medium text-white truncate">{c.name}</p>
                        <span className="text-[10px] text-gray-500 flex-shrink-0">{c.exam}</span>
                      </div>
                      <p className="text-[11px] text-[#A78BFA]">{c.subjects.join(", ")}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}

        {/* Empty state */}
        {isMain && dashboard.totalCoupons === 0 && (
          <div className="bg-[#111827] border border-gray-800 rounded-2xl p-6 text-center">
            <p className="text-sm text-gray-400 mb-4">Shuru karne ke liye pehla batch/coupon banayein</p>
            <button
              onClick={() => navigate("/TeacherCoupons")}
              className="px-5 py-2.5 rounded-lg bg-[#7C3AED] hover:bg-[#6D28D9] text-sm font-medium"
            >
              Pehla Batch Banayein
            </button>
          </div>
        )}
      </div>
      <TeacherBottomNav />
    </div>
  );
};

export default TeacherDashboard;