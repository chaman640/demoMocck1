import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../api/api";
import TeacherBottomNav from "../../components/TeacherBottomNav";

const SkeletonBlock = ({ className = "" }) => (
  <div className={`bg-gray-800/70 rounded animate-pulse ${className}`} />
);

const CouponsSkeleton = () => (
  <div className="min-h-screen bg-[#0A0D14] text-white px-4 sm:px-6 py-8 pb-24">
    <div className="max-w-2xl mx-auto space-y-4">
      <SkeletonBlock className="w-40 h-7" />
      <SkeletonBlock className="w-full h-24 rounded-2xl" />
      <SkeletonBlock className="w-full h-24 rounded-2xl" />
    </div>
  </div>
);

const TeacherCoupons = () => {
  const navigate = useNavigate();
  const [phase, setPhase] = useState("loading");
  const [role, setRole] = useState("main");
  const [coupons, setCoupons] = useState([]);
  const [teacher, setTeacher] = useState(null);
  const [examList, setExamList] = useState([]);
  const [errorMsg, setErrorMsg] = useState("");

  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({ name: "", exam: "" });
  const [formError, setFormError] = useState("");
  const [creating, setCreating] = useState(false);

  const [switchingId, setSwitchingId] = useState(null);
  const [copiedCode, setCopiedCode] = useState(null);

  const load = useCallback(async () => {
    setPhase("loading");
    try {
      const [meRes, couponsRes] = await Promise.all([
        api.get("/teacher-me"),
        api.get("/my-coupons"),
      ]);
      setTeacher(meRes.data.data);
      setRole(couponsRes.data.role || "main");
      setCoupons(couponsRes.data.data || []);
      setPhase("view");
    } catch (err) {
      if (err.response?.status === 401) {
        navigate("/TeacherLogin");
        return;
      }
      setErrorMsg(err.response?.data?.message || "Coupons load nahi ho paaye.");
      setPhase("error");
    }
  }, [navigate]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (showForm && examList.length === 0) {
      api.get("/allExamName").then((res) => setExamList(res.data.data || [])).catch(() => {});
    }
  }, [showForm, examList.length]);

  const handleCreate = async (e) => {
    e.preventDefault();
    setFormError("");
    if (!formData.name.trim() || !formData.exam) {
      setFormError("Batch ka naam aur exam dono zaroori hain!");
      return;
    }
    setCreating(true);
    try {
      await api.post("/create-coupon", { name: formData.name.trim(), exam: formData.exam });
      setFormData({ name: "", exam: "" });
      setShowForm(false);
      await load();
    } catch (err) {
      setFormError(err.response?.data?.message || "Batch nahi ban paaya.");
    } finally {
      setCreating(false);
    }
  };

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

  const copyCode = (code) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 1500);
  };

  if (phase === "loading") return <CouponsSkeleton />;

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

  const isMain = role === "main";
  const activeCouponId = teacher?.activeCoupon;

  return (
    <div className="min-h-screen bg-[#0A0D14] text-white px-4 sm:px-6 py-8 pb-24">
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center justify-between mb-1">
          <h1 className="text-2xl font-bold">
            {isMain ? "Aapke Batches" : "Authorized Batches"}
          </h1>
          {isMain && (
            <button
              onClick={() => setShowForm((s) => !s)}
              className="text-xs px-3 py-2 rounded-lg bg-[#7C3AED] hover:bg-[#6D28D9] font-medium"
            >
              {showForm ? "Cancel" : "+ Naya Batch"}
            </button>
          )}
        </div>
        <p className="text-gray-400 text-sm mb-6">
          {isMain
            ? "Har batch ek unique coupon code se students ko join hone dega"
            : "Ye batches aapko Main Teacher ne assign ki hain"}
        </p>

        {isMain && showForm && (
          <div className="bg-[#111827] border border-gray-800 rounded-2xl p-5 mb-6">
            {formError && (
              <div className="mb-4 p-3 bg-red-500/10 text-red-400 border border-red-500/25 rounded-xl text-sm text-center">
                {formError}
              </div>
            )}
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold mb-1.5 uppercase tracking-wide text-gray-400">
                  Batch Naam
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData((p) => ({ ...p, name: e.target.value }))}
                  placeholder="e.g. UPSI-Morning-2026"
                  className="w-full px-4 py-2.5 text-sm bg-[#0A0D14] border border-gray-700 focus:border-[#7C3AED] rounded-xl outline-none transition-colors text-white placeholder-gray-600"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold mb-1.5 uppercase tracking-wide text-gray-400">
                  Exam
                </label>
                <select
                  value={formData.exam}
                  onChange={(e) => setFormData((p) => ({ ...p, exam: e.target.value }))}
                  className="w-full px-4 py-2.5 text-sm bg-[#0A0D14] border border-gray-700 focus:border-[#7C3AED] rounded-xl outline-none transition-colors text-white appearance-none cursor-pointer"
                >
                  <option value="" disabled>Select exam</option>
                  {examList.map((e, i) => (
                    <option key={i} value={e}>{e}</option>
                  ))}
                </select>
              </div>
              <button
                type="submit"
                disabled={creating}
                className="w-full py-3 rounded-xl bg-[#7C3AED] hover:bg-[#6D28D9] font-semibold disabled:opacity-50"
              >
                {creating ? "Ban raha hai..." : "Batch Banayein"}
              </button>
            </form>
          </div>
        )}

        {coupons.length === 0 ? (
          <div className="bg-[#111827] border border-gray-800 rounded-2xl p-6 text-center">
            <p className="text-sm text-gray-400">
              {isMain
                ? "Abhi koi batch nahi bana. Upar wale button se pehla batch banayein."
                : "Aapko abhi tak koi batch assign nahi hui hai."}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {coupons.map((c) => {
              const isActive = c._id === activeCouponId;
              return (
                <div
                  key={c._id}
                  className={`bg-[#111827] border rounded-2xl p-5 ${
                    isActive ? "border-[#7C3AED]" : "border-gray-800"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-semibold text-base truncate">{c.name}</h3>
                        {isActive && (
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#7C3AED]/20 text-[#A78BFA] flex-shrink-0">
                            Active
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-gray-500 mt-0.5">{c.exam}</p>
                    </div>
                  </div>

                  <button
                    onClick={() => copyCode(c.code)}
                    className="flex items-center gap-2 bg-[#0A0D14] border border-gray-700 rounded-lg px-3 py-2 mb-3 hover:border-gray-500 transition-colors"
                  >
                    <span className="font-mono text-sm tracking-wider text-gray-200">{c.code}</span>
                    <span className="text-[11px] text-gray-500 ml-auto">
                      {copiedCode === c.code ? "Copied ✓" : "Copy"}
                    </span>
                  </button>

                  {!isMain && c.subjects && c.subjects.length > 0 && (
                    <p className="text-xs text-[#A78BFA] mb-3">
                      Aapke subjects: {c.subjects.join(", ")}
                    </p>
                  )}

                  {!isActive && (
                    <button
                      onClick={() => handleSwitch(c._id)}
                      disabled={switchingId === c._id}
                      className="w-full py-2 rounded-lg border border-[#7C3AED]/40 text-[#A78BFA] hover:bg-[#7C3AED]/10 text-sm font-medium disabled:opacity-50"
                    >
                      {switchingId === c._id ? "Switch ho raha hai..." : "Ise Active Batch Banayein"}
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
      <TeacherBottomNav />
    </div>
  );
};

export default TeacherCoupons;