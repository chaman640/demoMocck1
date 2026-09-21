import React, { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../api/api";
import TeacherBottomNav from "../../components/TeacherBottomNav";

const SkeletonBlock = ({ className = "" }) => (
  <div className={`bg-gray-800/70 rounded animate-pulse ${className}`} />
);

const parsePastedList = (text) => {
  return text
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const parts = line.split(",").map((p) => p.trim());
      if (parts.length >= 2) {
        return { name: parts[0], phone: parts[1].replace(/\D/g, "").slice(-10) };
      }
      return { name: "", phone: line.replace(/\D/g, "").slice(-10) };
    });
};

const downloadCsv = (filename, rows, headers) => {
  const escape = (v) => `"${String(v ?? "").replace(/"/g, '""')}"`;
  const csv = [headers.join(","), ...rows.map((r) => headers.map((h) => escape(r[h])).join(","))].join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
};

const AddStudentsPanel = ({ onImported }) => {
  const [mode, setMode] = useState("paste");
  const [pastedText, setPastedText] = useState("");
  const [preview, setPreview] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [importing, setImporting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [resultSummary, setResultSummary] = useState(null);
  const fileInputRef = useRef(null);

  const handlePreviewFromPaste = () => {
    setErrorMsg("");
    setResultSummary(null);
    const parsed = parsePastedList(pastedText).filter((r) => /^\d{10}$/.test(r.phone));
    if (parsed.length === 0) {
      setErrorMsg("No valid 10-digit phone numbers found. Use one student per line: Name, Phone");
      return;
    }
    setPreview(parsed);
  };

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setErrorMsg("");
    setResultSummary(null);
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await api.post("/teacher/bulk-students/parse-file", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setPreview(res.data.data || []);
    } catch (err) {
      setErrorMsg(err.response?.data?.message || "Could not read this file.");
      setPreview([]);
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const removeFromPreview = (idx) => setPreview((prev) => prev.filter((_, i) => i !== idx));

  const handleConfirmImport = async () => {
    if (preview.length === 0) return;
    setImporting(true);
    setErrorMsg("");
    try {
      const res = await api.post("/teacher/bulk-students/import", { students: preview });
      setResultSummary(res.data.data);
      setPreview([]);
      setPastedText("");
      onImported?.();
    } catch (err) {
      setErrorMsg(err.response?.data?.message || "Import failed.");
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="bg-[#111827] border border-gray-800 rounded-2xl overflow-hidden shadow-lg">
      <div className="px-4 sm:px-6 py-4 border-b border-gray-800 bg-[#1F2937]/30">
        <h3 className="font-semibold text-base sm:text-lg">Add Students to This Batch</h3>
        <p className="text-xs text-gray-500 mt-1">New phone numbers create fresh accounts (default password = their phone number). Existing students get moved into this batch.</p>
      </div>

      <div className="p-4 space-y-4">
        <div className="flex gap-2">
          {[
            { key: "paste", label: "Paste List" },
            { key: "file", label: "Upload Excel / PDF" },
          ].map((t) => (
            <button
              key={t.key}
              onClick={() => { setMode(t.key); setPreview([]); setErrorMsg(""); setResultSummary(null); }}
              className={`px-4 py-1.5 rounded-full text-sm transition-colors ${
                mode === t.key ? "bg-[#7C3AED] text-white" : "bg-[#1F2937] border border-gray-800 text-gray-400"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {mode === "paste" && (
          <div className="space-y-2">
            <textarea
              value={pastedText}
              onChange={(e) => setPastedText(e.target.value)}
              rows={6}
              placeholder={"One student per line:\nRahul Kumar, 9876543210\nPriya Sharma, 9123456789"}
              className="w-full px-3 py-2 text-sm bg-[#0A0D14] border border-gray-700 focus:border-[#7C3AED] rounded-lg outline-none text-white placeholder-gray-600 font-mono"
            />
            <button onClick={handlePreviewFromPaste} className="px-4 py-2 rounded-lg bg-[#1F2937] border border-gray-700 hover:border-gray-500 text-sm font-medium">
              Preview List
            </button>
          </div>
        )}

        {mode === "file" && (
          <div className="space-y-2">
            <label className="flex flex-col items-center justify-center gap-2 border-2 border-dashed border-gray-700 hover:border-[#7C3AED]/50 rounded-xl py-8 cursor-pointer transition-colors">
              <span className="text-2xl">📄</span>
              <span className="text-sm text-gray-300">{uploading ? "Reading file..." : "Tap to upload .xlsx, .csv, or .pdf"}</span>
              <span className="text-[11px] text-gray-500">Should contain a Name column and a Phone column (or a plain text list)</span>
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls,.csv,.pdf"
                onChange={handleFileChange}
                disabled={uploading}
                className="hidden"
              />
            </label>
          </div>
        )}

        {errorMsg && <div className="p-3 rounded-lg bg-red-500/10 text-red-400 border border-red-500/25 text-xs">{errorMsg}</div>}

        {preview.length > 0 && (
          <div className="space-y-3">
            <p className="text-xs text-gray-500">{preview.length} students found — review before adding</p>
            <div className="max-h-64 overflow-y-auto border border-gray-800 rounded-lg divide-y divide-gray-800">
              {preview.map((p, i) => (
                <div key={i} className="flex items-center gap-3 px-3 py-2 text-sm">
                  <span className="flex-1 text-gray-200 truncate">{p.name || <span className="text-gray-600">(no name)</span>}</span>
                  <span className="text-gray-400 font-mono text-xs">{p.phone}</span>
                  <button onClick={() => removeFromPreview(i)} className="text-gray-600 hover:text-red-400 text-xs flex-shrink-0">✕</button>
                </div>
              ))}
            </div>
            <button
              onClick={handleConfirmImport}
              disabled={importing}
              className="w-full py-3 rounded-xl bg-[#7C3AED] hover:bg-[#6D28D9] font-semibold disabled:opacity-50"
            >
              {importing ? "Adding..." : `Add ${preview.length} Students to Batch`}
            </button>
          </div>
        )}

        {resultSummary && (
          <div className="bg-[#1F2937] border border-gray-800 rounded-xl p-4 space-y-3">
            <p className="text-sm font-medium text-green-400">Import complete</p>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="bg-[#0A0D14] rounded-lg p-2"><p className="text-gray-500">New accounts</p><p className="text-lg font-bold text-white">{resultSummary.created.length}</p></div>
              <div className="bg-[#0A0D14] rounded-lg p-2"><p className="text-gray-500">Moved into batch</p><p className="text-lg font-bold text-white">{resultSummary.movedExisting.length}</p></div>
              <div className="bg-[#0A0D14] rounded-lg p-2"><p className="text-gray-500">Already here</p><p className="text-lg font-bold text-white">{resultSummary.alreadyInThisBatch.length}</p></div>
              <div className="bg-[#0A0D14] rounded-lg p-2"><p className="text-gray-500">Failed</p><p className="text-lg font-bold text-red-400">{resultSummary.failed.length}</p></div>
            </div>

            {resultSummary.created.length > 0 && (
              <button
                onClick={() => downloadCsv("new-student-logins.csv", resultSummary.created, ["name", "phone", "defaultPassword"])}
                className="w-full py-2 rounded-lg border border-gray-700 text-xs font-medium text-gray-300 hover:border-gray-500"
              >
                ⬇️ Download New Student Logins (Name, Phone, Password)
              </button>
            )}

            {resultSummary.failed.length > 0 && (
              <div className="text-xs text-red-400 space-y-1">
                {resultSummary.failed.slice(0, 5).map((f, i) => (
                  <p key={i}>{f.name || f.phone}: {f.reason}</p>
                ))}
                {resultSummary.failed.length > 5 && <p>...and {resultSummary.failed.length - 5} more</p>}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

const RosterPanel = () => {
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState(new Set());
  const [coupons, setCoupons] = useState([]);
  const [targetCoupon, setTargetCoupon] = useState("");
  const [actionMsg, setActionMsg] = useState("");
  const [busy, setBusy] = useState(false);

  const loadRoster = useCallback(async (searchTerm) => {
    setLoading(true);
    try {
      const res = await api.get("/teacher/bulk-students/roster", { params: { search: searchTerm } });
      setStudents(res.data.data || []);
    } catch (err) {
      setActionMsg(err.response?.data?.message || "Could not load the roster.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const t = setTimeout(() => loadRoster(search), 300);
    return () => clearTimeout(t);
  }, [search, loadRoster]);

  useEffect(() => {
    api.get("/teacher/bulk-students/my-coupons").then((res) => setCoupons(res.data.data || [])).catch(() => {});
  }, []);

  const toggleSelect = (id) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selected.size === students.length) setSelected(new Set());
    else setSelected(new Set(students.map((s) => s._id)));
  };

  const handleMove = async () => {
    if (!targetCoupon || selected.size === 0) return;
    setBusy(true);
    setActionMsg("");
    try {
      const res = await api.post("/teacher/bulk-students/move", {
        studentIds: Array.from(selected),
        targetCouponId: targetCoupon,
      });
      setActionMsg(res.data.message);
      setSelected(new Set());
      loadRoster(search);
    } catch (err) {
      setActionMsg(err.response?.data?.message || "Move failed.");
    } finally {
      setBusy(false);
    }
  };

  const handleRemove = async () => {
    if (selected.size === 0) return;
    if (!window.confirm(`Remove ${selected.size} student(s) from this batch?`)) return;
    setBusy(true);
    setActionMsg("");
    try {
      const res = await api.post("/teacher/bulk-students/remove", { studentIds: Array.from(selected) });
      setActionMsg(res.data.message);
      setSelected(new Set());
      loadRoster(search);
    } catch (err) {
      setActionMsg(err.response?.data?.message || "Remove failed.");
    } finally {
      setBusy(false);
    }
  };

  const handleExport = () => {
    downloadCsv(
      "batch-roster.csv",
      students.map((s) => ({ name: s.name, phone: s.phone, email: s.email, joined: new Date(s.createdAt).toLocaleDateString("en-IN") })),
      ["name", "phone", "email", "joined"]
    );
  };

  return (
    <div className="bg-[#111827] border border-gray-800 rounded-2xl overflow-hidden shadow-lg">
      <div className="px-4 sm:px-6 py-4 border-b border-gray-800 bg-[#1F2937]/30 flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h3 className="font-semibold text-base sm:text-lg">Batch Roster</h3>
          <p className="text-xs text-gray-500 mt-1">{students.length} students in this batch</p>
        </div>
        <button onClick={handleExport} className="px-3 py-1.5 rounded-lg border border-gray-700 text-xs font-medium text-gray-300 hover:border-gray-500 flex-shrink-0">
          ⬇️ Export CSV
        </button>
      </div>

      <div className="p-4 space-y-3">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name or phone..."
          className="w-full px-3 py-2 text-sm bg-[#0A0D14] border border-gray-700 focus:border-[#7C3AED] rounded-lg outline-none text-white placeholder-gray-600"
        />

        {actionMsg && <p className="text-xs text-gray-400">{actionMsg}</p>}

        {selected.size > 0 && (
          <div className="bg-[#1F2937] border border-gray-800 rounded-xl p-3 space-y-2">
            <p className="text-xs text-gray-400">{selected.size} student(s) selected</p>
            <div className="flex gap-2 flex-wrap">
              {coupons.length > 0 && (
                <>
                  <select
                    value={targetCoupon}
                    onChange={(e) => setTargetCoupon(e.target.value)}
                    className="flex-1 min-w-[140px] px-2 py-1.5 text-xs bg-[#0A0D14] border border-gray-700 rounded-lg text-white"
                  >
                    <option value="">Move to batch...</option>
                    {coupons.map((c) => (
                      <option key={c._id} value={c._id}>{c.name}</option>
                    ))}
                  </select>
                  <button onClick={handleMove} disabled={!targetCoupon || busy} className="px-3 py-1.5 rounded-lg bg-[#7C3AED] hover:bg-[#6D28D9] text-xs font-medium disabled:opacity-50">
                    Move
                  </button>
                </>
              )}
              <button onClick={handleRemove} disabled={busy} className="px-3 py-1.5 rounded-lg border border-red-500/40 text-red-400 hover:bg-red-500/10 text-xs font-medium disabled:opacity-50">
                Remove from Batch
              </button>
            </div>
          </div>
        )}

        {loading ? (
          <SkeletonBlock className="w-full h-40 rounded-lg" />
        ) : students.length === 0 ? (
          <p className="text-sm text-gray-500 text-center py-6">No students found.</p>
        ) : (
          <div className="border border-gray-800 rounded-lg overflow-hidden">
            <div className="flex items-center gap-3 px-3 py-2 bg-[#1F2937] text-xs text-gray-400">
              <input type="checkbox" checked={selected.size === students.length} onChange={toggleSelectAll} className="w-4 h-4 accent-[#7C3AED]" />
              <span>Select All</span>
            </div>
            <div className="max-h-80 overflow-y-auto divide-y divide-gray-800">
              {students.map((s) => (
                <label key={s._id} className="flex items-center gap-3 px-3 py-2.5 text-sm hover:bg-[#1F2937]/50 cursor-pointer">
                  <input type="checkbox" checked={selected.has(s._id)} onChange={() => toggleSelect(s._id)} className="w-4 h-4 accent-[#7C3AED] flex-shrink-0" />
                  <span className="flex-1 text-gray-200 truncate">{s.name}</span>
                  <span className="text-gray-500 text-xs font-mono flex-shrink-0">{s.phone}</span>
                </label>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

const TeacherBulkStudents = () => {
  const navigate = useNavigate();
  const [refreshKey, setRefreshKey] = useState(0);

  return (
    <div className="min-h-screen bg-[#0A0D14] text-white px-4 sm:px-6 py-8 pb-24">
      <div className="max-w-2xl mx-auto space-y-6">
        <button onClick={() => navigate("/TeacherClassAnalysis")} className="text-sm text-gray-400 hover:text-white flex items-center gap-1">&larr; Back</button>

        <div>
          <h1 className="text-2xl font-bold mb-1">Bulk Student Management</h1>
          <p className="text-gray-400 text-sm">Add hundreds of students at once, search your roster, and move or remove students in bulk</p>
        </div>

        <AddStudentsPanel onImported={() => setRefreshKey((k) => k + 1)} />
        <RosterPanel key={refreshKey} />
      </div>
      <TeacherBottomNav />
    </div>
  );
};

export default TeacherBulkStudents;
