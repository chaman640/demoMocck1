// pages/teacher/TeacherClasses.jsx
// Video classes for the active batch: Subject folder → Topic folder → Class.
// A class is a YouTube live stream or a recorded video, with optional notes (PDF).
import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import api from "../../api/api";
import TeacherBottomNav from "../../components/TeacherBottomNav";
import ActiveCouponSwitcher from "../../components/ActiveCouponSwitcher";
import { classStatusBadge, toLocalInputValue } from "../../utils/classFormat";

const inputCls =
  "w-full px-3 py-2.5 text-sm bg-[#0A0D14] border border-gray-700 focus:border-[#7C3AED] rounded-xl outline-none placeholder-gray-600";

const errorText = (err, fallback) => err?.response?.data?.message || fallback;

const Modal = ({ title, onClose, children }) => (
  <div className="fixed inset-0 z-[70] bg-black/70 flex items-end sm:items-center justify-center p-0 sm:p-4" onClick={onClose}>
    <div
      className="w-full sm:max-w-lg max-h-[92vh] overflow-y-auto bg-[#111827] border border-gray-800 rounded-t-2xl sm:rounded-2xl p-5 space-y-4"
      onClick={(e) => e.stopPropagation()}
    >
      <div className="flex items-center justify-between">
        <h2 className="text-base font-bold">{title}</h2>
        <button onClick={onClose} className="text-gray-400 text-xl leading-none">
          ×
        </button>
      </div>
      {children}
    </div>
  </div>
);

const HowToLive = () => (
  <details className="bg-[#0A0D14] border border-gray-800 rounded-xl p-3 text-xs text-gray-400">
    <summary className="cursor-pointer text-gray-300 font-semibold">How do I go live on YouTube?</summary>
    <ol className="list-decimal pl-4 mt-2 space-y-1">
      <li>Open YouTube (app or studio.youtube.com) → Create → Go live.</li>
      <li>
        Set visibility to <b className="text-gray-200">Unlisted</b> — it won't show up on YouTube search, only inside this app.
      </li>
      <li>Keep "Allow embedding" ON (it is on by default).</li>
      <li>Copy the live link (Share → Copy link) and paste it here.</li>
      <li>After the class, end the stream on YouTube and press "End class" here — the recording appears for students automatically.</li>
    </ol>
  </details>
);

