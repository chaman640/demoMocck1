// pages/ManageNotes.jsx
//
// Admin aur Teacher dono ke liye notes (PDF) upload / list / hide / delete.
//   Admin   → exam chunta hai, us exam ke sabhi students ko dikhenge
//   Teacher → apne batches chunta hai, sirf un batches ke students ko
//             (sub-teacher sirf apne assigned subjects)
import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import api from "../api/api";
import { formatBytes } from "../offline/offlineStore";

const inputCls =
  "w-full px-4 py-2.5 text-sm bg-[#0A0D14] border border-gray-700 focus:border-[#7C3AED] rounded-xl outline-none text-white placeholder-gray-600";
const labelCls = "block text-[11px] font-semibold mb-1.5 uppercase tracking-wide text-gray-400";

const NoteForm = ({ options, onSaved, onCancel }) => {
  const isAdmin = options.actor === "admin";
  const [form, setForm] = useState({ title: "", description: "", examName: "", subjectName: "", topicName: "" });
  const [batchIds, setBatchIds] = useState([]);
  const [file, setFile] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const batches = useMemo(() => options.batches || [], [options.batches]);
  // Sub-teacher: sirf wahi subjects jo chune hue batches mein unhe mile hain
  const subjectChoices = useMemo(() => {
    if (isAdmin || options.role !== "sub") return null;
    const chosen = batches.filter((b) => batchIds.includes(String(b._id)));
    return [...new Set((chosen.length ? chosen : batches).flatMap((b) => b.subjects || []))];
  }, [isAdmin, options.role, batches, batchIds]);

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));
  const toggleBatch = (id) =>
    setBatchIds((ids) => (ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id]));

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    if (!form.title.trim() || !form.subjectName.trim()) return setError("Title and subject are required.");
    if (isAdmin && !form.examName) return setError("Select an exam.");
    if (!isAdmin && batchIds.length === 0) return setError("Select at least one batch.");
    if (!file) return setError("Choose a PDF file.");
    if (file.type && file.type !== "application/pdf") return setError("Please upload a PDF file only.");
    if (file.size > 25 * 1024 * 1024) return setError("PDF must be smaller than 25 MB.");

    const fd = new FormData();
    Object.entries(form).forEach(([k, v]) => fd.append(k, v.trim()));
    if (!isAdmin) fd.append("couponIds", JSON.stringify(batchIds));
    fd.append("file", file);

    setSaving(true);
    try {
      const res = await api.post("/manage/notes", fd, { timeout: 180000 });
      onSaved(res.data.message || "Notes uploaded!");
    } catch (err) {
      setError(err.response?.data?.message || "Upload failed.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 flex items-end sm:items-center justify-center" onClick={onCancel}>
      <form
        onClick={(e) => e.stopPropagation()}
        onSubmit={submit}
        className="w-full sm:max-w-lg max-h-[92vh] overflow-y-auto bg-[#111827] border border-gray-800 rounded-t-3xl sm:rounded-3xl p-5 space-y-4"
      >
        <h2 className="text-lg font-bold">Upload New Notes</h2>

        <div>
          <label className={labelCls}>Title *</label>
          <input className={inputCls} value={form.title} onChange={set("title")} placeholder="e.g. Indian Polity — Short Notes" maxLength={150} />
        </div>

        {isAdmin ? (
          <div>
            <label className={labelCls}>Exam *</label>
            <select className={inputCls} value={form.examName} onChange={set("examName")}>
              <option value="">Select exam</option>
              {(options.exams || []).map((e) => (
                <option key={e} value={e}>{e}</option>
              ))}
            </select>
            <p className="text-[11px] text-gray-500 mt-1">All students of this exam will see it.</p>
          </div>
        ) : (
          <div>
            <label className={labelCls}>Batches *</label>
            {batches.length === 0 ? (
              <p className="text-xs text-gray-500">You don't have any batch yet.</p>
            ) : (
              <div className="space-y-2">
                {batches.map((b) => (
                  <label key={b._id} className="flex items-center gap-3 p-3 rounded-xl border border-gray-700 cursor-pointer has-[:checked]:border-[#7C3AED]">
                    <input type="checkbox" checked={batchIds.includes(String(b._id))} onChange={() => toggleBatch(String(b._id))} className="accent-[#7C3AED]" />
                    <span className="text-sm">{b.name}</span>
                    <span className="text-[11px] text-gray-500 ml-auto">{b.exam}</span>
                  </label>
                ))}
              </div>
            )}
          </div>
        )}

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelCls}>Subject *</label>
            {subjectChoices ? (
              <select className={inputCls} value={form.subjectName} onChange={set("subjectName")}>
                <option value="">Select</option>
                {subjectChoices.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            ) : (
              <input className={inputCls} value={form.subjectName} onChange={set("subjectName")} placeholder="e.g. GK" maxLength={100} />
            )}
          </div>
          <div>
            <label className={labelCls}>Topic</label>
            <input className={inputCls} value={form.topicName} onChange={set("topicName")} placeholder="Optional" maxLength={100} />
          </div>
        </div>

        <div>
          <label className={labelCls}>Description</label>
          <textarea className={`${inputCls} min-h-[70px]`} value={form.description} onChange={set("description")} maxLength={1000} />
        </div>

        <div>
          <label className={labelCls}>PDF File *</label>
          <label className="flex items-center gap-3 p-3 border border-dashed border-gray-700 hover:border-[#7C3AED] rounded-xl cursor-pointer">
            <span className="text-2xl">📄</span>
            <div className="min-w-0">
              <p className="text-sm truncate">{file ? file.name : "Choose PDF"}</p>
              <p className="text-[11px] text-gray-500">{file ? formatBytes(file.size) : "Up to 25 MB · students can read it only inside the app"}</p>
            </div>
            <input type="file" accept="application/pdf,.pdf" className="hidden" onChange={(e) => setFile(e.target.files?.[0] || null)} />
          </label>
        </div>

        {error && <p className="text-sm text-red-400">{error}</p>}

        <div className="flex gap-3 pt-1">
          <button type="button" onClick={onCancel} className="flex-1 py-3 rounded-xl border border-gray-700 text-gray-300 text-sm font-medium">
            Cancel
          </button>
          <button type="submit" disabled={saving} className="flex-1 py-3 rounded-xl bg-[#7C3AED] hover:bg-[#6D28D9] text-sm font-semibold disabled:opacity-50">
            {saving ? "Uploading..." : "Upload"}
          </button>
        </div>
      </form>
    </div>
  );
};

