import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api/api";

const SkeletonBlock = ({ className = "" }) => (
  <div className={`bg-gray-800/70 rounded animate-pulse ${className}`} />
);

const CreatePromoterCard = ({ onCreated }) => {
  const [form, setForm] = useState({ name: "", email: "", phone: "", password: "" });
  const [status, setStatus] = useState("idle");
  const [message, setMessage] = useState("");

  const handleChange = (e) => setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setStatus("submitting");
    setMessage("");
    try {
      const res = await api.post("/admin/create-promoter", form);
      const d = res.data.data;
      setMessage(
        d.emailSent
          ? "✅ Promoter ban gaya aur credentials email bhej diye gaye hain!"
          : `✅ Promoter ban gaya (code: ${d.code}), lekin email bhejne mein dikkat aayi — khud bata dein.`
      );
      setForm({ name: "", email: "", phone: "", password: "" });
      onCreated?.();
    } catch (err) {
      setMessage(err.response?.data?.message || "Error aaya.");
    } finally {
      setStatus("idle");
    }
  };

  return (
    <div className="bg-[#111827] border border-gray-800 rounded-2xl p-5 sm:p-6">
      <h3 className="font-semibold text-base mb-1">Naya Promoter Banayein</h3>
      <p className="text-xs text-gray-500 mb-4">
        Password aap khud set karein — promoter ko email par login link, email aur password chala jayega.
      </p>

      {message && (
        <div className={`mb-4 p-3 rounded-lg text-xs text-center ${message.startsWith("✅") ? "bg-green-500/10 text-green-400" : "bg-red-500/10 text-red-400"}`}>
          {message}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-3">
        <input name="name" value={form.name} onChange={handleChange} placeholder="Naam" required className="w-full px-4 py-2.5 text-sm bg-[#0A0D14] border border-gray-700 focus:border-[#7C3AED] rounded-xl outline-none text-white placeholder-gray-600" />
        <input name="email" type="email" value={form.email} onChange={handleChange} placeholder="email@example.com" required className="w-full px-4 py-2.5 text-sm bg-[#0A0D14] border border-gray-700 focus:border-[#7C3AED] rounded-xl outline-none text-white placeholder-gray-600" />
        <input name="phone" value={form.phone} onChange={handleChange} placeholder="10-digit phone" required className="w-full px-4 py-2.5 text-sm bg-[#0A0D14] border border-gray-700 focus:border-[#7C3AED] rounded-xl outline-none text-white placeholder-gray-600" />
        <input name="password" type="text" value={form.password} onChange={handleChange} placeholder="Password (kam se kam 6 characters)" required className="w-full px-4 py-2.5 text-sm bg-[#0A0D14] border border-gray-700 focus:border-[#7C3AED] rounded-xl outline-none text-white placeholder-gray-600" />
        <button type="submit" disabled={status === "submitting"} className="w-full py-2.5 rounded-xl bg-[#7C3AED] hover:bg-[#6D28D9] font-semibold text-sm transition-colors disabled:opacity-50">
          {status === "submitting" ? "Ban raha hai..." : "Promoter Banayein"}
        </button>
      </form>
    </div>
  );
};

const SettleForm = ({ promoter, onDone }) => {
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [msg, setMsg] = useState("");

  const submit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setMsg("");
    try {
      await api.post(`/admin/promoters/${promoter._id}/settle`, { amount: Number(amount), note });
      setMsg("✅ Hisab settle ho gaya!");
      setAmount("");
      setNote("");
      onDone?.();
    } catch (err) {
      setMsg(err.response?.data?.message || "Error aaya.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={submit} className="mt-3 p-3 bg-[#0A0D14] border border-gray-800 rounded-xl space-y-2">
      <p className="text-[11px] text-gray-500">
        Pending questions: <span className="text-white font-semibold">{promoter.pendingQuestionsCount}</span> — ye
        settle karne par 0 ho jayega.
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
      {msg && <p className="text-xs text-center text-gray-300">{msg}</p>}
      <button type="submit" disabled={submitting} className="w-full py-2 rounded-lg bg-[#7C3AED] hover:bg-[#6D28D9] text-xs font-semibold disabled:opacity-50">
        {submitting ? "Settle ho raha hai..." : "Hisab Settle Karein"}
      </button>
    </form>
  );
};

const EditForm = ({ promoter, onDone }) => {
  const [form, setForm] = useState({ name: promoter.name, email: promoter.email, phone: promoter.phone, newPassword: "" });
  const [submitting, setSubmitting] = useState(false);
  const [msg, setMsg] = useState("");

  const handleChange = (e) => setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setMsg("");
    try {
      await api.post(`/admin/promoters/${promoter._id}/update`, form);
      setMsg("✅ Update ho gaya!");
      onDone?.();
    } catch (err) {
      setMsg(err.response?.data?.message || "Error aaya.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={submit} className="mt-3 p-3 bg-[#0A0D14] border border-gray-800 rounded-xl space-y-2">
      <input name="name" value={form.name} onChange={handleChange} placeholder="Naam" className="w-full px-3 py-2 text-sm bg-[#111827] border border-gray-700 rounded-lg outline-none text-white placeholder-gray-600" />
      <input name="email" value={form.email} onChange={handleChange} placeholder="Email" className="w-full px-3 py-2 text-sm bg-[#111827] border border-gray-700 rounded-lg outline-none text-white placeholder-gray-600" />
      <input name="phone" value={form.phone} onChange={handleChange} placeholder="Phone" className="w-full px-3 py-2 text-sm bg-[#111827] border border-gray-700 rounded-lg outline-none text-white placeholder-gray-600" />
      <input name="newPassword" type="text" value={form.newPassword} onChange={handleChange} placeholder="Naya password (sirf badalna ho to)" className="w-full px-3 py-2 text-sm bg-[#111827] border border-gray-700 rounded-lg outline-none text-white placeholder-gray-600" />
      {msg && <p className="text-xs text-center text-gray-300">{msg}</p>}
      <button type="submit" disabled={submitting} className="w-full py-2 rounded-lg bg-[#7C3AED] hover:bg-[#6D28D9] text-xs font-semibold disabled:opacity-50">
        {submitting ? "Save ho raha hai..." : "Save Karein"}
      </button>
    </form>
  );
};

const PromoterCard = ({ promoter, onChanged }) => {
  const [expanded, setExpanded] = useState(null);
  const [copied, setCopied] = useState(false);
  const [togglingStatus, setTogglingStatus] = useState(false);

  const copyLink = () => {
    navigator.clipboard.writeText(promoter.referralLink).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const toggleStatus = async () => {
    setTogglingStatus(true);
    try {
      const newStatus = promoter.status === "active" ? "removed" : "active";
      await api.post(`/admin/promoters/${promoter._id}/status`, { status: newStatus });
      onChanged?.();
    } catch (err) {
      alert(err.response?.data?.message || "Status badalte waqt error aaya.");
    } finally {
      setTogglingStatus(false);
    }
  };

  const toggle = (section) => setExpanded((prev) => (prev === section ? null : section));

  return (
    <div className="bg-[#111827] border border-gray-800 rounded-2xl p-4">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-white truncate">{promoter.name}</p>
          <p className="text-[11px] text-gray-500 truncate">{promoter.email} &middot; {promoter.phone}</p>
          <p className="text-[11px] text-[#A78BFA] mt-0.5">Code: {promoter.code}</p>
        </div>
        <span className={`text-[10px] px-2 py-0.5 rounded-full flex-shrink-0 ${promoter.status === "active" ? "bg-green-500/15 text-green-400" : "bg-red-500/15 text-red-400"}`}>
          {promoter.status === "active" ? "Active" : "Removed"}
        </span>
      </div>

      <div className="grid grid-cols-3 gap-2 mt-3">
        <div className="bg-[#0A0D14] rounded-lg p-2 text-center">
          <p className="text-[10px] text-gray-500">Students</p>
          <p className="text-sm font-bold text-white">{promoter.totalStudents}</p>
        </div>
        <div className="bg-[#0A0D14] rounded-lg p-2 text-center">
          <p className="text-[10px] text-gray-500">Pending Qs</p>
          <p className="text-sm font-bold text-white">{promoter.pendingQuestionsCount}</p>
        </div>
        <div className="bg-[#0A0D14] rounded-lg p-2 text-center">
          <p className="text-[10px] text-gray-500">Total Qs</p>
          <p className="text-sm font-bold text-white">{promoter.totalQuestionsAllTime}</p>
        </div>
      </div>

      <div className="flex items-center gap-2 mt-3">
        <div className="flex-1 min-w-0 px-2 py-1.5 bg-[#0A0D14] border border-gray-800 rounded-lg text-[11px] text-gray-400 truncate">
          {promoter.referralLink}
        </div>
        <button onClick={copyLink} className="text-[11px] px-2 py-1.5 rounded-lg border border-gray-700 hover:border-[#7C3AED] flex-shrink-0">
          {copied ? "Copied!" : "Copy"}
        </button>
      </div>

      <div className="flex flex-wrap gap-2 mt-3">
        <button onClick={() => toggle("settle")} className="text-[11px] px-2.5 py-1.5 rounded-lg bg-[#7C3AED]/15 text-[#A78BFA] hover:bg-[#7C3AED]/25">
          Hisab Settle Karein
        </button>
        <button onClick={() => toggle("edit")} className="text-[11px] px-2.5 py-1.5 rounded-lg border border-gray-700 hover:border-gray-500 text-gray-300">
          Edit
        </button>
        <button onClick={() => toggle("history")} className="text-[11px] px-2.5 py-1.5 rounded-lg border border-gray-700 hover:border-gray-500 text-gray-300">
          History ({promoter.paymentHistory?.length || 0})
        </button>
        <button
          onClick={toggleStatus}
          disabled={togglingStatus}
          className={`text-[11px] px-2.5 py-1.5 rounded-lg disabled:opacity-50 ${promoter.status === "active" ? "border border-red-500/30 text-red-400 hover:bg-red-500/10" : "border border-green-500/30 text-green-400 hover:bg-green-500/10"}`}
        >
          {promoter.status === "active" ? "Remove Karein" : "Active Karein"}
        </button>
      </div>

      {expanded === "settle" && <SettleForm promoter={promoter} onDone={() => { setExpanded(null); onChanged?.(); }} />}
      {expanded === "edit" && <EditForm promoter={promoter} onDone={() => { setExpanded(null); onChanged?.(); }} />}
      {expanded === "history" && (
        <div className="mt-3 p-3 bg-[#0A0D14] border border-gray-800 rounded-xl space-y-2">
          {promoter.paymentHistory?.length > 0 ? (
            [...promoter.paymentHistory].reverse().map((entry, idx) => (
              <div key={idx} className="flex items-center justify-between text-xs">
                <span className="text-gray-400">
                  {new Date(entry.settledAt).toLocaleDateString()} &middot; {entry.questionsSettled} questions
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

const AdminPromoters = () => {
  const navigate = useNavigate();
  const [phase, setPhase] = useState("checking");
  const [promoters, setPromoters] = useState([]);
  const [loadingList, setLoadingList] = useState(true);

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

  const loadPromoters = () => {
    setLoadingList(true);
    api
      .get("/admin/promoters")
      .then((res) => setPromoters(res.data.data || []))
      .catch(() => {})
      .finally(() => setLoadingList(false));
  };

  useEffect(() => {
    if (phase === "ready") loadPromoters();
  }, [phase]);

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
          <h1 className="text-2xl font-bold">Promoters</h1>
          <button onClick={() => navigate("/AdminPanel")} className="text-xs px-3 py-1.5 rounded-lg border border-gray-700 text-gray-300 hover:border-gray-500">
            ← Admin Panel
          </button>
        </div>

        <CreatePromoterCard onCreated={loadPromoters} />

        <div className="space-y-3">
          <p className="text-xs font-semibold tracking-wider text-gray-500 uppercase">Sabhi Promoters</p>
          {loadingList ? (
            <SkeletonBlock className="w-full h-24 rounded-2xl" />
          ) : promoters.length === 0 ? (
            <p className="text-sm text-gray-500 text-center py-6">Abhi tak koi promoter nahi banaya gaya.</p>
          ) : (
            promoters.map((p) => <PromoterCard key={p._id} promoter={p} onChanged={loadPromoters} />)
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminPromoters;
