import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../api/api";
import TeacherBottomNav from "../../components/TeacherBottomNav";

const SkeletonBlock = ({ className = "" }) => (
  <div className={`bg-gray-800/70 rounded animate-pulse ${className}`} />
);

const PageSkeleton = () => (
  <div className="min-h-screen bg-[#0A0D14] text-white px-4 sm:px-6 py-8 pb-24">
    <div className="max-w-xl mx-auto space-y-4">
      <SkeletonBlock className="w-24 h-24 rounded-full mx-auto" />
      <SkeletonBlock className="w-40 h-6 mx-auto" />
      <SkeletonBlock className="w-full h-32 rounded-2xl" />
      <SkeletonBlock className="w-full h-40 rounded-2xl" />
    </div>
  </div>
);

const initials = (name) =>
  (name || "?")
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join("");

const TeacherProfile = () => {
  const navigate = useNavigate();
  const [phase, setPhase] = useState("loading");
  const [teacher, setTeacher] = useState(null);
  const [coupons, setCoupons] = useState([]);
  const [errorMsg, setErrorMsg] = useState("");
  const [switchingId, setSwitchingId] = useState(null);
  const [loggingOut, setLoggingOut] = useState(false);

  const load = useCallback(async () => {
    setPhase("loading");
    try {
      const [meRes, couponsRes] = await Promise.all([
        api.get("/teacher-me"),
        api.get("/my-coupons"),
      ]);
      setTeacher(meRes.data.data);
      setCoupons(couponsRes.data.data || []);
      setPhase("view");
    } catch (err) {
      if (err.response?.status === 401) {
        navigate("/TeacherLogin");
        return;
      }
      setErrorMsg(err.response?.data?.message || "Profile load nahi ho paaya.");
      setPhase("error");
    }
  }, [navigate]);

  useEffect(() => { load(); }, [load]);

  const handleSwitch = async (couponId) => {
    setSwitchingId(couponId);
    try {
      await api.post("/switch-active-coupon", { couponId });
      await load();
    } catch (err) {
      alert(err.response?.data?.message || "Switch nahi ho paaya.");
    } finally {
      setSwitchingId(null);
    }
  };

  const handleLogout = async () => {
    setLoggingOut(true);
    try {
      await api.post("/teacher-logout");
    } catch {
      // logout backend fail ho bhi jaaye, phir bhi login page par bhej dete hain
    } finally {
      navigate("/TeacherLogin");
    }
  };

  if (phase === "loading") return <PageSkeleton />;

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

  const activeCoupon = coupons.find((c) => c._id === teacher.activeCoupon);

  return (
    <div className="min-h-screen bg-[#0A0D14] text-white px-4 sm:px-6 py-8 pb-24">
      <div className="max-w-xl mx-auto space-y-5">
        {/* ── Header card ── */}
        <div className="bg-gradient-to-br from-[#7C3AED]/20 to-transparent border border-[#7C3AED]/30 rounded-2xl p-6 text-center">
          <div className="w-20 h-20 mx-auto rounded-full bg-[#7C3AED] flex items-center justify-center text-2xl font-bold mb-3">
            {initials(teacher.name)}
          </div>
          <h1 className="text-xl font-bold">{teacher.name}</h1>
          <span className={`inline-block mt-2 px-3 py-1 rounded-full text-[11px] font-medium ${teacher.role === "main" ? "bg-[#7C3AED]/20 text-[#A78BFA]" : "bg-gray-700/40 text-gray-300"}`}>
            {teacher.role === "main" ? "Main Teacher" : "Sub-Teacher"}
          </span>
        </div>

        {/* ── Contact info ── */}
        <div className="bg-[#111827] border border-gray-800 rounded-2xl p-5 space-y-3">
          <p className="text-[11px] font-semibold tracking-wider text-gray-500 uppercase">Contact Info</p>
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-500">Email</span>
            <span className="text-gray-200 truncate ml-3">{teacher.email}</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-500">Phone</span>
            <span className="text-gray-200">{teacher.phone}</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-500">Status</span>
            <span className={teacher.status === "active" ? "text-green-400" : "text-amber-400"}>{teacher.status}</span>
          </div>
        </div>

        {/* ── Active batch + quick switch ── */}
        <div className="bg-[#111827] border border-gray-800 rounded-2xl p-5 space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-semibold tracking-wider text-gray-500 uppercase">Active Batch</p>
            <button onClick={() => navigate("/TeacherCoupons")} className="text-[11px] text-[#A78BFA] hover:underline">Sab Batches →</button>
          </div>
          {activeCoupon ? (
            <div>
              <p className="text-sm font-medium">{activeCoupon.name}</p>
              <p className="text-xs text-gray-500">{activeCoupon.exam} &middot; {activeCoupon.code}</p>
            </div>
          ) : (
            <p className="text-sm text-gray-500">Koi active batch nahi hai.</p>
          )}

          {coupons.length > 1 && (
            <div className="pt-2 border-t border-gray-800 space-y-1.5">
              <p className="text-[10px] text-gray-600 uppercase tracking-wide">Jaldi switch karein</p>
              {coupons.filter((c) => c._id !== teacher.activeCoupon).map((c) => (
                <button
                  key={c._id}
                  onClick={() => handleSwitch(c._id)}
                  disabled={switchingId === c._id}
                  className="w-full flex items-center justify-between text-left px-3 py-2 rounded-lg bg-[#0A0D14] border border-gray-800 hover:border-[#7C3AED]/40 text-xs disabled:opacity-50"
                >
                  <span>{c.name}</span>
                  <span className="text-gray-600">{switchingId === c._id ? "..." : "Switch"}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* ── Account actions ── */}
        <div className="bg-[#111827] border border-gray-800 rounded-2xl overflow-hidden">
          <button onClick={() => navigate("/TeacherForgotPassword")} className="w-full flex items-center justify-between px-5 py-4 text-sm hover:bg-white/5 border-b border-gray-800">
            <span>🔑 Password Badlein</span>
            <span className="text-gray-600">→</span>
          </button>
          {teacher.role === "main" && (
            <button onClick={() => navigate("/TeacherSubTeachers")} className="w-full flex items-center justify-between px-5 py-4 text-sm hover:bg-white/5 border-b border-gray-800">
              <span>👥 Team Manage Karein</span>
              <span className="text-gray-600">→</span>
            </button>
          )}
          <button
            onClick={handleLogout}
            disabled={loggingOut}
            className="w-full flex items-center justify-between px-5 py-4 text-sm text-red-400 hover:bg-red-500/5 disabled:opacity-50"
          >
            <span>🚪 Logout</span>
            <span>{loggingOut ? "..." : "→"}</span>
          </button>
        </div>
      </div>
      <TeacherBottomNav />
    </div>
  );
};

export default TeacherProfile;
