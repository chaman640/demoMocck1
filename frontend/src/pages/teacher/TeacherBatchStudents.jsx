import React, { useState, useEffect, useCallback } from "react";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import api from "../../api/api";
import TeacherBottomNav from "../../components/TeacherBottomNav";

const SkeletonBlock = ({ className = "" }) => (
  <div className={`bg-gray-800/70 rounded animate-pulse ${className}`} />
);

const PageSkeleton = () => (
  <div className="min-h-screen bg-[#0A0D14] text-white px-4 sm:px-6 py-8 pb-24">
    <div className="max-w-2xl mx-auto space-y-4">
      <SkeletonBlock className="w-40 h-4" />
      <SkeletonBlock className="w-56 h-7" />
      <SkeletonBlock className="w-full h-32 rounded-2xl" />
      <SkeletonBlock className="w-full h-48 rounded-2xl" />
    </div>
  </div>
);

const EMPTY_FORM = { name: "", phone: "", email: "" };

const TeacherBatchStudents = () => {
  const navigate = useNavigate();
  const { couponId } = useParams();
  const location = useLocation();
  const batchName = location.state?.batchName;

  const [phase, setPhase] = useState("loading");
  const [errorMsg, setErrorMsg] = useState("");
  const [students, setStudents] = useState([]);

  const [form, setForm] = useState(EMPTY_FORM);
  const [formError, setFormError] = useState("");
  const [adding, setAdding] = useState(false);

  const load = useCallback(async () => {
    setPhase("loading");
    try {
      const res = await api.get(`/teacher/batch-students/${couponId}`);
      setStudents(res.data.data || []);
      setPhase("view");
    } catch (err) {
      if (err.response?.status === 401) {
        navigate("/TeacherLogin");
        return;
      }
      setErrorMsg(err.response?.data?.message || "Students load nahi ho paaye.");
      setPhase("error");
    }
  }, [couponId, navigate]);

  useEffect(() => { load(); }, [load]);

  const handleAdd = async (e) => {
    e.preventDefault();
    setFormError("");
    if (!form.phone.trim() && !form.email.trim()) {
      setFormError("Phone ya email mein se ek zaroori hai!");
      return;
    }
    setAdding(true);
    try {
      await api.post("/teacher/batch-students", {
        couponId,
        name: form.name.trim() || undefined,
        phone: form.phone.trim() || undefined,
        email: form.email.trim() || undefined,
      });
      setForm(EMPTY_FORM);
      await load();
    } catch (err) {
      setFormError(err.response?.data?.message || "Student add nahi ho paaya.");
    } finally {
      setAdding(false);
    }
  };

  const handleDelete = async (id) => {
    try {
      await api.delete(`/teacher/batch-students/${id}`);
      setStudents((prev) => prev.filter((s) => s._id !== id));
    } catch (err) {
      alert(err.response?.data?.message || "Delete nahi ho paaya.");
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

  const inputClass = "w-full px-4 py-2.5 text-sm bg-[#0A0D14] border border-gray-700 focus:border-[#7C3AED] rounded-xl outline-none text-white placeholder-gray-600";

  return (
    <div className="min-h-screen bg-[#0A0D14] text-white px-4 sm:px-6 py-8 pb-24">
      <div className="max-w-2xl mx-auto space-y-6">
        <button onClick={() => navigate("/TeacherCoupons")} className="text-sm text-gray-400 hover:text-white flex items-center gap-1">
          &larr; Batches Par Wapas
        </button>

        <div>
          <h1 className="text-2xl font-bold mb-1">Students Manage Karein</h1>
          <p className="text-gray-400 text-sm">
            {batchName ? `'${batchName}' ` : "Is batch "}
            {students.length > 0
              ? "ab sirf yahan list kiye students hi join kar sakte hain."
              : "abhi khula hai — koi bhi valid coupon code se join kar sakta hai. Neeche pehla student add karte hi ye invite-only ban jayegi."}
          </p>
        </div>

        <div className="bg-[#111827] border border-gray-800 rounded-2xl p-5 sm:p-6">
          <h3 className="font-semibold text-sm mb-4">Naya Student Add Karein</h3>

          {formError && (
            <div className="mb-4 p-3 bg-red-500/10 text-red-400 border border-red-500/25 rounded-xl text-sm text-center">
              {formError}
            </div>
          )}

          <form onSubmit={handleAdd} className="space-y-3">
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
              placeholder="Naam (optional)"
              className={inputClass}
            />
            <input
              type="text"
              value={form.phone}
              onChange={(e) => setForm((p) => ({ ...p, phone: e.target.value.replace(/[^0-9]/g, "").slice(0, 10) }))}
              placeholder="Phone (10 digit)"
              className={inputClass}
            />
            <input
              type="email"
              value={form.email}
              onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
              placeholder="Email"
              className={inputClass}
            />
            <p className="text-[11px] text-gray-500">Phone ya email mein se ek dena zaroori hai, dono bhi de sakte hain.</p>
            <button type="submit" disabled={adding} className="w-full py-2.5 rounded-xl bg-[#7C3AED] hover:bg-[#6D28D9] font-semibold text-sm disabled:opacity-50">
              {adding ? "Add ho raha hai..." : "Student Add Karein"}
            </button>
          </form>
        </div>

        <div className="bg-[#111827] border border-gray-800 rounded-2xl overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-800">
            <h3 className="font-semibold text-sm">Allowed Students ({students.length})</h3>
          </div>
          {students.length === 0 ? (
            <p className="p-6 text-sm text-gray-400 text-center">Abhi koi student add nahi hua.</p>
          ) : (
            <div className="divide-y divide-gray-800">
              {students.map((s) => (
                <div key={s._id} className="flex items-center justify-between px-5 py-3.5 gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{s.name || "—"}</p>
                    <p className="text-[11px] text-gray-500">
                      {[s.phone, s.email].filter(Boolean).join(" · ")}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className={`text-[10px] px-2 py-0.5 rounded-full ${s.joined ? "bg-green-500/10 text-green-400" : "bg-gray-700/40 text-gray-400"}`}>
                      {s.joined ? "Joined ✓" : "Pending"}
                    </span>
                    <button onClick={() => handleDelete(s._id)} className="w-6 h-6 flex items-center justify-center rounded-full text-gray-500 hover:text-red-400 hover:bg-red-500/10 text-xs">
                      ✕
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
      <TeacherBottomNav />
    </div>
  );
};

export default TeacherBatchStudents;
