import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api/api";

const SkeletonBlock = ({ className = "" }) => (
  <div className={`bg-gray-800/70 rounded animate-pulse ${className}`} />
);

const formatDate = (iso) =>
  new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });

const SettleForm = ({ teacher, onDone }) => {
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [msg, setMsg] = useState("");

  const submit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setMsg("");
    try {
      await api.post(`/admin/teachers/${teacher._id}/settle-commission`, { amount: Number(amount), note });
      onDone();
    } catch (err) {
      setMsg(err.response?.data?.message || "Error aaya.");
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={submit} className="mt-3 p-3 bg-[#0A0D14] border border-gray-800 rounded-xl space-y-2">
      <p className="text-[11px] text-gray-500">
        Pending questions: <span className="text-white font-semibold">{teacher.pendingQuestionsCount}</span> — settle karne par 0 ho jayenge.
      </p>
      <input
        type="number"
        min="0"
        value={amount}
        onChange={(e) => setAmount(e.target.value)}
        placeholder="Amount (₹)"
        required
        className="w-full px-3 py-2 text-sm bg-[#111827] border border-gray-700 rounded-lg outline-none text-white placeholder-gray-600"
      />
      <input
        type="text"
        value={note}
        onChange={(e) => setNote(e.target.value)}
        placeholder="Note (optional)"
        className="w-full px-3 py-2 text-sm bg-[#111827] border border-gray-700 rounded-lg outline-none text-white placeholder-gray-600"
      />
      {msg && <p className="text-xs text-center text-red-400">{msg}</p>}
      <button type="submit" disabled={submitting} className="w-full py-2 rounded-lg bg-[#7C3AED] hover:bg-[#6D28D9] text-xs font-semibold disabled:opacity-50">
        {submitting ? "Settle ho raha hai..." : "Hisab Settle Karein"}
      </button>
    </form>
  );
};

const TeacherCard = ({ teacher, onChanged }) => {
  const [open, setOpen] = useState(null);
  const toggle = (name) => setOpen((prev) => (prev === name ? null : name));

  return (
    <div className="bg-[#111827] border border-gray-800 rounded-2xl p-4">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-white truncate">{teacher.name}</p>
          <p className="text-[11px] text-gray-500 truncate">{teacher.email} &middot; {teacher.phone}</p>
        </div>
        <span
          className={`text-[10px] px-2 py-0.5 rounded-full flex-shrink-0 ${
            teacher.status === "active" ? "bg-green-500/15 text-green-400" : "bg-red-500/15 text-red-400"
          }`}
        >
          {teacher.status === "active" ? "Active" : "Removed"}
        </span>
      </div>

      <div className="grid grid-cols-4 gap-2 mt-3">
        {[
          { label: "Batches", value: teacher.totalBatches },
          { label: "Students", value: teacher.totalStudents },
          { label: "Pending Qs", value: teacher.pendingQuestionsCount },
          { label: "Total Qs", value: teacher.totalQuestionsAllTime },
        ].map((s) => (
          <div key={s.label} className="bg-[#0A0D14] rounded-lg p-2 text-center">
            <p className="text-[10px] text-gray-500">{s.label}</p>
            <p className="text-sm font-bold text-white">{s.value}</p>
          </div>
        ))}
      </div>

      <div className="flex gap-2 mt-3">
        <button onClick={() => toggle("settle")} className="text-[11px] px-2.5 py-1.5 rounded-lg bg-[#7C3AED]/15 text-[#A78BFA] hover:bg-[#7C3AED]/25">
          Hisab Settle Karein
        </button>
        <button onClick={() => toggle("history")} className="text-[11px] px-2.5 py-1.5 rounded-lg border border-gray-700 hover:border-gray-500 text-gray-300">
          History ({teacher.paymentHistory.length})
        </button>
      </div>

      {open === "settle" && (
        <SettleForm
          teacher={teacher}
          onDone={() => {
            setOpen(null);
            onChanged();
          }}
        />
      )}

      {open === "history" && (
        <div className="mt-3 p-3 bg-[#0A0D14] border border-gray-800 rounded-xl space-y-2">
          {teacher.paymentHistory.length > 0 ? (
            [...teacher.paymentHistory].reverse().map((entry, idx) => (
              <div key={idx} className="flex items-center justify-between text-xs">
                <span className="text-gray-400">
                  {formatDate(entry.settledAt)} &middot; {entry.questionsSettled} questions
                  {entry.note ? ` · ${entry.note}` : ""}
                </span>
                <span className="font-semibold text-[#A78BFA]">₹{entry.amount}</span>
              </div>
            ))
          ) : (
            <p className="text-xs text-gray-500 text-center">Abhi tak koi hisab settle nahi hua.</p>
          )}
        </div>
      )}
    </div>
  );
};

const AdminTeacherCommissions = () => {
  const navigate = useNavigate();
  const [phase, setPhase] = useState("checking");
  const [teachers, setTeachers] = useState([]);

  const load = () =>
    api
      .get("/admin/teacher-commissions")
      .then((res) => {
        setTeachers(res.data.data || []);
        setPhase("ready");
      })
      .catch((err) => {
        if (err.response?.status === 401 || err.response?.status === 403) {
          navigate("/AdminLogin");
          return;
        }
        setPhase("error");
      });

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="min-h-screen bg-[#0A0D14] text-white px-4 sm:px-6 py-8 pb-16">
      <div className="max-w-2xl mx-auto space-y-5">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">Teacher Commission</h1>
          <button onClick={() => navigate("/AdminPanel")} className="text-xs px-3 py-1.5 rounded-lg border border-gray-700 text-gray-300 hover:border-gray-500">
            ← Admin Panel
          </button>
        </div>

        <p className="text-xs text-gray-500">
          Sirf Main Teachers ko commission milta hai. Amount aap khud daalte hain — settle karte hi pending count 0 ho jata hai aur teacher ko apne dashboard mein history dikhti hai.
        </p>

        {phase === "checking" && [1, 2].map((i) => <SkeletonBlock key={i} className="w-full h-32 rounded-2xl" />)}
        {phase === "error" && <p className="text-sm text-gray-500 text-center py-10">List load nahi ho payi.</p>}
        {phase === "ready" && teachers.length === 0 && (
          <p className="text-sm text-gray-500 text-center py-10">Abhi koi Main Teacher nahi hai.</p>
        )}
        {phase === "ready" && teachers.map((t) => <TeacherCard key={t._id} teacher={t} onChanged={load} />)}
      </div>
    </div>
  );
};

export default AdminTeacherCommissions;