/** Add / edit a class */
const ClassForm = ({ initial, folder, onClose, onSaved }) => {
  const editing = Boolean(initial);
  const [kind, setKind] = useState(initial?.kind || "live");
  const [title, setTitle] = useState(initial?.title || "");
  const [description, setDescription] = useState(initial?.description || "");
  const [youtubeUrl, setYoutubeUrl] = useState(initial?.youtubeVideoId ? `https://youtu.be/${initial.youtubeVideoId}` : "");
  const [scheduledAt, setScheduledAt] = useState(toLocalInputValue(initial?.scheduledAt));
  const [file, setFile] = useState(null);
  const [removeNotes, setRemoveNotes] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const canEditSchedule = !editing || (initial.kind === "live" && initial.status === "scheduled");

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    if (!title.trim()) return setError("Enter the class name.");
    if (kind === "live" && canEditSchedule && !scheduledAt) return setError("Choose the date and time of the live class.");
    if (kind === "recorded" && !youtubeUrl.trim()) return setError("Paste the YouTube link of the video.");
    if (file && file.size > 25 * 1024 * 1024) return setError("Notes PDF must be under 25 MB.");

    const form = new FormData();
    form.append("title", title.trim());
    form.append("description", description.trim());
    form.append("youtubeUrl", youtubeUrl.trim());
    if (scheduledAt) form.append("scheduledAt", new Date(scheduledAt).toISOString());
    if (!editing) {
      form.append("kind", kind);
      form.append("folderId", folder._id);
    }
    if (file) form.append("file", file);
    if (removeNotes && !file) form.append("removeNotes", "true");

    setSaving(true);
    try {
      const res = editing
        ? await api.post(`/teacher/classes/${initial._id}/update`, form, { timeout: 120000 })
        : await api.post("/teacher/classes", form, { timeout: 120000 });
      onSaved(res.data.message);
    } catch (err) {
      setError(errorText(err, "Could not save the class."));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal title={editing ? "Edit class" : `Add class — ${folder.name}`} onClose={onClose}>
      <form onSubmit={submit} className="space-y-3.5">
        {!editing && (
          <div className="grid grid-cols-2 gap-2">
            {[
              { v: "live", t: "🔴 Live class", d: "Schedule a YouTube live" },
              { v: "recorded", t: "▶ Recorded video", d: "Already on YouTube" },
            ].map((o) => (
              <button
                type="button"
                key={o.v}
                onClick={() => setKind(o.v)}
                className={`text-left p-3 rounded-xl border ${kind === o.v ? "border-[#7C3AED] bg-[#7C3AED]/10" : "border-gray-700"}`}
              >
                <p className="text-sm font-semibold">{o.t}</p>
                <p className="text-[11px] text-gray-500">{o.d}</p>
              </button>
            ))}
          </div>
        )}

        <div>
          <label className="text-xs text-gray-400">Class name *</label>
          <input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={150} placeholder="e.g. Percentage — Class 1" className={inputCls} />
        </div>

        {kind === "live" && canEditSchedule && (
          <div>
            <label className="text-xs text-gray-400">Date & time *</label>
            <input type="datetime-local" value={scheduledAt} onChange={(e) => setScheduledAt(e.target.value)} className={inputCls} />
          </div>
        )}

        <div>
          <label className="text-xs text-gray-400">
            YouTube link {kind === "recorded" ? "*" : "(you can add it later, before going live)"}
          </label>
          <input
            value={youtubeUrl}
            onChange={(e) => setYoutubeUrl(e.target.value)}
            placeholder="https://youtube.com/live/..."
            className={inputCls}
          />
        </div>
        {kind === "live" && <HowToLive />}

        <div>
          <label className="text-xs text-gray-400">Description (optional)</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            maxLength={2000}
            rows={3}
            placeholder="What will be covered in this class?"
            className={inputCls}
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-xs text-gray-400">Class notes (PDF, optional)</label>
          {editing && initial.note && !file && (
            <div className="flex items-center justify-between gap-2 text-xs bg-[#0A0D14] border border-gray-800 rounded-xl px-3 py-2">
              <span className={removeNotes ? "line-through text-gray-600" : "text-gray-300"}>📄 {initial.note.title || "Current notes"}</span>
              <button type="button" onClick={() => setRemoveNotes((v) => !v)} className="text-red-400">
                {removeNotes ? "Keep" : "Remove"}
              </button>
            </div>
          )}
          <input
            type="file"
            accept="application/pdf"
            onChange={(e) => setFile(e.target.files?.[0] || null)}
            className="block w-full text-xs text-gray-400 file:mr-3 file:px-3 file:py-2 file:rounded-lg file:border-0 file:bg-[#7C3AED] file:text-white"
          />
          <p className="text-[11px] text-gray-600">Students read notes inside the app (and offline) — they cannot download the file.</p>
        </div>

        {error && <p className="text-xs text-red-400">{error}</p>}
        <button type="submit" disabled={saving} className="w-full py-3 rounded-xl bg-[#7C3AED] font-bold text-sm disabled:opacity-60">
          {saving ? (file ? "Uploading notes..." : "Saving...") : editing ? "Save changes" : "Add class"}
        </button>
      </form>
    </Modal>
  );
};

