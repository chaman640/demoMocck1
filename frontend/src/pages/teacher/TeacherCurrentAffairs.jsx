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
      <SkeletonBlock className="w-full h-64 rounded-2xl" />
    </div>
  </div>
);

const todayIST = () => {
  const d = new Date(Date.now() + 5.5 * 60 * 60 * 1000); // UTC+5:30
  return d.toISOString().slice(0, 10);
};

const EMPTY_ITEM = { headline: "", content: "", category: "General", source: "" };

const TeacherCurrentAffairs = () => {
  const navigate = useNavigate();
  const [phase, setPhase] = useState("loading");
  const [teacher, setTeacher] = useState(null);
  const [errorMsg, setErrorMsg] = useState("");

  const [date, setDate] = useState(todayIST());
  const [title, setTitle] = useState("Daily Current Affairs");
  const [items, setItems] = useState([{ ...EMPTY_ITEM }]);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [loadingExisting, setLoadingExisting] = useState(false);

  const load = useCallback(async () => {
    setPhase("loading");
    try {
      const meRes = await api.get("/teacher-me");
      setTeacher(meRes.data.data);
      setPhase("view");
    } catch (err) {
      if (err.response?.status === 401) {
        navigate("/TeacherLogin");
        return;
      }
      setErrorMsg(err.response?.data?.message || "Could not load data.");
      setPhase("error");
    }
  }, [navigate]);

  useEffect(() => { load(); }, [load]);

  // 🆕 Jab bhi date badle (ya batch), dekho ki us din ka entry pehle se hai —
  // agar hai to edit ke liye load kar do
  const loadExistingForDate = useCallback(async (d) => {
    if (!teacher?.activeCoupon) return;
    setLoadingExisting(true);
    try {
      const res = await api.get(`/teacher/current-affair/${d}`);
      if (res.data.data) {
        setTitle(res.data.data.title || "Daily Current Affairs");
        setItems(res.data.data.items.length > 0 ? res.data.data.items : [{ ...EMPTY_ITEM }]);
      } else {
        setTitle("Daily Current Affairs");
        setItems([{ ...EMPTY_ITEM }]);
      }
    } catch {
      // koi baat nahi, khaali form rehne do
    } finally {
      setLoadingExisting(false);
    }
  }, [teacher?.activeCoupon]);

  useEffect(() => {
    if (teacher?.activeCoupon) loadExistingForDate(date);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [teacher?.activeCoupon, date]);

  const handleCouponChanged = () => load();

  const updateItem = (idx, field, value) => setItems((prev) => prev.map((it, i) => (i === idx ? { ...it, [field]: value } : it)));
  const addItemRow = () => setItems((prev) => [...prev, { ...EMPTY_ITEM }]);
  const removeItemRow = (idx) => setItems((prev) => (prev.length > 1 ? prev.filter((_, i) => i !== idx) : prev));

  const handleSave = async (e) => {
    e.preventDefault();
    setMessage("");
    const validItems = items.filter((it) => it.headline.trim() && it.content.trim());
    if (validItems.length === 0) {
      setMessage("❌ Please add at least one item (with headline + content).");
      return;
    }
    setSaving(true);
    try {
      await api.post("/teacher/current-affair", {
        date,
        title: title.trim(),
        items: validItems.map((it) => ({
          headline: it.headline.trim(),
          content: it.content.trim(),
          category: it.category.trim() || "General",
          source: it.source.trim() || undefined,
        })),
      });
      setMessage("✅ Saved! This will appear for your batch's students alongside the Admin's global updates.");
    } catch (err) {
      setMessage(err.response?.data?.message || "Could not save.");
    } finally {
      setSaving(false);
    }
  };

  const inputClass = "w-full px-4 py-2.5 text-sm bg-[#0A0D14] border border-gray-700 focus:border-[#7C3AED] rounded-xl outline-none text-white placeholder-gray-600";
  const tinyInputClass = "px-3 py-2 text-xs bg-[#111827] border border-gray-700 focus:border-[#7C3AED] rounded-lg outline-none text-white placeholder-gray-600";

  if (phase === "loading") return <PageSkeleton />;

  if (phase === "error") {
    return (
      <div className="min-h-screen bg-[#0A0D14] text-white flex items-center justify-center px-6 pb-24">
        <div className="max-w-md text-center space-y-4">
          <p className="text-gray-300">{errorMsg}</p>
          <button onClick={load} className="px-5 py-2 rounded-lg bg-[#7C3AED] hover:bg-[#6D28D9] text-sm font-medium">Dobara Try Karein</button>
        </div>
        <TeacherBottomNav />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0A0D14] text-white px-4 sm:px-6 py-8 pb-24">
      <div className="max-w-2xl mx-auto space-y-6">
        <button onClick={() => navigate("/TeacherContent")} className="text-sm text-gray-400 hover:text-white flex items-center gap-1">
          &larr; Content Par Wapas
        </button>

        <div>
          <h1 className="text-2xl font-bold mb-1">Batch Current Affairs</h1>
          <p className="text-gray-400 text-sm">This will only be visible to your active batch's students — combined with the Admin's global updates.</p>
        </div>

        <ActiveCouponSwitcher activeCouponId={teacher?.activeCoupon} onChanged={handleCouponChanged} />

        {!teacher?.activeCoupon ? (
          <div className="bg-[#111827] border border-gray-800 rounded-2xl p-6 text-center">
            <p className="text-sm text-gray-400">Please select an active batch before adding current affairs.</p>
          </div>
        ) : (
          <form onSubmit={handleSave} className="space-y-4">
            <div className="bg-[#111827] border border-gray-800 rounded-2xl p-5 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] text-gray-500 uppercase mb-1">Date</label>
                  <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={inputClass} />
                </div>
                <div>
                  <label className="block text-[10px] text-gray-500 uppercase mb-1">Title</label>
                  <input value={title} onChange={(e) => setTitle(e.target.value)} className={inputClass} />
                </div>
              </div>
              {loadingExisting && <p className="text-[11px] text-gray-500">Is din ka data check ho raha hai...</p>}
            </div>

            {message && (
              <div className={`p-3 rounded-lg text-xs text-center ${message.startsWith("✅") ? "bg-green-500/10 text-green-400" : "bg-red-500/10 text-red-400"}`}>
                {message}
              </div>
            )}

            <div className="space-y-3">
              {items.map((it, idx) => (
                <div key={idx} className="bg-[#111827] border border-gray-800 rounded-2xl p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] text-gray-500">Item {idx + 1}</span>
                    <button type="button" onClick={() => removeItemRow(idx)} className="text-gray-600 hover:text-red-400 text-xs">✕</button>
                  </div>
                  <input value={it.headline} onChange={(e) => updateItem(idx, "headline", e.target.value)} placeholder="Headline" className={tinyInputClass + " w-full"} />
                  <textarea value={it.content} onChange={(e) => updateItem(idx, "content", e.target.value)} rows={3} placeholder="Poora detail" className={tinyInputClass + " w-full"} />
                  <div className="grid grid-cols-2 gap-2">
                    <input value={it.category} onChange={(e) => updateItem(idx, "category", e.target.value)} placeholder="Category (jaise: National)" className={tinyInputClass} />
                    <input value={it.source} onChange={(e) => updateItem(idx, "source", e.target.value)} placeholder="Source (optional)" className={tinyInputClass} />
                  </div>
                </div>
              ))}
            </div>
            <button type="button" onClick={addItemRow} className="w-full py-2 rounded-lg bg-[#1F2937] border border-gray-700 text-gray-300 hover:border-gray-500 text-xs font-medium">
              + Aur Item Jodein
            </button>

            <button type="submit" disabled={saving} className="w-full py-3 rounded-xl bg-[#7C3AED] hover:bg-[#6D28D9] font-semibold disabled:opacity-50">
              {saving ? "Saving..." : "Save Karein"}
            </button>
          </form>
        )}
      </div>
      <TeacherBottomNav />
    </div>
  );
};

export default TeacherCurrentAffairs;