const ManageNotes = () => {
  const navigate = useNavigate();
  const [phase, setPhase] = useState("loading");
  const [notes, setNotes] = useState([]);
  const [options, setOptions] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [message, setMessage] = useState("");
  const [busyId, setBusyId] = useState(null);

  const load = async () => {
    try {
      const [list, opts] = await Promise.all([api.get("/manage/notes"), api.get("/manage/notes/options")]);
      setNotes(list.data.data || []);
      setOptions(opts.data.data);
      setPhase("ready");
    } catch (err) {
      const status = err.response?.status;
      setPhase(status === 401 || status === 403 ? "noauth" : "error");
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- mount par data fetch
    load();
  }, []);

  const toggle = async (note) => {
    setBusyId(note._id);
    try {
      await api.post(`/manage/notes/${note._id}/status`, { status: note.status === "hidden" ? "active" : "hidden" });
      await load();
    } catch (err) {
      setMessage(err.response?.data?.message || "Could not change the status.");
    } finally {
      setBusyId(null);
    }
  };

  const remove = async (note) => {
    if (!window.confirm(`Delete "${note.title}"? It will also be removed from students' phones.`)) return;
    setBusyId(note._id);
    try {
      const res = await api.delete(`/manage/notes/${note._id}`);
      setMessage(res.data.message);
      await load();
    } catch (err) {
      setMessage(err.response?.data?.message || "Could not delete.");
    } finally {
      setBusyId(null);
    }
  };

  if (phase === "noauth") {
    return (
      <div className="min-h-screen bg-[#0A0D14] text-white flex items-center justify-center px-6">
        <div className="w-full max-w-sm bg-[#111827] border border-gray-800 rounded-2xl p-6 text-center space-y-4">
          <div className="text-4xl">🔒</div>
          <p className="text-sm text-gray-300">Admin or Teacher login is required to manage notes.</p>
          <div className="space-y-2">
            <Link to="/AdminLogin" className="block py-2.5 rounded-xl bg-[#7C3AED] text-sm font-semibold">Admin Login</Link>
            <Link to="/TeacherLogin" className="block py-2.5 rounded-xl border border-gray-700 text-sm text-gray-300">Teacher Login</Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0A0D14] text-white pb-16">
      <header className="flex items-center gap-3 px-4 py-3.5 border-b border-gray-800 sticky top-0 bg-[#0A0D14] z-10">
        <button onClick={() => navigate(-1)} className="text-gray-400 text-xl leading-none">←</button>
        <h1 className="text-base font-bold">Study Notes</h1>
      </header>

      <main className="px-4 py-4 max-w-2xl mx-auto space-y-4">
        {message && (
          <div className="p-3 bg-green-500/10 text-green-400 border border-green-500/25 rounded-xl text-sm text-center">{message}</div>
        )}

        <button
          onClick={() => {
            setMessage("");
            setShowForm(true);
          }}
          disabled={!options}
          className="w-full py-3 rounded-2xl bg-gradient-to-r from-[#7C3AED] to-[#6D28D9] font-semibold text-sm disabled:opacity-50"
        >
          + Upload New Notes
        </button>

        <p className="text-[11px] text-gray-500 leading-relaxed">
          Students can read notes only inside the app (offline for up to 15 days). Their name and phone are printed as a watermark on every page, and one account works on only 2 phones.
        </p>

        {phase === "loading" && [1, 2, 3].map((i) => <div key={i} className="w-full h-24 rounded-2xl bg-gray-800/70 animate-pulse" />)}
        {phase === "error" && <p className="text-sm text-gray-500 text-center py-10">Could not load notes.</p>}
        {phase === "ready" && notes.length === 0 && (
          <div className="text-center py-14 space-y-2">
            <p className="text-4xl">📝</p>
            <p className="text-sm text-gray-500">No notes uploaded yet.</p>
          </div>
        )}

        {phase === "ready" &&
          notes.map((note) => (
            <div key={note._id} className={`bg-[#111827] border border-gray-800 rounded-2xl p-4 ${note.status === "hidden" ? "opacity-60" : ""}`}>
              <div className="flex items-start gap-3">
                <span className="text-2xl">📄</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold truncate">{note.title}</p>
                  <p className="text-[11px] text-gray-500 mt-0.5">
                    {[note.subjectName, note.topicName].filter(Boolean).join(" · ")} · {formatBytes(note.fileBytes)}
                  </p>
                  <p className="text-[11px] text-gray-400 mt-1">
                    {note.visibility === "public"
                      ? `All ${note.examName} students`
                      : `Batch: ${note.batches.map((b) => b.name).join(", ") || "—"}`}
                    {note.createdBy?.actorType === "teacher" && note.createdBy.name ? ` · by ${note.createdBy.name}` : ""}
                  </p>
                </div>
                {note.status === "hidden" && (
                  <span className="text-[10px] px-2 py-0.5 rounded-full border border-gray-600 text-gray-400">Hidden</span>
                )}
              </div>
              <div className="flex gap-2 mt-3">
                <button
                  onClick={() => toggle(note)}
                  disabled={busyId === note._id}
                  className="flex-1 py-2 rounded-lg border border-gray-700 text-xs font-semibold text-gray-300 disabled:opacity-50"
                >
                  {note.status === "hidden" ? "Show" : "Hide"}
                </button>
                <button
                  onClick={() => remove(note)}
                  disabled={busyId === note._id}
                  className="flex-1 py-2 rounded-lg border border-red-500/40 text-xs font-semibold text-red-300 disabled:opacity-50"
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
      </main>

      {showForm && options && (
        <NoteForm
          options={options}
          onCancel={() => setShowForm(false)}
          onSaved={(msg) => {
            setShowForm(false);
            setMessage(msg);
            load();
          }}
        />
      )}
    </div>
  );
};

export default ManageNotes;
