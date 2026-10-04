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
  const [manualLink, setManualLink] = useState("");

  const handleChange = (e) => setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setStatus("submitting");
    setMessage("");
    setManualLink("");
    try {
      const examList = form.examName.split(",").map((s) => s.trim()).filter(Boolean);
      const res = await api.post("/admin/create-main-teacher", { ...form, examName: examList });
      const { emailSent, inviteLink } = res.data.data || {};
      // Email fail hua to link yahin dikhao — admin khud WhatsApp/SMS kar de
      if (emailSent === false && inviteLink) {
        setMessage("✅ Teacher created, but the email could not be sent. Send this link to the teacher yourself:");
        setManualLink(inviteLink);
      } else {
        setMessage("✅ Invite email sent!");
      }
      setForm({ name: "", email: "", phone: "", examName: "" });
      setStatus("idle");
    } catch (err) {
      setMessage(err.response?.data?.message || "Something went wrong.");
      setStatus("idle");
    }
  };

  return (
    <div className="bg-[#111827] border border-gray-800 rounded-2xl p-5 sm:p-6">
      <h3 className="font-semibold text-base mb-1">Create a New Main Teacher</h3>
      <p className="text-xs text-gray-500 mb-4">An invite link will be sent to the teacher's email; they will set their own password</p>

      {message && (
        <div className={`mb-4 p-3 rounded-lg text-xs text-center ${message.startsWith("✅") ? "bg-green-500/10 text-green-400" : "bg-red-500/10 text-red-400"}`}>
          {message}
          {manualLink && (
            <input
              readOnly
              value={manualLink}
              onFocus={(e) => e.target.select()}
              className="mt-2 w-full px-3 py-2 rounded-lg bg-[#0A0D14] border border-gray-700 text-gray-200 text-[11px] font-mono"
            />
          )}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-3">
        <input name="name" value={form.name} onChange={handleChange} placeholder="Name" required className="w-full px-4 py-2.5 text-sm bg-[#0A0D14] border border-gray-700 focus:border-[#7C3AED] rounded-xl outline-none text-white placeholder-gray-600" />
        <input name="email" type="email" value={form.email} onChange={handleChange} placeholder="email@example.com" required className="w-full px-4 py-2.5 text-sm bg-[#0A0D14] border border-gray-700 focus:border-[#7C3AED] rounded-xl outline-none text-white placeholder-gray-600" />
        <input name="phone" value={form.phone} onChange={handleChange} placeholder="10-digit phone" required className="w-full px-4 py-2.5 text-sm bg-[#0A0D14] border border-gray-700 focus:border-[#7C3AED] rounded-xl outline-none text-white placeholder-gray-600" />
        <input name="examName" value={form.examName} onChange={handleChange} placeholder="Exams, comma separated (e.g. UPSC, SSC CGL)" className="w-full px-4 py-2.5 text-sm bg-[#0A0D14] border border-gray-700 focus:border-[#7C3AED] rounded-xl outline-none text-white placeholder-gray-600" />
        <button type="submit" disabled={status === "submitting"} className="w-full py-2.5 rounded-xl bg-[#7C3AED] hover:bg-[#6D28D9] font-semibold text-sm transition-colors disabled:opacity-50">
          {status === "submitting" ? "Sending..." : "Send Invite"}
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
const JsonActionCard = ({ title, description, endpoint, placeholder, aiHint }) => {
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
      setMessage("✅ Done!");
    } catch (err) {
      if (err instanceof SyntaxError) {
        setMessage("❌ Invalid JSON format — please check.");
      } else {
        setMessage(err.response?.data?.message || "Something went wrong.");
      }
    } finally {
      setStatus("idle");
    }
  };

  // 🆕 Demo JSON + samjhaane wala prompt ek saath copy — kisi AI chatbot ko dene ke liye
  const copyDemoForAI = async () => {
    const text = `${aiHint}\n\n${placeholder}`;
    try {
      await navigator.clipboard.writeText(text);
      setMessage("📋 Demo JSON + prompt copied — paste it into an AI chatbot.");
    } catch {
      setMessage("❌ Could not copy.");
    }
  };

  return (
    <details className="bg-[#111827] border border-gray-800 rounded-2xl overflow-hidden">
      <summary className="px-5 py-4 cursor-pointer font-semibold text-sm">{title}</summary>
      <div className="px-5 pb-5">
        <p className="text-xs text-gray-500 mb-3">{description}</p>
        {message && (
          <div className={`mb-3 p-2.5 rounded-lg text-xs text-center ${message.startsWith("✅") || message.startsWith("📋") ? "bg-green-500/10 text-green-400" : "bg-red-500/10 text-red-400"}`}>
            {message}
          </div>
        )}
        {aiHint && (
          <button type="button" onClick={copyDemoForAI} className="w-full mb-3 py-2 rounded-lg bg-[#1F2937] border border-[#7C3AED]/40 text-[#A78BFA] text-xs font-medium hover:bg-[#7C3AED]/10">
            📋 Copy Demo JSON + AI Prompt
          </button>
        )}
        <form onSubmit={handleSubmit}>
          <textarea
            value={raw}
            onChange={(e) => setRaw(e.target.value)}
            rows={8}
            className="w-full px-3 py-2.5 text-xs font-mono bg-[#0A0D14] border border-gray-700 focus:border-[#7C3AED] rounded-xl outline-none text-white"
          />
          <button type="submit" disabled={status === "submitting"} className="mt-3 w-full py-2.5 rounded-xl bg-[#1F2937] border border-[#7C3AED]/40 text-[#A78BFA] text-sm font-medium hover:bg-[#7C3AED]/10 disabled:opacity-50">
            {status === "submitting" ? "Sending..." : "Submit"}
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
      setMessage(err.response?.data?.message || "Something went wrong.");
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
      setMessage(err.response?.data?.message || "Could not delete.");
    }
  };

  return (
    <div className="bg-[#111827] border border-gray-800 rounded-2xl p-5 sm:p-6">
      <h3 className="font-semibold text-base mb-1">Manage Exam Names</h3>
      <p className="text-xs text-gray-500 mb-4">A new exam added here appears immediately in signup/dropdowns</p>

      {message && (
        <div className="mb-4 p-3 rounded-lg text-xs text-center bg-red-500/10 text-red-400">{message}</div>
      )}

      <form onSubmit={handleAdd} className="flex gap-2 mb-4">
        <input
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          placeholder="e.g. UPSSSC PET"
          className="flex-1 px-4 py-2.5 text-sm bg-[#0A0D14] border border-gray-700 focus:border-[#7C3AED] rounded-xl outline-none text-white placeholder-gray-600"
        />
        <button type="submit" disabled={status === "submitting"} className="px-5 py-2.5 rounded-xl bg-[#7C3AED] hover:bg-[#6D28D9] font-semibold text-sm transition-colors disabled:opacity-50 flex-shrink-0">
          Add
        </button>
      </form>

      {exams === null ? (
        <SkeletonBlock className="w-full h-24 rounded-xl" />
      ) : exams.length === 0 ? (
        <p className="text-xs text-gray-500 text-center py-4">No exams yet.</p>
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

// ─────────────────────────────────────────────
// 🆕 Add Question — seedha global Question Bank mein ek sawaal add karta hai
// (koi script nahi chahiye, seedha browser se). Subject/topic ke liye
// suggestions diye hain taaki chhote, specific topics use ho (bade
// combined subject naam se system sahi se kaam nahi karta — max 3
// questions per topic hi ek mock mein aa sakte hain).
// ─────────────────────────────────────────────
// 🆕 HATA DIYA — pehle ye ek hardcoded/fixed suggestion list thi. Ab
// subject/topic Blueprint se dynamically aate hain (neeche AddQuestionCard
// mein /admin/exam-structure/:examName se), isliye ye ab zaroori nahi.

const EMPTY_QUESTION_FORM = {
  examName: "UPSSSC PET",
  subjectName: "",
  topicName: "",
  question: "",
  option1: "",
  option2: "",
  option3: "",
  option4: "",
  correctOption: "",
  answerExplain: "",
  askedIn: "",
};

const AddQuestionCard = () => {
  const [mode, setMode] = useState("single"); // "single" | "bulk"
  const [form, setForm] = useState(EMPTY_QUESTION_FORM);
  const [questionPhoto, setQuestionPhoto] = useState(null);
  const [answerPhoto, setAnswerPhoto] = useState(null);
  const [bulkJson, setBulkJson] = useState("");
  const [status, setStatus] = useState("idle");
  const [message, setMessage] = useState("");
  const [countThisSession, setCountThisSession] = useState(0);

  // 🆕 Exam ka poora subject→topic tree — taaki subject/topic ab TYPE
  // nahi, blueprint mein jo already bana hai usi mein se CHUNA jaaye.
  // Isse spelling/spacing mismatch (jo mock test ko khaali kar deta tha)
  // hamesha ke liye khatam ho jaata hai.
  const [structure, setStructure] = useState(null); // { subjects: [{subjectName, topics: [...]}] } | null
  const [structureLoading, setStructureLoading] = useState(false);
  const [useCustomTopic, setUseCustomTopic] = useState(false); // escape-hatch — bilkul naya topic

  useEffect(() => {
    if (!form.examName.trim()) {
      setStructure(null);
      return;
    }
    let cancelled = false;
    setStructureLoading(true);
    api
      .get(`/admin/exam-structure/${encodeURIComponent(form.examName.trim())}`)
      .then((res) => { if (!cancelled) setStructure(res.data.data); })
      .catch(() => { if (!cancelled) setStructure(null); })
      .finally(() => { if (!cancelled) setStructureLoading(false); });
    return () => { cancelled = true; };
  }, [form.examName]);

  const subjectOptions = structure?.subjects || [];
  const selectedSubject = subjectOptions.find((s) => s.subjectName === form.subjectName);
  // 🆕 BUG FIX: "Unseen Passage" topics yahan se hata diye — agar in par
  // koi normal sawaal daal diya jaaye, to wo hamesha ke liye invisible ho
  // jaata (mock-generator is topic ke liye Question pool dekhta hi nahi,
  // seedha UnseenPassage collection dekhta hai). Aise sawaal add karne ke
  // liye "📖 Add Unseen Passage" card use karein.
  const topicOptions = (selectedSubject?.topics || []).filter((t) => !t.isUnseenPassage);

  const handleChange = (e) => setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));

  // 🆕 Subject badalte hi topic reset — pichle subject ka topic naye
  // subject ke saath galti se na chala jaaye
  const handleSubjectSelect = (e) => {
    const value = e.target.value;
    setUseCustomTopic(false);
    setForm((prev) => ({ ...prev, subjectName: value, topicName: "" }));
  };

  // 🆕 AI ko bhejne layak demo JSON + samjhaane wala prompt, ek saath copy
  const DEMO_QUESTIONS = [
    {
      examName: "UPSSSC PET",
      subjectName: "History, Geography, Economy & Polity",
      topicName: "Ancient India",
      question: "यहाँ सवाल लिखें?",
      option1: "पहला विकल्प",
      option2: "दूसरा विकल्प",
      option3: "तीसरा विकल्प",
      option4: "चौथा विकल्प",
      correctOption: 1,
      answerExplain: "यहाँ व्याख्या लिखें (kyu ये सही उत्तर है)",
      askedIn: "UPSSSC PET 2019 (fill ONLY if the question appeared in a REAL past exam, otherwise remove this line completely)",
    },
  ];
  const AI_PROMPT_HINT =
    "Using the JSON format below, give me [NUMBER NEEDED] MCQ questions in Hindi for [CHANGE SUBJECT/TOPIC]. Return only one JSON array, do not write any extra text/explanation. correctOption must always be one of the numbers 1,2,3,4 (1 means option1 is correct). Fill the 'askedIn' field ONLY if you are sure the question appeared in a real past exam — otherwise remove the 'askedIn' field completely, do not leave it empty.";

  const copyDemoForAI = async () => {
    const text = `${AI_PROMPT_HINT}\n\n${JSON.stringify(DEMO_QUESTIONS, null, 2)}`;
    try {
      await navigator.clipboard.writeText(text);
      setMessage("📋 Demo JSON + prompt copied — now paste it into any AI chatbot and send.");
    } catch {
      setMessage("❌ Could not copy — check browser permissions.");
    }
  };

  const handleSingleSubmit = async (e) => {
    e.preventDefault();
    setMessage("");

    if (!form.subjectName.trim() || !form.topicName.trim() || !form.question.trim()) {
      setMessage("❌ Subject, Topic and Question are all required.");
      return;
    }
    if (!form.option1 || !form.option2 || !form.option3 || !form.option4 || !form.correctOption) {
      setMessage("❌ All four options and the correct answer are required.");
      return;
    }

    setStatus("submitting");
    try {
      const fd = new FormData();
      fd.append("examName", form.examName.trim());
      fd.append("subjectName", form.subjectName.trim());
      fd.append("topicName", form.topicName.trim());
      fd.append("question", form.question.trim());
      fd.append("option1", form.option1.trim());
      fd.append("option2", form.option2.trim());
      fd.append("option3", form.option3.trim());
      fd.append("option4", form.option4.trim());
      fd.append("correctOption", form.correctOption);
      fd.append("answerExplain", form.answerExplain.trim());
      if (form.askedIn.trim()) fd.append("askedIn", form.askedIn.trim());
      if (questionPhoto) fd.append("questionPhoto", questionPhoto);
      if (answerPhoto) fd.append("answerExplainWithPhoto", answerPhoto);

      await api.post("/add-question", fd, { headers: { "Content-Type": "multipart/form-data" } });

      setMessage("✅ Question added!");
      setCountThisSession((c) => c + 1);
      setQuestionPhoto(null);
      setAnswerPhoto(null);
      // 🆕 Subject/Exam/Topic yaad rakhta hai — agla question isi topic ka
      // daalna ho to baar-baar type nahi karna padega
      setForm((prev) => ({
        ...EMPTY_QUESTION_FORM,
        examName: prev.examName,
        subjectName: prev.subjectName,
        topicName: prev.topicName,
      }));
    } catch (err) {
      setMessage(err.response?.data?.message || "Something went wrong.");
    } finally {
      setStatus("idle");
    }
  };

  const handleBulkSubmit = async (e) => {
    e.preventDefault();
    setMessage("");
    let parsed;
    try {
      parsed = JSON.parse(bulkJson);
    } catch {
      setMessage("❌ Invalid JSON format — please check.");
      return;
    }
    if (!Array.isArray(parsed) || parsed.length === 0) {
      setMessage("❌ JSON must be an array with at least 1 question.");
      return;
    }

    setStatus("submitting");
    try {
      await api.post("/add-question", parsed);
      setMessage(`✅ ${parsed.length} questions added!`);
      setCountThisSession((c) => c + parsed.length);
      setBulkJson("");
    } catch (err) {
      setMessage(err.response?.data?.message || "Something went wrong.");
    } finally {
      setStatus("idle");
    }
  };

  const inputClass = "w-full px-4 py-2.5 text-sm bg-[#0A0D14] border border-gray-700 focus:border-[#7C3AED] rounded-xl outline-none text-white placeholder-gray-600";
  const fileInputClass = "w-full text-xs text-gray-400 file:mr-3 file:py-2 file:px-3 file:rounded-lg file:border-0 file:bg-[#1F2937] file:text-gray-300 file:text-xs";

  return (
    <div className="bg-[#111827] border border-[#7C3AED]/40 rounded-2xl p-5 sm:p-6">
      <div className="flex items-center justify-between mb-1">
        <h3 className="font-semibold text-base">➕ Add Question</h3>
        {countThisSession > 0 && <span className="text-xs text-green-400">{countThisSession} added this session</span>}
      </div>
      <p className="text-xs text-gray-500 mb-4">Use a SHORT, SPECIFIC name for Subject/Topic (e.g. "Number System", "Percentage") — with a broad combined name (e.g. "Elementary Arithmetic") only 3 questions will ever be used in a mock test, no matter how many you add.</p>

      <div className="flex gap-2 mb-4">
        <button type="button" onClick={() => setMode("single")} className={`px-4 py-1.5 rounded-full text-xs font-medium ${mode === "single" ? "bg-[#7C3AED] text-white" : "bg-[#1F2937] text-gray-400"}`}>
          One by one (form)
        </button>
        <button type="button" onClick={() => setMode("bulk")} className={`px-4 py-1.5 rounded-full text-xs font-medium ${mode === "bulk" ? "bg-[#7C3AED] text-white" : "bg-[#1F2937] text-gray-400"}`}>
          Bulk JSON (written with AI)
        </button>
      </div>

      {message && (
        <div className={`mb-4 p-3 rounded-lg text-xs text-center ${message.startsWith("✅") || message.startsWith("📋") ? "bg-green-500/10 text-green-400" : "bg-red-500/10 text-red-400"}`}>
          {message}
        </div>
      )}

      {mode === "single" ? (
        <form onSubmit={handleSingleSubmit} className="space-y-3">
          <input name="examName" value={form.examName} onChange={handleChange} placeholder="Exam Name (e.g. UPSSSC PET)" className={inputClass} />

          {/* 🆕 Ab subject/topic TYPE nahi, blueprint se CHUNA jaata hai —
              isse spelling/spacing mismatch (jo mock ko khaali kar deta
              tha) hamesha ke liye khatam ho jaata hai */}
          {form.examName.trim() && structureLoading && (
            <p className="text-xs text-gray-500">Checking blueprint...</p>
          )}

          {form.examName.trim() && !structureLoading && subjectOptions.length === 0 ? (
            <div className="p-3 bg-amber-500/10 border border-amber-500/25 rounded-xl text-xs text-amber-400">
              ⚠️ No Blueprint found for '{form.examName}' yet. First create one with "📐 Add Blueprint" — its subject/topic names will then appear in the dropdown here.
            </div>
          ) : subjectOptions.length > 0 ? (
            <>
              <select value={form.subjectName} onChange={handleSubjectSelect} className={inputClass}>
                <option value="">Select Subject</option>
                {subjectOptions.map((s) => <option key={s.subjectName} value={s.subjectName}>{s.subjectName}</option>)}
              </select>

              {form.subjectName && !useCustomTopic && (
                <select
                  value={form.topicName}
                  onChange={(e) => {
                    if (e.target.value === "__custom__") { setUseCustomTopic(true); setForm((prev) => ({ ...prev, topicName: "" })); }
                    else handleChange(e);
                  }}
                  name="topicName"
                  className={inputClass}
                >
                  <option value="">Select Topic</option>
                  {topicOptions.map((t) => <option key={t.topicName} value={t.topicName}>{t.topicName}</option>)}
                  <option value="__custom__">+ Type a new topic...</option>
                </select>
              )}
              {form.subjectName && useCustomTopic && (
                <div className="flex gap-2">
                  <input name="topicName" value={form.topicName} onChange={handleChange} placeholder="New topic name (add it with this exact name in the next blueprint update)" className={`${inputClass} flex-1`} />
                  <button type="button" onClick={() => setUseCustomTopic(false)} className="px-3 rounded-xl bg-[#1F2937] border border-gray-700 text-xs text-gray-400">List</button>
                </div>
              )}
            </>
          ) : (
            <>
              <input name="subjectName" value={form.subjectName} onChange={handleChange} placeholder="Subject name (a dropdown appears once you type the exam)" className={inputClass} />
              <input name="topicName" value={form.topicName} onChange={handleChange} placeholder="Topic name" className={inputClass} />
            </>
          )}

          <textarea name="question" value={form.question} onChange={handleChange} rows={3} placeholder="Question" className={inputClass} />

          {/* 🆕 Question ke saath photo */}
          <div>
            <label className="block text-[10px] text-gray-500 uppercase mb-1">Question Photo (optional)</label>
            <input type="file" accept="image/*" onChange={(e) => setQuestionPhoto(e.target.files?.[0] || null)} className={fileInputClass} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <input name="option1" value={form.option1} onChange={handleChange} placeholder="Option 1" className={inputClass} />
            <input name="option2" value={form.option2} onChange={handleChange} placeholder="Option 2" className={inputClass} />
            <input name="option3" value={form.option3} onChange={handleChange} placeholder="Option 3" className={inputClass} />
            <input name="option4" value={form.option4} onChange={handleChange} placeholder="Option 4" className={inputClass} />
          </div>

          <select name="correctOption" value={form.correctOption} onChange={handleChange} className={inputClass}>
            <option value="">Select Correct Answer</option>
            <option value="1">Option 1</option>
            <option value="2">Option 2</option>
            <option value="3">Option 3</option>
            <option value="4">Option 4</option>
          </select>

          <textarea name="answerExplain" value={form.answerExplain} onChange={handleChange} rows={2} placeholder="Explanation (optional)" className={inputClass} />

          {/* 🆕 Explanation ke saath photo (jaise diagram/chart wali explanation) */}
          <div>
            <label className="block text-[10px] text-gray-500 uppercase mb-1">Explanation Photo (optional)</label>
            <input type="file" accept="image/*" onChange={(e) => setAnswerPhoto(e.target.files?.[0] || null)} className={fileInputClass} />
          </div>

          <input name="askedIn" value={form.askedIn} onChange={handleChange} placeholder='Asked in which exam before? e.g. "UPSSSC PET 2019" (optional — fill only if real)' className={inputClass} />

          <button type="submit" disabled={status === "submitting"} className="w-full py-2.5 rounded-xl bg-[#7C3AED] hover:bg-[#6D28D9] font-semibold text-sm disabled:opacity-50">
            {status === "submitting" ? "Adding..." : "Add Question"}
          </button>
        </form>
      ) : (
        <form onSubmit={handleBulkSubmit} className="space-y-3">
          <button type="button" onClick={copyDemoForAI} className="w-full py-2.5 rounded-xl bg-[#1F2937] border border-[#7C3AED]/40 text-[#A78BFA] text-sm font-medium hover:bg-[#7C3AED]/10">
            📋 Copy Demo JSON + AI Prompt
          </button>
          <p className="text-[11px] text-gray-500">Press the button above → paste the copied text into any AI chatbot (ChatGPT/Claude/Gemini) → paste the JSON array it returns below and submit. Photos can't be added in bulk mode — add questions with photos using "One by one" mode.</p>

          <textarea
            value={bulkJson}
            onChange={(e) => setBulkJson(e.target.value)}
            rows={12}
            placeholder="Paste the JSON array from the AI here..."
            className={`${inputClass} font-mono text-xs`}
          />

          <button type="submit" disabled={status === "submitting" || !bulkJson.trim()} className="w-full py-2.5 rounded-xl bg-[#7C3AED] hover:bg-[#6D28D9] font-semibold text-sm disabled:opacity-50">
            {status === "submitting" ? "Adding..." : "Add All Questions"}
          </button>
        </form>
      )}
    </div>
  );
};

// ─────────────────────────────────────────────
// 🆕 Add Blueprint (REDESIGNED) — ab har topic ka apna EXACT question
// count hota hai (pehle sirf topic naam likhte the, count nahi — isliye
// system khud decide karta tha aur bade subjects (30+ questions) kabhi
// poore nahi bharte the, max 3 per topic ki hidden limit ki wajah se).
// Ab jo yahan likhoge, mock mein WAHI utna hi milega — koi hidden limit
// nahi. Unseen Passage ke liye alag section hai.
// ─────────────────────────────────────────────
const EMPTY_TOPIC_ROW = { topicName: "", questionCount: "", isUnseenPassage: false, passageLanguage: "Hindi" };
const EMPTY_SUBJECT_ROW = () => ({ subjectName: "", topics: [{ ...EMPTY_TOPIC_ROW }] });

const AddBlueprintCard = () => {
  const [examName, setExamName] = useState("");
  const [blueprintName, setBlueprintName] = useState("");
  const [mockType, setMockType] = useState("Full");
  const [marksPerQuestion, setMarksPerQuestion] = useState("1");
  const [negativeMarking, setNegativeMarking] = useState("0.25");
  const [durationMinutes, setDurationMinutes] = useState("60");
  const [subjects, setSubjects] = useState([EMPTY_SUBJECT_ROW()]);
  const [status, setStatus] = useState("idle");
  const [message, setMessage] = useState("");

  // 🆕 BUG FIX: Pehle "total" (display ke liye) SAARE topics se calculate
  // hota tha, lekin submit karte waqt sirf VALID topics (jinme naam AUR
  // count dono bhare hon) bhejte the — agar koi adhoora row ho (jaise
  // count bhara ho par naam khaali), to dikhne wala total aur asal mein
  // submit hone wala total ALAG ho jaata tha, aur backend "numbers match
  // nahi karte" wala confusing error deta tha. Ab dono jagah EK hi
  // "valid topics" list use hoti hai, taaki jo dikhe wahi submit ho.
  const getValidTopics = (s) => s.topics.filter((t) => t.topicName.trim() && Number(t.questionCount) > 0);
  const subjectTotal = (s) => getValidTopics(s).reduce((sum, t) => sum + Number(t.questionCount), 0);
  const totalQuestions = subjects.reduce((sum, s) => sum + subjectTotal(s), 0);
  const totalMarks = totalQuestions * (Number(marksPerQuestion) || 0);

  const updateSubjectName = (idx, value) => setSubjects((prev) => prev.map((s, i) => (i === idx ? { ...s, subjectName: value } : s)));
  const addSubjectRow = () => setSubjects((prev) => [...prev, EMPTY_SUBJECT_ROW()]);
  const removeSubjectRow = (idx) => setSubjects((prev) => (prev.length > 1 ? prev.filter((_, i) => i !== idx) : prev));

  const updateTopic = (sIdx, tIdx, field, value) =>
    setSubjects((prev) => prev.map((s, i) => (i === sIdx ? { ...s, topics: s.topics.map((t, ti) => (ti === tIdx ? { ...t, [field]: value } : t)) } : s)));
  const addTopicRow = (sIdx) => setSubjects((prev) => prev.map((s, i) => (i === sIdx ? { ...s, topics: [...s.topics, { ...EMPTY_TOPIC_ROW }] } : s)));
  const removeTopicRow = (sIdx, tIdx) =>
    setSubjects((prev) => prev.map((s, i) => (i === sIdx ? { ...s, topics: s.topics.length > 1 ? s.topics.filter((_, ti) => ti !== tIdx) : s.topics } : s)));

  // 🆕 Topic ko "Unseen Passage" type mein toggle karna — topicName
  // khud-ba-khud "Unseen Passage (Hindi/English)" ban jaata hai taaki
  // baad mein Unseen Passage content isi naam se link ho sake
  const toggleUnseenPassage = (sIdx, tIdx) => {
    setSubjects((prev) =>
      prev.map((s, i) => {
        if (i !== sIdx) return s;
        return {
          ...s,
          topics: s.topics.map((t, ti) => {
            if (ti !== tIdx) return t;
            const nowPassage = !t.isUnseenPassage;
            return {
              ...t,
              isUnseenPassage: nowPassage,
              topicName: nowPassage ? `Unseen Passage (${t.passageLanguage || "Hindi"})` : "",
            };
          }),
        };
      })
    );
  };
  const updatePassageLanguage = (sIdx, tIdx, language) =>
    setSubjects((prev) =>
      prev.map((s, i) =>
        i === sIdx
          ? { ...s, topics: s.topics.map((t, ti) => (ti === tIdx ? { ...t, passageLanguage: language, topicName: `Unseen Passage (${language})` } : t)) }
          : s
      )
    );

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage("");

    if (!examName.trim() || !blueprintName.trim()) {
      setMessage("❌ Exam Name and Blueprint Name are required.");
      return;
    }

    const cleanSubjects = subjects
      .filter((s) => s.subjectName.trim())
      .map((s) => ({
        subjectName: s.subjectName.trim(),
        questionCount: subjectTotal(s),
        topics: getValidTopics(s).map((t) => ({
          topicName: t.topicName.trim(),
          questionCount: Number(t.questionCount),
          isUnseenPassage: !!t.isUnseenPassage,
          passageLanguage: t.isUnseenPassage ? t.passageLanguage : null,
        })),
      }))
      .filter((s) => s.topics.length > 0);

    if (cleanSubjects.length === 0) {
      setMessage("❌ Add at least one subject, one topic and its question count.");
      return;
    }

    setStatus("submitting");
    try {
      await api.post("/add-bluePrint", {
        examName: examName.trim(),
        blueprintName: blueprintName.trim(),
        mockType,
        marksPerQuestion: Number(marksPerQuestion),
        negativeMarking: Number(negativeMarking) || 0,
        durationMinutes: Number(durationMinutes) || 0,
        totalQuestions,
        subjects: cleanSubjects,
      });
      setMessage(`✅ '${blueprintName.trim()}' blueprint created! (${totalQuestions} questions, ${totalMarks} marks)`);
      setBlueprintName("");
      setSubjects([EMPTY_SUBJECT_ROW()]);
    } catch (err) {
      setMessage(err.response?.data?.message || "Something went wrong.");
    } finally {
      setStatus("idle");
    }
  };

  const inputClass = "w-full px-4 py-2.5 text-sm bg-[#0A0D14] border border-gray-700 focus:border-[#7C3AED] rounded-xl outline-none text-white placeholder-gray-600";
  const tinyInputClass = "px-2.5 py-1.5 text-xs bg-[#111827] border border-gray-700 focus:border-[#7C3AED] rounded-lg outline-none text-white placeholder-gray-600";

  return (
    <div className="bg-[#111827] border border-[#7C3AED]/40 rounded-2xl p-5 sm:p-6">
      <h3 className="font-semibold text-base mb-1">📐 Add Blueprint</h3>
      <p className="text-xs text-gray-500 mb-4">Enter the exact question count for each topic — the mock will have exactly that many, no hidden limit. Unseen Passage is now added inside a subject like any normal topic.</p>

      {message && (
        <div className={`mb-4 p-3 rounded-lg text-xs text-center ${message.startsWith("✅") ? "bg-green-500/10 text-green-400" : "bg-red-500/10 text-red-400"}`}>
          {message}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-3">
        <input value={examName} onChange={(e) => setExamName(e.target.value)} placeholder="Exam Name (e.g. UPSSSC PET)" className={inputClass} />
        <input value={blueprintName} onChange={(e) => setBlueprintName(e.target.value)} placeholder="Blueprint Name (e.g. UPSSSC PET Full Mock 1)" className={inputClass} />

        <div className="grid grid-cols-2 gap-3">
          <select value={mockType} onChange={(e) => setMockType(e.target.value)} className={inputClass}>
            <option value="Full">Full Mock</option>
            <option value="Mini">Mini Mock</option>
          </select>
          <input type="number" min="0" value={durationMinutes} onChange={(e) => setDurationMinutes(e.target.value)} placeholder="Duration (minutes)" className={inputClass} />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-[10px] text-gray-500 uppercase mb-1">Marks Per Question</label>
            <input type="number" step="0.5" min="0" value={marksPerQuestion} onChange={(e) => setMarksPerQuestion(e.target.value)} className={inputClass} />
          </div>
          <div>
            <label className="block text-[10px] text-gray-500 uppercase mb-1">Negative Marking</label>
            <input type="number" step="0.25" min="0" value={negativeMarking} onChange={(e) => setNegativeMarking(e.target.value)} className={inputClass} />
          </div>
        </div>

        {/* ── Subjects → Topics (nested) ── */}
        <div>
          <p className="text-xs font-semibold tracking-wider text-gray-400 uppercase mt-4 mb-2">Subjects &amp; Topics</p>
          <div className="space-y-3">
            {subjects.map((s, sIdx) => (
              <div key={sIdx} className="bg-[#0A0D14] border border-gray-800 rounded-xl p-3 space-y-2">
                <div className="flex gap-2 items-center">
                  <input value={s.subjectName} onChange={(e) => updateSubjectName(sIdx, e.target.value)} placeholder="Subject name (e.g. Reasoning, Maths & DI)" className={`${tinyInputClass} flex-1 min-w-0`} />
                  <span className="text-xs text-[#A78BFA] font-semibold flex-shrink-0 px-2">{subjectTotal(s)} Q</span>
                  <button type="button" onClick={() => removeSubjectRow(sIdx)} className="w-9 h-9 flex-shrink-0 flex items-center justify-center rounded-lg text-gray-500 hover:text-red-400 hover:bg-red-500/10">✕</button>
                </div>

                <div className="pl-3 border-l-2 border-gray-800 space-y-2">
                  {s.topics.map((t, tIdx) => (
                    <div key={tIdx} className={`rounded-lg p-2 space-y-1.5 ${t.isUnseenPassage ? "bg-[#7C3AED]/10 border border-[#7C3AED]/30" : ""}`}>
                      {t.isUnseenPassage ? (
                        <div className="flex gap-2 items-center">
                          <select value={t.passageLanguage} onChange={(e) => updatePassageLanguage(sIdx, tIdx, e.target.value)} className={`${tinyInputClass} flex-1`}>
                            <option value="Hindi">Unseen Passage — Hindi</option>
                            <option value="English">Unseen Passage — English</option>
                          </select>
                          <input type="number" min="1" value={t.questionCount} onChange={(e) => updateTopic(sIdx, tIdx, "questionCount", e.target.value)} placeholder="Q" className={`${tinyInputClass} w-16 flex-shrink-0`} />
                          <button type="button" onClick={() => removeTopicRow(sIdx, tIdx)} className="w-7 h-7 flex-shrink-0 flex items-center justify-center rounded-lg text-gray-600 hover:text-red-400 text-xs">✕</button>
                        </div>
                      ) : (
                        <div className="flex gap-2">
                          <input value={t.topicName} onChange={(e) => updateTopic(sIdx, tIdx, "topicName", e.target.value)} placeholder="Topic name (e.g. Number System)" className={`${tinyInputClass} flex-1 min-w-0`} />
                          <input type="number" min="1" value={t.questionCount} onChange={(e) => updateTopic(sIdx, tIdx, "questionCount", e.target.value)} placeholder="Q" className={`${tinyInputClass} w-16 flex-shrink-0`} />
                          <button type="button" onClick={() => removeTopicRow(sIdx, tIdx)} className="w-7 h-7 flex-shrink-0 flex items-center justify-center rounded-lg text-gray-600 hover:text-red-400 text-xs">✕</button>
                        </div>
                      )}
                      <label className="flex items-center gap-1.5 text-[10px] text-gray-500 pl-1">
                        <input type="checkbox" checked={t.isUnseenPassage} onChange={() => toggleUnseenPassage(sIdx, tIdx)} className="accent-[#7C3AED]" />
                        This is an Unseen Passage topic (the full passage and its questions appear together)
                      </label>
                    </div>
                  ))}
                  <button type="button" onClick={() => addTopicRow(sIdx)} className="text-[11px] text-[#A78BFA] hover:underline">+ Add Topic</button>
                </div>
              </div>
            ))}
          </div>
          <button type="button" onClick={addSubjectRow} className="mt-2 w-full py-2 rounded-lg bg-[#1F2937] border border-gray-700 text-gray-300 hover:border-gray-500 text-xs font-medium">
            + Add Another Subject
          </button>
        </div>

        <div className="bg-[#0A0D14] border border-gray-800 rounded-xl p-3 flex items-center justify-between text-sm">
          <span className="text-gray-400">Total (auto-calculated):</span>
          <span className="font-semibold text-[#A78BFA]">{totalQuestions} questions · {totalMarks} marks</span>
        </div>

        <button type="submit" disabled={status === "submitting"} className="w-full py-2.5 rounded-xl bg-[#7C3AED] hover:bg-[#6D28D9] font-semibold text-sm disabled:opacity-50">
          {status === "submitting" ? "Creating..." : "Create Blueprint"}
        </button>
      </form>
    </div>
  );
};

// ─────────────────────────────────────────────
// 🆕 Add Unseen Passage — ek passage + uske saare sawaal ek saath.
// Blueprint mein jo "Unseen Passage" bucket banaya tha, usi ke liye
// content yahan se aata hai.
// ─────────────────────────────────────────────
const EMPTY_PASSAGE_Q = { question: "", option1: "", option2: "", option3: "", option4: "", correctOption: "", answerExplain: "" };

const AddUnseenPassageCard = () => {
  const [examName, setExamName] = useState("");
  const [subjectName, setSubjectName] = useState("");
  const [topicName, setTopicName] = useState("");
  const [passageText, setPassageText] = useState("");
  const [questions, setQuestions] = useState([{ ...EMPTY_PASSAGE_Q }]);
  const [status, setStatus] = useState("idle");
  const [message, setMessage] = useState("");

  // 🆕 Subject/Topic dropdown se — is exam ke Blueprints mein jo bhi
  // "Unseen Passage" type topics bane hain, sirf wahi yahan dikhenge
  const [structure, setStructure] = useState(null);
  const [structureLoading, setStructureLoading] = useState(false);

  useEffect(() => {
    if (!examName.trim()) {
      setStructure(null);
      return;
    }
    let cancelled = false;
    setStructureLoading(true);
    api
      .get(`/admin/exam-structure/${encodeURIComponent(examName.trim())}`)
      .then((res) => { if (!cancelled) setStructure(res.data.data); })
      .catch(() => { if (!cancelled) setStructure(null); })
      .finally(() => { if (!cancelled) setStructureLoading(false); });
    return () => { cancelled = true; };
  }, [examName]);

  // Sirf wo subjects jinke andar kam se kam ek Unseen Passage topic hai
  const subjectsWithPassage = (structure?.subjects || []).filter((s) => s.topics.some((t) => t.isUnseenPassage));
  const selectedSubject = subjectsWithPassage.find((s) => s.subjectName === subjectName);
  const passageTopics = selectedSubject?.topics.filter((t) => t.isUnseenPassage) || [];
  const selectedTopic = passageTopics.find((t) => t.topicName === topicName);

  const updateQuestion = (idx, field, value) => setQuestions((prev) => prev.map((q, i) => (i === idx ? { ...q, [field]: value } : q)));
  const addQuestionRow = () => setQuestions((prev) => [...prev, { ...EMPTY_PASSAGE_Q }]);
  const removeQuestionRow = (idx) => setQuestions((prev) => (prev.length > 1 ? prev.filter((_, i) => i !== idx) : prev));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage("");

    if (!examName.trim() || !subjectName || !topicName || !passageText.trim()) {
      setMessage("❌ Exam Name, Subject, Topic and Passage text are required.");
      return;
    }
    const validQuestions = questions.filter((q) => q.question.trim() && q.option1 && q.option2 && q.option3 && q.option4 && q.correctOption);
    if (validQuestions.length === 0) {
      setMessage("❌ Add at least one complete question (with options and the correct answer).");
      return;
    }

    setStatus("submitting");
    try {
      await api.post("/add-unseen-passage", {
        examName: examName.trim(),
        subjectName,
        topicName,
        language: selectedTopic?.passageLanguage || "Hindi",
        passageText: passageText.trim(),
        questions: validQuestions.map((q) => ({
          question: q.question.trim(),
          option1: q.option1.trim(),
          option2: q.option2.trim(),
          option3: q.option3.trim(),
          option4: q.option4.trim(),
          correctOption: Number(q.correctOption),
          answerExplain: q.answerExplain.trim(),
        })),
      });
      setMessage(`✅ Passage added! (${validQuestions.length} questions)`);
      setPassageText("");
      setQuestions([{ ...EMPTY_PASSAGE_Q }]);
    } catch (err) {
      setMessage(err.response?.data?.message || "Something went wrong.");
    } finally {
      setStatus("idle");
    }
  };

  const inputClass = "w-full px-4 py-2.5 text-sm bg-[#0A0D14] border border-gray-700 focus:border-[#7C3AED] rounded-xl outline-none text-white placeholder-gray-600";
  const tinyInputClass = "px-3 py-2 text-xs bg-[#111827] border border-gray-700 focus:border-[#7C3AED] rounded-lg outline-none text-white placeholder-gray-600";

  return (
    <div className="bg-[#111827] border border-[#7C3AED]/40 rounded-2xl p-5 sm:p-6">
      <h3 className="font-semibold text-base mb-1">📖 Add Unseen Passage</h3>
      <p className="text-xs text-gray-500 mb-4">One passage + all its questions together — in a mock, these questions appear as one block inside the subject/topic you choose here.</p>

      {message && (
        <div className={`mb-4 p-3 rounded-lg text-xs text-center ${message.startsWith("✅") ? "bg-green-500/10 text-green-400" : "bg-red-500/10 text-red-400"}`}>
          {message}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-3">
        <input value={examName} onChange={(e) => { setExamName(e.target.value); setSubjectName(""); setTopicName(""); }} placeholder="Exam Name (e.g. UPSSSC PET)" className={inputClass} />

        {examName.trim() && structureLoading && <p className="text-xs text-gray-500">Checking blueprint...</p>}
        {examName.trim() && !structureLoading && subjectsWithPassage.length === 0 ? (
          <div className="p-3 bg-amber-500/10 border border-amber-500/25 rounded-xl text-xs text-amber-400">
            ⚠️ No Unseen Passage topic found for '{examName}'. First, in "📐 Add Blueprint", mark a topic inside a subject as "Unseen Passage".
          </div>
        ) : subjectsWithPassage.length > 0 ? (
          <>
            <select value={subjectName} onChange={(e) => { setSubjectName(e.target.value); setTopicName(""); }} className={inputClass}>
              <option value="">Select Subject</option>
              {subjectsWithPassage.map((s) => <option key={s.subjectName} value={s.subjectName}>{s.subjectName}</option>)}
            </select>

            {subjectName && (
              <select value={topicName} onChange={(e) => setTopicName(e.target.value)} className={inputClass}>
                <option value="">Select Passage Topic</option>
                {passageTopics.map((t) => <option key={t.topicName} value={t.topicName}>{t.topicName}</option>)}
              </select>
            )}
          </>
        ) : null}

        <textarea value={passageText} onChange={(e) => setPassageText(e.target.value)} rows={6} placeholder="Paste the full passage here..." className={inputClass} />

        <div>
          <p className="text-xs font-semibold tracking-wider text-gray-400 uppercase mt-3 mb-2">Questions for this passage</p>
          <div className="space-y-3">
            {questions.map((q, idx) => (
              <div key={idx} className="bg-[#0A0D14] border border-gray-800 rounded-xl p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] text-gray-500">Question {idx + 1}</span>
                  <button type="button" onClick={() => removeQuestionRow(idx)} className="text-gray-600 hover:text-red-400 text-xs">✕</button>
                </div>
                <textarea value={q.question} onChange={(e) => updateQuestion(idx, "question", e.target.value)} rows={2} placeholder="Question" className={`${tinyInputClass} w-full`} />
                <div className="grid grid-cols-2 gap-2">
                  <input value={q.option1} onChange={(e) => updateQuestion(idx, "option1", e.target.value)} placeholder="Option 1" className={tinyInputClass} />
                  <input value={q.option2} onChange={(e) => updateQuestion(idx, "option2", e.target.value)} placeholder="Option 2" className={tinyInputClass} />
                  <input value={q.option3} onChange={(e) => updateQuestion(idx, "option3", e.target.value)} placeholder="Option 3" className={tinyInputClass} />
                  <input value={q.option4} onChange={(e) => updateQuestion(idx, "option4", e.target.value)} placeholder="Option 4" className={tinyInputClass} />
                </div>
                <select value={q.correctOption} onChange={(e) => updateQuestion(idx, "correctOption", e.target.value)} className={`${tinyInputClass} w-full`}>
                  <option value="">Select Correct Answer</option>
                  <option value="1">Option 1</option>
                  <option value="2">Option 2</option>
                  <option value="3">Option 3</option>
                  <option value="4">Option 4</option>
                </select>
                <textarea value={q.answerExplain} onChange={(e) => updateQuestion(idx, "answerExplain", e.target.value)} rows={2} placeholder="Explanation (optional)" className={`${tinyInputClass} w-full`} />
              </div>
            ))}
          </div>
          <button type="button" onClick={addQuestionRow} className="mt-2 w-full py-2 rounded-lg bg-[#1F2937] border border-gray-700 text-gray-300 hover:border-gray-500 text-xs font-medium">
            + Add Another Question
          </button>
        </div>

        <button type="submit" disabled={status === "submitting"} className="w-full py-2.5 rounded-xl bg-[#7C3AED] hover:bg-[#6D28D9] font-semibold text-sm disabled:opacity-50">
          {status === "submitting" ? "Adding..." : "Add Passage"}
        </button>
      </form>
    </div>
  );
};

// ─────────────────────────────────────────────
// 🆕 Blueprint Coverage Check — "100 questions chahiye the, sirf 35-40
// aaye" jaisi confusion khatam karne ke liye. Batata hai har topic mein
// kitne chahiye vs kitne DB mein maujood hain — laal(kam)/hara(theek)
// se turant pata chal jaata hai kaunsa topic adhoora hai.
// ─────────────────────────────────────────────
const BlueprintCoverageCard = () => {
  const [examName, setExamName] = useState("");
  const [blueprintName, setBlueprintName] = useState("");
  const [blueprintOptions, setBlueprintOptions] = useState([]);
  const [structureLoading, setStructureLoading] = useState(false);
  const [report, setReport] = useState(null);
  const [checking, setChecking] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!examName.trim()) { setBlueprintOptions([]); return; }
    let cancelled = false;
    setStructureLoading(true);
    api
      .get(`/admin/exam-structure/${encodeURIComponent(examName.trim())}`)
      .then((res) => { if (!cancelled) setBlueprintOptions(res.data.data?.blueprints || []); })
      .catch(() => { if (!cancelled) setBlueprintOptions([]); })
      .finally(() => { if (!cancelled) setStructureLoading(false); });
    return () => { cancelled = true; };
  }, [examName]);

  const handleCheck = async () => {
    if (!examName.trim() || !blueprintName) {
      setMessage("❌ Select both Exam and Blueprint.");
      return;
    }
    setChecking(true);
    setMessage("");
    setReport(null);
    try {
      const res = await api.get(`/admin/blueprint-coverage/${encodeURIComponent(examName.trim())}/${encodeURIComponent(blueprintName)}`);
      setReport(res.data.data);
    } catch (err) {
      setMessage(err.response?.data?.message || "Could not check coverage.");
    } finally {
      setChecking(false);
    }
  };

  const inputClass = "w-full px-4 py-2.5 text-sm bg-[#0A0D14] border border-gray-700 focus:border-[#7C3AED] rounded-xl outline-none text-white placeholder-gray-600";

  return (
    <div className="bg-[#111827] border border-gray-800 rounded-2xl p-5 sm:p-6">
      <h3 className="font-semibold text-base mb-1">🔍 Blueprint Coverage Check</h3>
      <p className="text-xs text-gray-500 mb-4">Check BEFORE generating a mock — how many questions each topic needs and how many exist.</p>

      {message && <div className="mb-4 p-3 rounded-lg text-xs text-center bg-red-500/10 text-red-400">{message}</div>}

      <div className="space-y-3 mb-4">
        <input value={examName} onChange={(e) => { setExamName(e.target.value); setBlueprintName(""); setReport(null); }} placeholder="Exam Name" className={inputClass} />
        {examName.trim() && structureLoading && <p className="text-xs text-gray-500">Loading blueprints...</p>}
        {examName.trim() && !structureLoading && blueprintOptions.length > 0 && (
          <select value={blueprintName} onChange={(e) => { setBlueprintName(e.target.value); setReport(null); }} className={inputClass}>
            <option value="">Select Blueprint</option>
            {blueprintOptions.map((b) => <option key={b.blueprintName} value={b.blueprintName}>{b.blueprintName}</option>)}
          </select>
        )}
        <button onClick={handleCheck} disabled={checking || !blueprintName} className="w-full py-2.5 rounded-xl bg-[#7C3AED] hover:bg-[#6D28D9] font-semibold text-sm disabled:opacity-50">
          {checking ? "Checking..." : "Check Coverage"}
        </button>
      </div>

      {report && (
        <div className="space-y-3">
          <div className={`p-3 rounded-xl text-sm font-medium text-center ${report.anyShort ? "bg-amber-500/10 text-amber-400 border border-amber-500/25" : "bg-green-500/10 text-green-400 border border-green-500/25"}`}>
            {report.anyShort
              ? `⚠️ If you generate a mock now, only ~${report.totalAvailable} / ${report.totalNeeded} questions will be available`
              : `✅ All good — all ${report.totalNeeded} questions are available`}
          </div>

          {report.subjects.map((s) => (
            <div key={s.subjectName} className="bg-[#0A0D14] border border-gray-800 rounded-xl p-3">
              <p className="text-xs font-semibold text-gray-300 mb-2">{s.subjectName} <span className="text-gray-500">({s.needed} needed)</span></p>
              <div className="space-y-1.5">
                {s.topics.map((t) => (
                  <div key={t.topicName} className="flex items-center justify-between text-xs">
                    <span className={t.short ? "text-red-400" : "text-gray-400"}>
                      {t.short ? "❌" : "✅"} {t.topicName} {t.isUnseenPassage && "📖"}
                    </span>
                    <span className={t.short ? "text-red-400 font-semibold" : "text-gray-500"}>
                      {t.available} / {t.needed}
                    </span>
                  </div>
                ))}
              </div>
            </div>
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

        <ManageExamNamesCard />

        <AddBlueprintCard />

        <BlueprintCoverageCard />

        <AddUnseenPassageCard />

        <AddQuestionCard />

        <CreateMainTeacherCard />

        <button
          onClick={() => navigate("/AdminPromoters")}
          className="w-full text-left bg-[#111827] border border-gray-800 hover:border-[#7C3AED] rounded-2xl p-5 sm:p-6 transition-colors"
        >
          <h3 className="font-semibold text-base mb-1">Manage Promoters →</h3>
          <p className="text-xs text-gray-500">Create promoters, see students/questions, settle payments</p>
        </button>

        <button
          onClick={() => navigate("/AdminTeacherCommissions")}
          className="w-full text-left bg-[#111827] border border-gray-800 hover:border-[#7C3AED] rounded-2xl p-5 sm:p-6 transition-colors"
        >
          <h3 className="font-semibold text-base mb-1">Teacher Commission →</h3>
          <p className="text-xs text-gray-500">See main teachers' question counts and settle payments</p>
        </button>

        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => navigate("/ManageBooks")}
            className="text-left bg-[#111827] border border-gray-800 hover:border-[#7C3AED] rounded-2xl p-4 transition-colors"
          >
            <span className="text-2xl block mb-1">📚</span>
            <h3 className="font-semibold text-sm">Manage Books</h3>
            <p className="text-[11px] text-gray-500 mt-0.5">Add, price, stock</p>
          </button>
          <button
            onClick={() => navigate("/ManageBookOrders")}
            className="text-left bg-[#111827] border border-gray-800 hover:border-[#7C3AED] rounded-2xl p-4 transition-colors"
          >
            <span className="text-2xl block mb-1">📦</span>
            <h3 className="font-semibold text-sm">Book Orders</h3>
            <p className="text-[11px] text-gray-500 mt-0.5">Ship / deliver</p>
          </button>
          <button
            onClick={() => navigate("/ManageNotes")}
            className="col-span-2 text-left bg-[#111827] border border-gray-800 hover:border-[#7C3AED] rounded-2xl p-4 transition-colors"
          >
            <span className="text-2xl block mb-1">📝</span>
            <h3 className="font-semibold text-sm">Study Notes</h3>
            <p className="text-[11px] text-gray-500 mt-0.5">Upload exam-wise PDF notes</p>
          </button>
        </div>

        <div className="space-y-3">
          <p className="text-xs font-semibold tracking-wider text-gray-500 uppercase">Content (Advanced)</p>

          <JsonActionCard
            title="📊 Add Rank Predictor Data"
            description="examName, year, dataPoints ([{score, rank}]), totalCandidates, totalVacancies, isActive"
            endpoint="/add-rank-predictor-data"
            placeholder={JSON.stringify({ examName: "UPSC", year: 2026, dataPoints: [{ score: 150, rank: 500 }], totalCandidates: 500000, totalVacancies: 1000, isActive: true }, null, 2)}
            aiHint="Using the JSON format below, give me realistic score-vs-rank dataPoints for [CHANGE EXAM NAME] (at least 8-10 points, from high score to low score). Return only one JSON object, no extra text."
          />

          <JsonActionCard
            title="📄 Add Previous Year Test (Global)"
            description="examName, testName, year, description, subjects ([{subjectName, questions: [...]}]), marksPerQuestion, negativeMarking, durationMinutes"
            endpoint="/add-previous-year-test"
            placeholder={JSON.stringify({ examName: "UPSC", testName: "UPSC Prelims 2025", year: 2025, description: "", subjects: [{ subjectName: "History", questions: [{ question: "यहाँ सवाल", option1: "विकल्प 1", option2: "विकल्प 2", option3: "विकल्प 3", option4: "विकल्प 4", correctOption: 1, answerExplain: "व्याख्या", topicName: "Ancient India" }] }], marksPerQuestion: 2, negativeMarking: 0.5, durationMinutes: 120 }, null, 2)}
            aiHint="Using the JSON format below, give me a complete test like the [YEAR] previous year paper of [EXAM NAME] — [NUMBER NEEDED] MCQ questions in Hindi for the [CHANGE SUBJECT NAME] subject. correctOption must be a number 1-4. Return only one JSON object, no extra text."
          />

          <JsonActionCard
            title="📰 Add Current Affair"
            description="examName, date (YYYY-MM-DD), title, items ([{headline, content, category, source}])"
            endpoint="/add-current-affair"
            placeholder={JSON.stringify({ examName: "UPSC", date: "2026-09-17", title: "Daily Current Affairs", items: [{ headline: "यहाँ headline", content: "full detail here", category: "National", source: "PIB" }] }, null, 2)}
            aiHint="Using the JSON format below, give me [NUMBER NEEDED] real current affairs items for [EXAM NAME] for [DATE] (real, verified news — not made up). Return only one JSON object, no extra text."
          />

          <JsonActionCard
            title="📝 Add Current Affair Quiz"
            description="examName, date (YYYY-MM-DD), questions ([{question, option1..4, correctOption, answerExplain}])"
            endpoint="/add-current-affair-quiz"
            placeholder={JSON.stringify({ examName: "UPSC", date: "2026-09-17", questions: [{ question: "यहाँ सवाल", option1: "विकल्प 1", option2: "विकल्प 2", option3: "विकल्प 3", option4: "विकल्प 4", correctOption: 1, answerExplain: "व्याख्या" }] }, null, 2)}
            aiHint="Using the JSON format below, give me [NUMBER NEEDED] quiz questions based on the real current affairs of [DATE]. correctOption must be a number 1-4. Return only one JSON object, no extra text."
          />
        </div>
      </div>
    </div>
  );
};

export default AdminPanel;