const GoLiveModal = ({ cls, onClose, onDone }) => {
  const [link, setLink] = useState(cls.youtubeVideoId ? `https://youtu.be/${cls.youtubeVideoId}` : "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const start = async () => {
    setBusy(true);
    setError("");
    try {
      const res = await api.post(`/teacher/classes/${cls._id}/status`, { action: "start", youtubeUrl: link.trim() });
      onDone(res.data.message);
    } catch (err) {
      setError(errorText(err, "Could not start the class."));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal title={`Go live — ${cls.title}`} onClose={onClose}>
      <p className="text-xs text-gray-400">Start the live stream on YouTube first, then paste its link and press Go Live.</p>
      <input value={link} onChange={(e) => setLink(e.target.value)} placeholder="https://youtube.com/live/..." className={inputCls} />
      <HowToLive />
      {error && <p className="text-xs text-red-400">{error}</p>}
      <button onClick={start} disabled={busy || !link.trim()} className="w-full py-3 rounded-xl bg-red-600 font-bold text-sm disabled:opacity-60">
        {busy ? "Starting..." : "🔴 Go Live"}
      </button>
    </Modal>
  );
};

const TeacherClasses = () => {
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const subjectId = params.get("s");
  const topicId = params.get("t");
  const [flash, setFlash] = useState(null);
  const [form, setForm] = useState(null); // { initial?, folder }
  const [goLive, setGoLive] = useState(null);
  const [newFolder, setNewFolder] = useState(null); // { kind, name }
  const [busyId, setBusyId] = useState(null);

  const meQuery = useQuery({
    queryKey: ["teacher-me"],
    queryFn: async () => (await api.get("/teacher-me")).data.data,
    retry: false,
  });
  const teacher = meQuery.data;

  const classesQuery = useQuery({
    queryKey: ["teacher-classes", teacher?.activeCoupon],
    queryFn: async () => (await api.get("/teacher/classes")).data.data,
    enabled: Boolean(teacher?.activeCoupon),
    retry: false,
  });
  const data = classesQuery.data;

  useEffect(() => {
    if (meQuery.error?.response?.status === 401 || classesQuery.error?.response?.status === 401) navigate("/TeacherLogin");
  }, [meQuery.error, classesQuery.error, navigate]);

  const folders = useMemo(() => data?.folders || [], [data]);
  const classes = useMemo(() => data?.classes || [], [data]);
  const subjectFolder = folders.find((f) => f._id === subjectId && f.kind === "subject") || null;
  const topicFolder = folders.find((f) => f._id === topicId && f.kind === "topic") || null;
  const currentFolder = topicFolder || subjectFolder;

  const showFlash = (text, ok = true) => {
    setFlash({ text, ok });
    setTimeout(() => setFlash(null), 3500);
  };
  const reload = () => classesQuery.refetch();
  const goTo = (s, t) => {
    const next = {};
    if (s) next.s = s;
    if (t) next.t = t;
    setParams(next);
  };

  const countIn = (folderId) => {
    const ids = new Set([folderId, ...folders.filter((f) => f.parent === folderId).map((f) => f._id)]);
    return classes.filter((c) => ids.has(c.folder)).length;
  };

  const createFolder = async () => {
    const name = (newFolder?.name || "").trim();
    if (!name) return;
    try {
      const res = await api.post("/teacher/classes/folders", {
        kind: newFolder.kind,
        name,
        parentId: newFolder.kind === "topic" ? subjectFolder._id : undefined,
      });
      setNewFolder(null);
      showFlash(res.data.message);
      reload();
    } catch (err) {
      showFlash(errorText(err, "Could not create the folder."), false);
    }
  };

  const renameFolder = async (f) => {
    const name = window.prompt("New folder name", f.name);
    if (!name || name.trim() === f.name) return;
    try {
      const res = await api.patch(`/teacher/classes/folders/${f._id}`, { name: name.trim() });
      showFlash(res.data.message);
      reload();
    } catch (err) {
      showFlash(errorText(err, "Could not rename the folder."), false);
    }
  };

  const deleteFolder = async (f) => {
    if (!window.confirm(`Delete the folder "${f.name}"?`)) return;
    try {
      const res = await api.delete(`/teacher/classes/folders/${f._id}`);
      showFlash(res.data.message);
      if (f._id === subjectId || f._id === topicId) goTo(f.kind === "topic" ? subjectId : undefined);
      reload();
    } catch (err) {
      showFlash(errorText(err, "Could not delete the folder."), false);
    }
  };

  const classAction = async (c, action, confirmText) => {
    if (confirmText && !window.confirm(confirmText)) return;
    setBusyId(c._id);
    try {
      const res =
        action === "delete"
          ? await api.delete(`/teacher/classes/${c._id}`)
          : await api.post(`/teacher/classes/${c._id}/status`, { action });
      showFlash(res.data.message);
      reload();
    } catch (err) {
      showFlash(errorText(err, "Something went wrong."), false);
    } finally {
      setBusyId(null);
    }
  };

  const subjectFolders = folders.filter((f) => f.kind === "subject");
  const topicFolders = subjectFolder ? folders.filter((f) => f.parent === subjectFolder._id) : [];
  const folderClasses = currentFolder ? classes.filter((c) => c.folder === currentFolder._id) : [];
  const liveNow = classes.filter((c) => c.status === "live");
  const isMain = data?.role === "main";
  const unusedSubjects = (data?.allowedSubjects || []).filter(
    (s) => !subjectFolders.some((f) => f.name.toLowerCase() === s.toLowerCase())
  );

  const folderRow = (f, icon, onOpen) => (
    <div key={f._id} className="flex items-center gap-2 bg-[#111827] border border-gray-800 rounded-2xl p-3.5">
      <button onClick={onOpen} className="flex-1 min-w-0 flex items-center gap-3 text-left">
        <span className="text-2xl">{icon}</span>
        <div className="min-w-0">
          <p className="text-sm font-semibold truncate">{f.name}</p>
          <p className="text-[11px] text-gray-500">{countIn(f._id)} classes</p>
        </div>
      </button>
      {(f.kind === "topic" || isMain) && (
        <button onClick={() => renameFolder(f)} className="text-[11px] px-2 py-1 rounded-lg border border-gray-700 text-gray-300">
          Rename
        </button>
      )}
      <button onClick={() => deleteFolder(f)} className="text-[11px] px-2 py-1 rounded-lg border border-red-500/30 text-red-400">
        Delete
      </button>
    </div>
  );

  const classCard = (c) => {
    const badge = classStatusBadge(c);
    const busy = busyId === c._id;
    const btn = "text-[11px] px-2.5 py-1.5 rounded-lg border font-semibold disabled:opacity-50";
    return (
      <div key={c._id} className={`bg-[#111827] border rounded-2xl p-4 space-y-3 ${c.status === "live" ? "border-red-500/50" : "border-gray-800"}`}>
        <div className="flex items-start gap-3">
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold">{c.title}</p>
            <div className="flex items-center gap-1.5 mt-1 flex-wrap">
              <span className={`text-[10px] px-2 py-0.5 rounded-full border ${badge.cls}`}>{badge.text}</span>
              {c.note && <span className="text-[10px] px-2 py-0.5 rounded-full border border-gray-700 text-gray-300">📄 Notes</span>}
              {c.hidden && <span className="text-[10px] px-2 py-0.5 rounded-full border border-gray-600 text-gray-400">Hidden</span>}
              {!c.youtubeVideoId && c.status === "scheduled" && (
                <span className="text-[10px] text-amber-400">YouTube link not added yet</span>
              )}
            </div>
            <p className="text-[11px] text-gray-500 mt-1.5">
              👥 {c.viewers} joined{c.openDoubts > 0 ? ` · 💬 ${c.openDoubts} unanswered doubts` : ""}
              {c.createdBy?.name ? ` · by ${c.createdBy.name}` : ""}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {c.status === "scheduled" && (
            <button onClick={() => setGoLive(c)} disabled={busy} className={`${btn} bg-red-600 border-red-600 text-white`}>
              🔴 Go Live
            </button>
          )}
          {c.status === "live" && (
            <button
              onClick={() => classAction(c, "end", "End this live class? Students will then see it as a recording.")}
              disabled={busy}
              className={`${btn} bg-gray-200 border-gray-200 text-black`}
            >
              ⏹ End class
            </button>
          )}
          <button onClick={() => navigate(`/TeacherClassDetail/${c._id}`)} className={`${btn} border-[#7C3AED]/50 text-[#C4B5FD]`}>
            Attendance & doubts
          </button>
          {c.status !== "cancelled" && (
            <button onClick={() => setForm({ initial: c, folder: currentFolder })} className={`${btn} border-gray-700 text-gray-300`}>
              Edit
            </button>
          )}
          {c.status === "scheduled" && (
            <button onClick={() => classAction(c, "cancel", "Cancel this class?")} disabled={busy} className={`${btn} border-gray-700 text-gray-300`}>
              Cancel
            </button>
          )}
          {c.status === "cancelled" && (
            <button onClick={() => classAction(c, "restore")} disabled={busy} className={`${btn} border-gray-700 text-gray-300`}>
              Restore
            </button>
          )}
          {c.status === "ended" && (
            <button onClick={() => classAction(c, c.hidden ? "unhide" : "hide")} disabled={busy} className={`${btn} border-gray-700 text-gray-300`}>
              {c.hidden ? "Show" : "Hide"}
            </button>
          )}
          {c.status !== "live" && (
            <button
              onClick={() => classAction(c, "delete", `Delete "${c.title}"? Its notes, attendance and doubts will also be deleted.`)}
              disabled={busy}
              className={`${btn} border-red-500/30 text-red-400`}
            >
              Delete
            </button>
          )}
        </div>
      </div>
    );
  };

  const loading = meQuery.isLoading || (teacher?.activeCoupon && classesQuery.isLoading);

  return (
    <div className="min-h-screen bg-[#0A0D14] text-white px-4 sm:px-6 py-6 pb-28">
      <div className="max-w-2xl mx-auto space-y-4">
        <div className="flex items-center gap-3">
          <button onClick={() => (topicFolder ? goTo(subjectId) : subjectFolder ? goTo() : navigate("/TeacherContent"))} className="text-gray-400 text-xl">
            ←
          </button>
          <div className="min-w-0">
            <h1 className="text-xl font-bold">🎥 Video Classes</h1>
            <p className="text-xs text-gray-500">Live classes, recordings and notes for your batch</p>
          </div>
        </div>

        <ActiveCouponSwitcher activeCouponId={teacher?.activeCoupon} onChanged={() => { goTo(); meQuery.refetch(); }} />

        {flash && (
          <div className={`text-sm rounded-xl px-4 py-2.5 border ${flash.ok ? "bg-green-500/10 border-green-500/30 text-green-300" : "bg-red-500/10 border-red-500/30 text-red-300"}`}>
            {flash.text}
          </div>
        )}

        {loading ? (
          [1, 2, 3].map((i) => <div key={i} className="h-16 rounded-2xl bg-gray-800/70 animate-pulse" />)
        ) : !teacher?.activeCoupon ? (
          <div className="bg-[#111827] border border-gray-800 rounded-2xl p-6 text-center text-sm text-gray-400">
            Select a batch above to manage its classes.
          </div>
        ) : classesQuery.error ? (
          <div className="bg-[#111827] border border-gray-800 rounded-2xl p-6 text-center space-y-3">
            <p className="text-sm text-gray-400">{errorText(classesQuery.error, "Could not load classes.")}</p>
            <button onClick={reload} className="px-4 py-2 rounded-xl bg-[#7C3AED] text-sm font-semibold">
              Try again
            </button>
          </div>
        ) : (
          <>
            {/* Breadcrumb */}
            <div className="flex items-center gap-1.5 text-xs text-gray-400 flex-wrap">
              <button onClick={() => goTo()} className={!subjectFolder ? "text-white font-semibold" : "hover:text-white"}>
                {data?.batch?.name || "Batch"}
              </button>
              {subjectFolder && (
                <>
                  <span>›</span>
                  <button onClick={() => goTo(subjectFolder._id)} className={!topicFolder ? "text-white font-semibold" : "hover:text-white"}>
                    {subjectFolder.name}
                  </button>
                </>
              )}
              {topicFolder && (
                <>
                  <span>›</span>
                  <span className="text-white font-semibold">{topicFolder.name}</span>
                </>
              )}
            </div>

            {!subjectFolder && liveNow.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-semibold text-red-400 uppercase tracking-wider">Live now</p>
                {liveNow.map(classCard)}
              </div>
            )}

            {/* Action buttons */}
            <div className="flex flex-wrap gap-2">
              {!subjectFolder && (
                <button
                  onClick={() => setNewFolder({ kind: "subject", name: isMain ? "" : unusedSubjects[0] || "" })}
                  className="px-3.5 py-2 rounded-xl bg-[#7C3AED] text-xs font-bold"
                >
                  + Subject folder
                </button>
              )}
              {subjectFolder && !topicFolder && (
                <button onClick={() => setNewFolder({ kind: "topic", name: "" })} className="px-3.5 py-2 rounded-xl border border-[#7C3AED]/60 text-xs font-bold text-[#C4B5FD]">
                  + Topic folder
                </button>
              )}
              {currentFolder && (
                <button onClick={() => setForm({ folder: currentFolder })} className="px-3.5 py-2 rounded-xl bg-[#7C3AED] text-xs font-bold">
                  + Add class
                </button>
              )}
            </div>

            {newFolder && (
              <div className="bg-[#111827] border border-[#7C3AED]/40 rounded-2xl p-4 space-y-2.5">
                <p className="text-sm font-semibold">{newFolder.kind === "subject" ? "New subject folder" : `New topic folder in ${subjectFolder?.name}`}</p>
                {newFolder.kind === "subject" && !isMain ? (
                  unusedSubjects.length === 0 ? (
                    <p className="text-xs text-gray-500">All your subjects already have folders.</p>
                  ) : (
                    <select value={newFolder.name} onChange={(e) => setNewFolder({ ...newFolder, name: e.target.value })} className={inputCls}>
                      {unusedSubjects.map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </select>
                  )
                ) : (
                  <input
                    autoFocus
                    value={newFolder.name}
                    onChange={(e) => setNewFolder({ ...newFolder, name: e.target.value })}
                    onKeyDown={(e) => e.key === "Enter" && createFolder()}
                    maxLength={100}
                    placeholder={newFolder.kind === "subject" ? "e.g. Maths" : "e.g. Percentage"}
                    className={inputCls}
                  />
                )}
                <div className="flex gap-2">
                  <button onClick={createFolder} disabled={!newFolder.name.trim()} className="px-4 py-2 rounded-xl bg-[#7C3AED] text-xs font-bold disabled:opacity-50">
                    Create
                  </button>
                  <button onClick={() => setNewFolder(null)} className="px-4 py-2 rounded-xl border border-gray-700 text-xs">
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {/* Content */}
            {!subjectFolder ? (
              subjectFolders.length === 0 ? (
                <div className="bg-[#111827] border border-gray-800 rounded-2xl p-6 text-center space-y-2">
                  <p className="text-3xl">📚</p>
                  <p className="text-sm text-gray-300 font-semibold">Start with a subject folder</p>
                  <p className="text-xs text-gray-500">e.g. Maths → then topic folders like Percentage → then add classes inside them.</p>
                </div>
              ) : (
                <div className="space-y-2">{subjectFolders.map((f) => folderRow(f, "📚", () => goTo(f._id)))}</div>
              )
            ) : (
              <>
                {!topicFolder && topicFolders.length > 0 && (
                  <div className="space-y-2">{topicFolders.map((f) => folderRow(f, "📁", () => goTo(subjectFolder._id, f._id)))}</div>
                )}
                <div className="space-y-2.5">
                  {folderClasses.map(classCard)}
                  {folderClasses.length === 0 && (topicFolder || topicFolders.length === 0) && (
                    <p className="text-sm text-gray-500 text-center py-8">No classes here yet. Tap "+ Add class".</p>
                  )}
                </div>
              </>
            )}
          </>
        )}
      </div>

      {form && (
        <ClassForm
          initial={form.initial}
          folder={form.folder}
          onClose={() => setForm(null)}
          onSaved={(msg) => {
            setForm(null);
            showFlash(msg);
            reload();
          }}
        />
      )}
      {goLive && (
        <GoLiveModal
          cls={goLive}
          onClose={() => setGoLive(null)}
          onDone={(msg) => {
            setGoLive(null);
            showFlash(msg);
            reload();
          }}
        />
      )}
      <TeacherBottomNav />
    </div>
  );
};

export default TeacherClasses;
