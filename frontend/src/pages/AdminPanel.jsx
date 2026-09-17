import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api/api";

const SkeletonBlock = ({ className = "" }) => (
  <div className={`bg-gray-800/70 rounded animate-pulse ${className}`} />
);

// ─────────────────────────────────────────────
// Create Main Teacher — asli, poori form (jo explicitly maanga gaya tha)
// ─────────────────────────────────────────────
const CreateMainTeacherCard = () => {
  const [form, setForm] = useState({ name: "", email: "", phone: "", examName: "" });
  const [status, setStatus] = useState("idle");
  const [message, setMessage] = useState("");

  const handleChange = (e) => setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setStatus("submitting");
    setMessage("");
    try {
      const examList = form.examName.split(",").map((s) => s.trim()).filter(Boolean);
      await api.post("/admin/create-main-teacher", { ...form, examName: examList });
      setMessage("✅ Invite email bhej diya gaya hai!");
      setForm({ name: "", email: "", phone: "", examName: "" });
      setStatus("idle");
    } catch (err) {
      setMessage(err.response?.data?.message || "Error aaya.");
      setStatus("idle");
    }
  };

  return (
    <div className="bg-[#111827] border border-gray-800 rounded-2xl p-5 sm:p-6">
      <h3 className="font-semibold text-base mb-1">Naya Main Teacher Banayein</h3>
      <p className="text-xs text-gray-500 mb-4">Teacher ke email par ek invite link jayega, wo khud apna password set karega</p>

      {message && (
        <div className={`mb-4 p-3 rounded-lg text-xs text-center ${message.startsWith("✅") ? "bg-green-500/10 text-green-400" : "bg-red-500/10 text-red-400"}`}>
          {message}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-3">
        <input name="name" value={form.name} onChange={handleChange} placeholder="Naam" required className="w-full px-4 py-2.5 text-sm bg-[#0A0D14] border border-gray-700 focus:border-[#7C3AED] rounded-xl outline-none text-white placeholder-gray-600" />
        <input name="email" type="email" value={form.email} onChange={handleChange} placeholder="email@example.com" required className="w-full px-4 py-2.5 text-sm bg-[#0A0D14] border border-gray-700 focus:border-[#7C3AED] rounded-xl outline-none text-white placeholder-gray-600" />
        <input name="phone" value={form.phone} onChange={handleChange} placeholder="10-digit phone" required className="w-full px-4 py-2.5 text-sm bg-[#0A0D14] border border-gray-700 focus:border-[#7C3AED] rounded-xl outline-none text-white placeholder-gray-600" />
        <input name="examName" value={form.examName} onChange={handleChange} placeholder="Exams, comma se alag (jaise UPSC, SSC CGL)" className="w-full px-4 py-2.5 text-sm bg-[#0A0D14] border border-gray-700 focus:border-[#7C3AED] rounded-xl outline-none text-white placeholder-gray-600" />
        <button type="submit" disabled={status === "submitting"} className="w-full py-2.5 rounded-xl bg-[#7C3AED] hover:bg-[#6D28D9] font-semibold text-sm transition-colors disabled:opacity-50">
          {status === "submitting" ? "Bhej rahe hain..." : "Invite Bhejein"}
        </button>
      </form>
    </div>
  );
};

// ─────────────────────────────────────────────
// Baaki 4 admin actions — simple raw-JSON forms (MVP).
// Inke fields models se match karte hain; agar Postman se pehle
// use kiya hai to wahi JSON yahan paste kar sakte ho.
// ─────────────────────────────────────────────
const JsonActionCard = ({ title, description, endpoint, placeholder }) => {
  const [raw, setRaw] = useState(placeholder);
  const [status, setStatus] = useState("idle");
  const [message, setMessage] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setStatus("submitting");
    setMessage("");
    try {
      const parsed = JSON.parse(raw);
      await api.post(endpoint, parsed);
      setMessage("✅ Ho gaya!");
    } catch (err) {
      if (err instanceof SyntaxError) {
        setMessage("❌ JSON format galat hai — check karein.");
      } else {
        setMessage(err.response?.data?.message || "Error aaya.");
      }
    } finally {
      setStatus("idle");
    }
  };

  return (
    <details className="bg-[#111827] border border-gray-800 rounded-2xl overflow-hidden">
      <summary className="px-5 py-4 cursor-pointer font-semibold text-sm">{title}</summary>
      <div className="px-5 pb-5">
        <p className="text-xs text-gray-500 mb-3">{description}</p>
        {message && (
          <div className={`mb-3 p-2.5 rounded-lg text-xs text-center ${message.startsWith("✅") ? "bg-green-500/10 text-green-400" : "bg-red-500/10 text-red-400"}`}>
            {message}
          </div>
        )}
        <form onSubmit={handleSubmit}>
          <textarea
            value={raw}
            onChange={(e) => setRaw(e.target.value)}
            rows={8}
            className="w-full px-3 py-2.5 text-xs font-mono bg-[#0A0D14] border border-gray-700 focus:border-[#7C3AED] rounded-xl outline-none text-white"
          />
          <button type="submit" disabled={status === "submitting"} className="mt-3 w-full py-2.5 rounded-xl bg-[#1F2937] border border-[#7C3AED]/40 text-[#A78BFA] text-sm font-medium hover:bg-[#7C3AED]/10 disabled:opacity-50">
            {status === "submitting" ? "Bhej rahe hain..." : "Submit Karein"}
          </button>
        </form>
      </div>
    </details>
  );
};

