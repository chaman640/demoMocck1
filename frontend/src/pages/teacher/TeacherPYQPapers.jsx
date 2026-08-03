import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../api/api";
import TeacherBottomNav from "../../components/TeacherBottomNav";
import ActiveCouponSwitcher from "../../components/ActiveCouponSwitcher";

const SkeletonBlock = ({ className = "" }) => (
  <div className={`bg-gray-800/70 rounded animate-pulse ${className}`} />
);

const PageSkeleton = () => (
  <div className="min-h-screen bg-[#0A0D14] text-white px-4 sm:px-6 py-8 pb-24">
    <div className="max-w-2xl mx-auto space-y-4">
      <SkeletonBlock className="w-48 h-7" />
      <SkeletonBlock className="w-full h-16 rounded-xl" />
      <SkeletonBlock className="w-full h-40 rounded-2xl" />
    </div>
  </div>
);

const EMPTY_BLUEPRINT_ROW = { subjectName: "", questionCount: "" };

const TeacherPYQPapers = () => {
  const navigate = useNavigate();

  const [phase, setPhase] = useState("loading");
  const [errorMsg, setErrorMsg] = useState("");
  const [teacher, setTeacher] = useState(null);
  const [role, setRole] = useState("main");
  const [papers, setPapers] = useState([]);

  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    testName: "",
    year: new Date().getFullYear(),
    durationMinutes: "",
    marksPerQuestion: 1,
    negativeMarking: 0,
  });
  const [blueprintRows, setBlueprintRows] = useState([{ ...EMPTY_BLUEPRINT_ROW }]);
  const [formError, setFormError] = useState("");
  const [creating, setCreating] = useState(false);

  const load = useCallback(async () => {
    setPhase("loading");
    try {
      const [meRes, couponsRes] = await Promise.all([
        api.get("/teacher-me"),
        api.get("/my-coupons"),
      ]);
      setTeacher(meRes.data.data);
      setRole(couponsRes.data.role || "main");

      if (meRes.data.data.activeCoupon) {
        const papersRes = await api.get("/teacher/previous-year-paper/list");
        setPapers(papersRes.data.data || []);
      } else {
        setPapers([]);
      }

      setPhase("view");
    } catch (err) {
      if (err.response?.status === 401) {
        navigate("/TeacherLogin");
        return;
      }
      setErrorMsg(err.response?.data?.message || "Papers load nahi ho paaye.");
      setPhase("error");
    }
  }, [navigate]);

  useEffect(() => { load(); }, [load]);

  const handleCouponChanged = () => {
    setShowForm(false);
    load();
  };

  const updateBlueprintRow = (idx, field, value) => {
    setBlueprintRows((prev) => prev.map((r, i) => (i === idx ? { ...r, [field]: value } : r)));
  };
  const addBlueprintRow = () => setBlueprintRows((prev) => [...prev, { ...EMPTY_BLUEPRINT_ROW }]);
  const removeBlueprintRow = (idx) => setBlueprintRows((prev) => prev.filter((_, i) => i !== idx));

  const handleCreateShell = async (e) => {
    e.preventDefault();
    setFormError("");

    if (!formData.testName.trim() || !formData.year || !formData.durationMinutes) {
      setFormError("Test naam, saal aur duration zaroori hain!");
      return;
    }

    const cleanBlueprint = blueprintRows
      .filter((r) => r.subjectName.trim() && r.questionCount)
      .map((r) => ({ subjectName: r.subjectName.trim(), questionCount: Number(r.questionCount) }));

    if (cleanBlueprint.length === 0) {
      setFormError("Kam se kam ek subject ka blueprint dena zaroori hai!");
      return;
    }

    setCreating(true);
    try {
      await api.post("/teacher/previous-year-paper/create-shell", {
        couponId: teacher.activeCoupon,
        testName: formData.testName.trim(),
        year: Number(formData.year),
        durationMinutes: Number(formData.durationMinutes),
        marksPerQuestion: Number(formData.marksPerQuestion) || 1,
        negativeMarking: Number(formData.negativeMarking) || 0,
        blueprint: cleanBlueprint,
      });
      setFormData({ testName: "", year: new Date().getFullYear(), durationMinutes: "", marksPerQuestion: 1, negativeMarking: 0 });
      setBlueprintRows([{ ...EMPTY_BLUEPRINT_ROW }]);
      setShowForm(false);
      await load();
    } catch (err) {
      setFormError(err.response?.data?.message || "Paper-shell nahi ban paaya.");
    } finally {
      setCreating(false);
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

  const inputClass = "w-full px-3 py-2 text-xs bg-[#0A0D14] border border-gray-700 focus:border-[#7C3AED] rounded-lg outline-none text-white placeholder-gray-600";

  return (
    <div className="min-h-screen bg-[#0A0D14] text-white px-4 sm:px-6 py-8 pb-24">
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold mb-1">Previous Year Papers</h1>
            <p className="text-gray-400 text-sm">Batch-specific papers ka blueprint aur fill-status</p>
          </div>
          {role === "main" && teacher?.activeCoupon && (
            <button
              onClick={() => setShowForm((s) => !s)}
              className="text-xs px-3 py-2 rounded-lg bg-[#7C3AED] hover:bg-[#6D28D9] font-medium flex-shrink-0"
            >
              {showForm ? "Cancel" : "+ Naya Paper"}
            </button>
          )}
        </div>

        <ActiveCouponSwitcher activeCouponId={teacher?.activeCoupon} onChanged={handleCouponChanged} />

        {!teacher?.activeCoupon ? (
          <div className="bg-[#111827] border border-gray-800 rounded-2xl p-6 text-center">
            <p className="text-sm text-gray-400">Papers dekhne ke liye pehle active batch select karein.</p>
          </div>
        ) : (
          <>
            {/* Create Shell Form — sirf Main Teacher */}
            {role === "main" && showForm && (
              <div className="bg-[#111827] border border-gray-800 rounded-2xl p-5">
                {formError && (
                  <div className="mb-4 p-3 bg-red-500/10 text-red-400 border border-red-500/25 rounded-xl text-sm text-center">
                    {formError}
                  </div>
                )}
                <form onSubmit={handleCreateShell} className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold mb-1.5 uppercase tracking-wide text-gray-400">
                      Test Naam
                    </label>
                    <input
                      type="text"
                      value={formData.testName}
                      onChange={(e) => setFormData((p) => ({ ...p, testName: e.target.value }))}
                      placeholder="e.g. SSC GD 2025 - Shift 1"
                      className={inputClass}
                    />
                  </div>

                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className="block text-xs font-semibold mb-1.5 uppercase tracking-wide text-gray-400">Saal</label>
                      <input type="number" value={formData.year} onChange={(e) => setFormData((p) => ({ ...p, year: e.target.value }))} className={inputClass} />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold mb-1.5 uppercase tracking-wide text-gray-400">Duration (min)</label>
                      <input type="number" value={formData.durationMinutes} onChange={(e) => setFormData((p) => ({ ...p, durationMinutes: e.target.value }))} className={inputClass} />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold mb-1.5 uppercase tracking-wide text-gray-400">Marks/Q</label>
                      <input type="number" value={formData.marksPerQuestion} onChange={(e) => setFormData((p) => ({ ...p, marksPerQuestion: e.target.value }))} className={inputClass} />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold mb-1.5 uppercase tracking-wide text-gray-400">Negative Marking</label>
                    <input type="number" step="0.25" value={formData.negativeMarking} onChange={(e) => setFormData((p) => ({ ...p, negativeMarking: e.target.value }))} className={inputClass} />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold mb-1.5 uppercase tracking-wide text-gray-400">
                      Blueprint (kis subject ke kitne questions)
                    </label>
                    <div className="space-y-2">
                      {blueprintRows.map((row, idx) => (
                        <div key={idx} className="flex gap-2">
                          <input
                            type="text"
                            value={row.subjectName}
                            onChange={(e) => updateBlueprintRow(idx, "subjectName", e.target.value)}
                            placeholder="Subject (e.g. Hindi)"
                            className={`${inputClass} flex-1`}
                          />
                          <input
                            type="number"
                            value={row.questionCount}
                            onChange={(e) => updateBlueprintRow(idx, "questionCount", e.target.value)}
                            placeholder="Count"
                            className={`${inputClass} w-24`}
                          />
                          {blueprintRows.length > 1 && (
                            <button type="button" onClick={() => removeBlueprintRow(idx)} className="text-red-400 text-sm px-2 flex-shrink-0">✕</button>
                          )}
                        </div>
                      ))}
                    </div>
                    <button type="button" onClick={addBlueprintRow} className="text-xs text-[#A78BFA] mt-2 hover:underline">
                      + Ek aur subject add karein
                    </button>
                  </div>

                  <button
                    type="submit"
                    disabled={creating}
                    className="w-full py-3 rounded-xl bg-[#7C3AED] hover:bg-[#6D28D9] font-semibold disabled:opacity-50"
                  >
                    {creating ? "Ban raha hai..." : "Paper-Shell Banayein"}
                  </button>
                </form>
              </div>
            )}

            {/* Papers List */}
            {papers.length === 0 ? (
              <div className="bg-[#111827] border border-gray-800 rounded-2xl p-6 text-center">
                <p className="text-sm text-gray-400">Is batch ke liye abhi koi paper nahi bana.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {papers.map((p) => (
                  <div key={p.paperId} className="bg-[#111827] border border-gray-800 rounded-2xl p-5">
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div className="min-w-0">
                        <h3 className="font-semibold text-sm truncate">{p.testName}</h3>
                        <p className="text-xs text-gray-500 mt-0.5">{p.year} &middot; {p.durationMinutes} min</p>
                      </div>
                      <span
                        className={`text-[10px] px-2 py-0.5 rounded-full border flex-shrink-0 ${
                          p.status === "complete"
                            ? "bg-green-500/15 text-green-400 border-green-500/30"
                            : "bg-yellow-500/15 text-yellow-400 border-yellow-500/30"
                        }`}
                      >
                        {p.status}
                      </span>
                    </div>

                    <div className="space-y-2.5">
                      {p.subjectProgress.map((sp) => {
                        const pct = sp.required > 0 ? Math.min(100, Math.round((sp.current / sp.required) * 100)) : 0;
                        return (
                          <div key={sp.subjectName}>
                            <div className="flex items-center justify-between text-xs mb-1">
                              <span className="text-gray-300">{sp.subjectName}</span>
                              <span className={sp.filled ? "text-green-400" : "text-gray-500"}>
                                {sp.current}/{sp.required}
                              </span>
                            </div>
                            <div className="h-1.5 bg-[#1F2937] rounded-full overflow-hidden mb-1.5">
                              <div
                                className={`h-full ${sp.filled ? "bg-green-500" : "bg-[#7C3AED]"}`}
                                style={{ width: `${pct}%` }}
                              />
                            </div>
                            {!sp.filled && sp.canFill && (
                              <button
                                onClick={() =>
                                  navigate(`/TeacherPYQPaperFill/${p.paperId}/${encodeURIComponent(sp.subjectName)}`)
                                }
                                className="text-[11px] text-[#A78BFA] hover:underline"
                              >
                                Questions Fill Karein →
                              </button>
                            )}
                            {!sp.filled && !sp.canFill && (
                              <p className="text-[11px] text-gray-600">Aap is subject ke liye authorized nahi hain</p>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
      <TeacherBottomNav />
    </div>
  );
};

export default TeacherPYQPapers;