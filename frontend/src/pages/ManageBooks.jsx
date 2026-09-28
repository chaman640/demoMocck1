import React, { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import api from "../api/api";

const MAX_FILE_BYTES = 25 * 1024 * 1024;

const SkeletonBlock = ({ className = "" }) => (
  <div className={`bg-gray-800/70 rounded animate-pulse ${className}`} />
);

const inputCls =
  "w-full px-4 py-2.5 text-sm bg-[#0A0D14] border border-gray-700 focus:border-[#7C3AED] rounded-xl outline-none text-white placeholder-gray-600";

const FilePicker = ({ label, hint, accept, file, existingUrl, onPick, preview }) => (
  <div>
    <label className="block text-[11px] font-semibold mb-1.5 uppercase tracking-wide text-gray-400">{label}</label>
    <label className="flex items-center gap-3 p-3 border border-dashed border-gray-700 hover:border-[#7C3AED] rounded-xl cursor-pointer transition-colors">
      {preview ? (
        <img src={preview} alt="preview" className="w-14 h-14 rounded-lg object-cover flex-shrink-0" />
      ) : (
        <div className="w-14 h-14 rounded-lg bg-[#0A0D14] flex items-center justify-center text-2xl flex-shrink-0">
          {accept.startsWith("image") ? "🖼️" : "📄"}
        </div>
      )}
      <div className="min-w-0">
        <p className="text-sm text-white truncate">{file ? file.name : existingUrl ? "Purani file lagi hai — badalne ke liye tap karein" : "File chunein"}</p>
        <p className="text-[11px] text-gray-500">{hint}</p>
      </div>
      <input
        type="file"
        accept={accept}
        className="hidden"
        onChange={(e) => onPick(e.target.files?.[0] || null)}
      />
    </label>
  </div>
);

const BookForm = ({ initial, onSaved, onCancel }) => {
  const isEdit = Boolean(initial);
  const [form, setForm] = useState({
    title: initial?.title || "",
    description: initial?.description || "",
    type: initial?.type || "digital",
    isFree: initial?.isFree ?? false,
    coinCost: initial?.coinCost ? String(initial.coinCost) : "",
    stockQuantity:
      initial && initial.stockQuantity !== null && initial.stockQuantity !== undefined
        ? String(initial.stockQuantity)
        : "",
  });
  const [coverFile, setCoverFile] = useState(null);
  const [digitalFile, setDigitalFile] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const coverPreview = useMemo(
    () => (coverFile ? URL.createObjectURL(coverFile) : initial?.coverImageUrl || ""),
    [coverFile, initial]
  );

  const setField = (name, value) => {
    setForm((prev) => ({ ...prev, [name]: value }));
    setError("");
  };

  const pickFile = (setter, file, kind) => {
    if (file && file.size > MAX_FILE_BYTES) {
      setError("File 25 MB se badi hai.");
      return;
    }
    if (file && kind === "image" && !file.type.startsWith("image/")) {
      setError("Cover ke liye sirf image chunein.");
      return;
    }
    setError("");
    setter(file);
  };

  const submit = async (e) => {
    e.preventDefault();
    if (!form.title.trim()) return setError("Book ka naam zaroori hai.");
    if (!form.isFree && !(Number(form.coinCost) > 0)) return setError("Paid book ke liye coins 0 se zyada hone chahiye.");
    if (!isEdit && form.type === "digital" && !digitalFile) return setError("Digital book ke liye file upload karna zaroori hai.");
    if (form.stockQuantity !== "" && (Number(form.stockQuantity) < 0 || Number.isNaN(Number(form.stockQuantity)))) {
      return setError("Stock sahi number hona chahiye.");
    }

    const fd = new FormData();
    fd.append("title", form.title.trim());
    fd.append("description", form.description.trim());
    fd.append("isFree", String(form.isFree));
    if (!form.isFree) fd.append("coinCost", String(Number(form.coinCost)));
    if (!isEdit) fd.append("type", form.type);
    if (form.type === "physical") fd.append("stockQuantity", form.stockQuantity);
    if (coverFile) fd.append("coverImage", coverFile);
    if (digitalFile) fd.append("digitalFile", digitalFile);

    setSaving(true);
    try {
      if (isEdit) {
        await api.post(`/admin/books/${initial._id}/update`, fd);
      } else {
        await api.post("/admin/books", fd);
      }
      onSaved(isEdit ? "Book update ho gayi!" : "Book add ho gayi!");
    } catch (err) {
      setError(err.response?.data?.message || "Save nahi ho paya.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70 px-0 sm:px-4">
      <form
        onSubmit={submit}
        className="bg-[#111827] border border-gray-800 rounded-t-2xl sm:rounded-2xl w-full sm:max-w-lg p-5 max-h-[92vh] overflow-y-auto space-y-4"
      >
        <div>
          <h3 className="font-bold text-lg">{isEdit ? "Book Edit Karein" : "Nayi Book Add Karein"}</h3>
          <p className="text-xs text-gray-500">Ye students ko Rewards Store mein dikhegi.</p>
        </div>

        {error && (
          <div className="p-3 bg-red-500/10 text-red-400 border border-red-500/25 rounded-xl text-xs text-center">{error}</div>
        )}

        <div>
          <label className="block text-[11px] font-semibold mb-1.5 uppercase tracking-wide text-gray-400">Naam</label>
          <input value={form.title} onChange={(e) => setField("title", e.target.value)} placeholder="Jaise: UP Police Constable Practice Set" className={inputCls} />
        </div>

        <div>
          <label className="block text-[11px] font-semibold mb-1.5 uppercase tracking-wide text-gray-400">Description</label>
          <textarea value={form.description} onChange={(e) => setField("description", e.target.value)} rows={2} placeholder="Chhota sa vivaran (optional)" className={`${inputCls} resize-none`} />
        </div>

        <div>
          <label className="block text-[11px] font-semibold mb-1.5 uppercase tracking-wide text-gray-400">Type</label>
          <div className="grid grid-cols-2 gap-2">
            {[
              { v: "digital", label: "📄 Digital (PDF)" },
              { v: "physical", label: "📦 Physical (Dak se)" },
            ].map((opt) => (
              <button
                key={opt.v}
                type="button"
                disabled={isEdit}
                onClick={() => setField("type", opt.v)}
                className={`py-2.5 rounded-xl text-sm font-medium border transition-colors ${
                  form.type === opt.v
                    ? "bg-[#7C3AED] border-[#7C3AED] text-white"
                    : "bg-[#0A0D14] border-gray-700 text-gray-400"
                } ${isEdit ? "opacity-60 cursor-not-allowed" : ""}`}
              >
                {opt.label}
              </button>
            ))}
          </div>
          {isEdit && <p className="text-[11px] text-gray-600 mt-1">Type baad mein badla nahi ja sakta.</p>}
        </div>

        <div className="flex items-center justify-between bg-[#0A0D14] border border-gray-800 rounded-xl px-4 py-3">
          <div>
            <p className="text-sm font-medium">Free hai?</p>
            <p className="text-[11px] text-gray-500">
              {form.type === "physical" ? "Free physical book har student ko sirf 1 baar milegi" : "Free book koi bhi student le sakta hai"}
            </p>
          </div>
          <button
            type="button"
            onClick={() => setField("isFree", !form.isFree)}
            className={`w-12 h-7 rounded-full transition-colors relative flex-shrink-0 ${form.isFree ? "bg-green-500" : "bg-gray-700"}`}
          >
            <span className={`absolute top-1 w-5 h-5 rounded-full bg-white transition-all ${form.isFree ? "left-6" : "left-1"}`} />
          </button>
        </div>

        {!form.isFree && (
          <div>
            <label className="block text-[11px] font-semibold mb-1.5 uppercase tracking-wide text-gray-400">Coins (Price)</label>
            <div className="relative">
              <span className="absolute inset-y-0 left-3 flex items-center text-base">🪙</span>
              <input type="number" min="1" value={form.coinCost} onChange={(e) => setField("coinCost", e.target.value)} placeholder="Jaise: 100" className={`${inputCls} pl-10`} />
            </div>
          </div>
        )}

        {form.type === "physical" && (
          <div>
            <label className="block text-[11px] font-semibold mb-1.5 uppercase tracking-wide text-gray-400">Stock (kitni copies)</label>
            <input type="number" min="0" value={form.stockQuantity} onChange={(e) => setField("stockQuantity", e.target.value)} placeholder="Khaali chhodne par unlimited" className={inputCls} />
          </div>
        )}

        <FilePicker
          label="Cover Image"
          hint="JPG/PNG, 25 MB tak"
          accept="image/*"
          file={coverFile}
          existingUrl={initial?.coverImageUrl}
          preview={coverPreview}
          onPick={(f) => pickFile(setCoverFile, f, "image")}
        />

        {form.type === "digital" && (
          <FilePicker
            label="Book File"
            hint="PDF/ePub, 25 MB tak"
            accept=".pdf,.epub,application/pdf"
            file={digitalFile}
            existingUrl={initial?.digitalFileUrl}
            onPick={(f) => pickFile(setDigitalFile, f, "file")}
          />
        )}

        <div className="flex gap-3 pt-1">
          <button type="button" onClick={onCancel} className="flex-1 py-3 rounded-xl border border-gray-700 text-gray-300 text-sm font-medium">
            Cancel
          </button>
          <button type="submit" disabled={saving} className="flex-1 py-3 rounded-xl bg-[#7C3AED] hover:bg-[#6D28D9] text-sm font-semibold disabled:opacity-50">
            {saving ? "Save ho raha hai..." : isEdit ? "Update Karein" : "Add Karein"}
          </button>
        </div>
      </form>
    </div>
  );
};

const BookRow = ({ book, onEdit, onToggle, toggling }) => {
  const hidden = book.status === "hidden";
  return (
    <div className={`bg-[#111827] border border-gray-800 rounded-2xl p-3 flex gap-3 ${hidden ? "opacity-60" : ""}`}>
      <div className="w-20 h-20 rounded-xl bg-[#0A0D14] flex-shrink-0 overflow-hidden flex items-center justify-center">
        {book.coverImageUrl ? (
          <img src={book.coverImageUrl} alt={book.title} className="w-full h-full object-cover" />
        ) : (
          <span className="text-3xl">📘</span>
        )}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-white truncate">{book.title}</p>
        <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-gray-800 text-gray-300 border border-gray-700">
            {book.type === "digital" ? "📄 Digital" : "📦 Physical"}
          </span>
          {book.isFree ? (
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-green-500/15 text-green-400 border border-green-500/30 font-semibold">FREE</span>
          ) : (
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-300 border border-amber-500/30 font-semibold">🪙 {book.coinCost}</span>
          )}
          {book.type === "physical" && (
            <span
              className={`text-[10px] px-2 py-0.5 rounded-full border ${
                book.stockQuantity === 0
                  ? "bg-red-500/15 text-red-400 border-red-500/30"
                  : "bg-gray-800 text-gray-400 border-gray-700"
              }`}
            >
              {book.stockQuantity === null || book.stockQuantity === undefined ? "Stock: Unlimited" : `Stock: ${book.stockQuantity}`}
            </span>
          )}
          {hidden && (
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-red-500/15 text-red-400 border border-red-500/30">Hidden</span>
          )}
        </div>
        <div className="flex gap-2 mt-2.5">
          <button onClick={() => onEdit(book)} className="text-[11px] px-3 py-1.5 rounded-lg border border-gray-700 text-gray-300 hover:border-gray-500">
            Edit
          </button>
          <button
            onClick={() => onToggle(book)}
            disabled={toggling}
            className={`text-[11px] px-3 py-1.5 rounded-lg border disabled:opacity-50 ${
              hidden
                ? "border-green-500/30 text-green-400 hover:bg-green-500/10"
                : "border-red-500/30 text-red-400 hover:bg-red-500/10"
            }`}
          >
            {hidden ? "Show Karein" : "Hide Karein"}
          </button>
        </div>
      </div>
    </div>
  );
};

const ManageBooks = () => {
  const navigate = useNavigate();
  const [phase, setPhase] = useState("loading");
  const [books, setBooks] = useState([]);
  const [formState, setFormState] = useState(null);
  const [message, setMessage] = useState("");
  const [togglingId, setTogglingId] = useState(null);

  const load = async () => {
    try {
      const res = await api.get("/admin/books");
      setBooks(res.data.data || []);
      setPhase("ready");
    } catch (err) {
      const status = err.response?.status;
      setPhase(status === 401 || status === 403 ? "noauth" : "error");
    }
  };

  useEffect(() => {
    load();
  }, []);

  const handleSaved = (msg) => {
    setFormState(null);
    setMessage(msg);
    load();
  };

  const handleToggle = async (book) => {
    setTogglingId(book._id);
    try {
      await api.post(`/admin/books/${book._id}/status`, {
        status: book.status === "hidden" ? "active" : "hidden",
      });
      await load();
    } catch (err) {
      setMessage(err.response?.data?.message || "Status badal nahi paya.");
    } finally {
      setTogglingId(null);
    }
  };

  if (phase === "noauth") {
    return (
      <div className="min-h-screen bg-[#0A0D14] text-white flex items-center justify-center px-6">
        <div className="w-full max-w-sm bg-[#111827] border border-gray-800 rounded-2xl p-6 text-center space-y-4">
          <div className="text-4xl">🔒</div>
          <p className="text-sm text-gray-300">Books manage karne ke liye Admin ya Teacher login zaroori hai.</p>
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
      <header className="flex items-center justify-between px-4 py-3.5 border-b border-gray-800 sticky top-0 bg-[#0A0D14] z-10">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="text-gray-400 text-xl leading-none">←</button>
          <h1 className="text-base font-bold">Manage Books</h1>
        </div>
        <button
          onClick={() => navigate("/ManageBookOrders")}
          className="text-xs px-3 py-1.5 rounded-lg border border-gray-700 text-gray-300 hover:border-gray-500"
        >
          📦 Orders
        </button>
      </header>

      <main className="px-4 py-4 max-w-2xl mx-auto space-y-4">
        {message && (
          <div className="p-3 bg-green-500/10 text-green-400 border border-green-500/25 rounded-xl text-sm text-center">{message}</div>
        )}

        <button
          onClick={() => {
            setMessage("");
            setFormState({ book: null });
          }}
          className="w-full py-3 rounded-2xl bg-gradient-to-r from-[#7C3AED] to-[#6D28D9] font-semibold text-sm shadow-lg shadow-purple-900/20 active:scale-[0.98] transition-transform"
        >
          + Nayi Book Add Karein
        </button>

        {phase === "loading" && [1, 2, 3].map((i) => <SkeletonBlock key={i} className="w-full h-28 rounded-2xl" />)}

        {phase === "error" && <p className="text-sm text-gray-500 text-center py-10">Books load nahi ho payi.</p>}

        {phase === "ready" && books.length === 0 && (
          <div className="text-center py-14 space-y-2">
            <p className="text-4xl">📚</p>
            <p className="text-sm text-gray-500">Abhi tak koi book add nahi hui hai.</p>
          </div>
        )}

        {phase === "ready" &&
          books.map((book) => (
            <BookRow
              key={book._id}
              book={book}
              toggling={togglingId === book._id}
              onEdit={(b) => {
                setMessage("");
                setFormState({ book: b });
              }}
              onToggle={handleToggle}
            />
          ))}
      </main>

      {formState && (
        <BookForm initial={formState.book} onSaved={handleSaved} onCancel={() => setFormState(null)} />
      )}
    </div>
  );
};

export default ManageBooks;