// ─────────────────────────────────────────────
// 🆕 Manage Exam Names — ab admin khud naya exam add/remove kar sakta hai,
// code change/redeploy ki zaroorat nahi
// ─────────────────────────────────────────────
const ManageExamNamesCard = () => {
  const [exams, setExams] = useState(null); // null = loading
  const [newName, setNewName] = useState("");
  const [status, setStatus] = useState("idle");
  const [message, setMessage] = useState("");

  const loadExams = () => {
    api
      .get("/admin/exam-names")
      .then((res) => setExams(res.data.data))
      .catch(() => setExams([]));
  };

  useEffect(() => { loadExams(); }, []);

  const handleAdd = async (e) => {
    e.preventDefault();
    if (!newName.trim()) return;
    setStatus("submitting");
    setMessage("");
    try {
      await api.post("/admin/exam-names", { name: newName.trim() });
      setNewName("");
      loadExams();
    } catch (err) {
      setMessage(err.response?.data?.message || "Error aaya.");
    } finally {
      setStatus("idle");
    }
  };

  const handleDelete = async (id) => {
    setMessage("");
    try {
      await api.delete(`/admin/exam-names/${id}`);
      setExams((prev) => prev.filter((e) => e._id !== id));
    } catch (err) {
      setMessage(err.response?.data?.message || "Delete nahi ho paaya.");
    }
  };

  return (
    <div className="bg-[#111827] border border-gray-800 rounded-2xl p-5 sm:p-6">
      <h3 className="font-semibold text-base mb-1">Exam Names Manage Karein</h3>
      <p className="text-xs text-gray-500 mb-4">Yahan add kiya naya exam turant signup/dropdown mein dikhne lagega</p>

      {message && (
        <div className="mb-4 p-3 rounded-lg text-xs text-center bg-red-500/10 text-red-400">{message}</div>
      )}

      <form onSubmit={handleAdd} className="flex gap-2 mb-4">
        <input
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          placeholder="Jaise: UPSSSC PET"
          className="flex-1 px-4 py-2.5 text-sm bg-[#0A0D14] border border-gray-700 focus:border-[#7C3AED] rounded-xl outline-none text-white placeholder-gray-600"
        />
        <button type="submit" disabled={status === "submitting"} className="px-5 py-2.5 rounded-xl bg-[#7C3AED] hover:bg-[#6D28D9] font-semibold text-sm transition-colors disabled:opacity-50 flex-shrink-0">
          Add
        </button>
      </form>

      {exams === null ? (
        <SkeletonBlock className="w-full h-24 rounded-xl" />
      ) : exams.length === 0 ? (
        <p className="text-xs text-gray-500 text-center py-4">Abhi koi exam nahi hai.</p>
      ) : (
        <div className="flex flex-wrap gap-2">
          {exams.map((e) => (
            <span key={e._id} className="inline-flex items-center gap-2 pl-3 pr-2 py-1.5 rounded-full bg-[#1F2937] text-sm text-gray-200">
              {e.name}
              <button
                onClick={() => handleDelete(e._id)}
                title="Delete"
                className="w-4 h-4 flex items-center justify-center rounded-full text-gray-500 hover:text-red-400 hover:bg-red-500/10 text-xs leading-none"
              >
                ✕
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
};

const AdminPanel = () => {
  const navigate = useNavigate();
  const [phase, setPhase] = useState("checking"); // checking | ready

  useEffect(() => {
    api
      .get("/admin/session")
      .then((res) => {
        if (!res.data.loggedIn) {
          navigate("/AdminLogin");
        } else {
          setPhase("ready");
        }
      })
      .catch(() => navigate("/AdminLogin"));
  }, [navigate]);

  const handleLogout = async () => {
    await api.post("/admin/logout").catch(() => {});
    navigate("/AdminLogin");
  };

  if (phase === "checking") {
    return (
      <div className="min-h-screen bg-[#0A0D14] text-white px-4 sm:px-6 py-8">
        <div className="max-w-2xl mx-auto space-y-4">
          <SkeletonBlock className="w-40 h-7" />
          <SkeletonBlock className="w-full h-40 rounded-2xl" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0A0D14] text-white px-4 sm:px-6 py-8 pb-16">
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">Admin Panel</h1>
          <button onClick={handleLogout} className="text-xs px-3 py-1.5 rounded-lg border border-red-500/30 text-red-400 hover:bg-red-500/10">
            Logout
          </button>
        </div>

        <CreateMainTeacherCard />

        <ManageExamNamesCard />

        <div className="space-y-3">
          <p className="text-xs font-semibold tracking-wider text-gray-500 uppercase">Content (Advanced)</p>

          <JsonActionCard
            title="📊 Rank Predictor Data Add Karein"
            description="examName, year, dataPoints ([{score, rank}]), totalCandidates, totalVacancies, isActive"
            endpoint="/add-rank-predictor-data"
            placeholder={JSON.stringify({ examName: "UPSC", year: 2026, dataPoints: [{ score: 150, rank: 500 }], totalCandidates: 500000, totalVacancies: 1000, isActive: true }, null, 2)}
          />

          <JsonActionCard
            title="📄 Previous Year Test (Global) Add Karein"
            description="examName, testName, year, description, subjects ([{subjectName, questions: [...]}]), marksPerQuestion, negativeMarking, durationMinutes"
            endpoint="/add-previous-year-test"
            placeholder={JSON.stringify({ examName: "UPSC", testName: "UPSC Prelims 2025", year: 2025, description: "", subjects: [], marksPerQuestion: 2, negativeMarking: 0.5, durationMinutes: 120 }, null, 2)}
          />

          <JsonActionCard
            title="📰 Current Affair Add Karein"
            description="examName, date (YYYY-MM-DD), title, items ([{headline, content, category, source}])"
            endpoint="/add-current-affair"
            placeholder={JSON.stringify({ examName: "UPSC", date: "2026-09-17", title: "Daily Current Affairs", items: [] }, null, 2)}
          />

          <JsonActionCard
            title="📝 Current Affair Quiz Add Karein"
            description="examName, date (YYYY-MM-DD), questions ([{question, option1..4, correctOption, answerExplain}])"
            endpoint="/add-current-affair-quiz"
            placeholder={JSON.stringify({ examName: "UPSC", date: "2026-09-17", questions: [] }, null, 2)}
          />
        </div>
      </div>
    </div>
  );
};

export default AdminPanel;
