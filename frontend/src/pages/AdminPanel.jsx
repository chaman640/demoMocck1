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

  // 🆕 Demo JSON + samjhaane wala prompt ek saath copy — kisi AI chatbot ko dene ke liye
  const copyDemoForAI = async () => {
    const text = `${aiHint}\n\n${placeholder}`;
    try {
      await navigator.clipboard.writeText(text);
      setMessage("📋 Demo JSON + prompt copy ho gaya — AI chatbot mein paste kar dein.");
    } catch {
      setMessage("❌ Copy nahi ho paaya.");
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
            📋 Demo JSON + AI Prompt Copy Karein
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
  // liye "📖 Unseen Passage Add Karein" card use karein.
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
      askedIn: "UPSSSC PET 2019 (SIRF tab bharein jab question kisi REAL pichhle exam mein aaya ho, warna is line ko poora hata dein)",
    },
  ];
  const AI_PROMPT_HINT =
    "Neeche diye JSON format mein mujhe [SUBJECT/TOPIC BADLEIN] ke [KITNE CHAHIYE VO NUMBER LIKHEIN] MCQ questions Hindi mein do. Sirf ek JSON array return karo, koi extra text/explanation mत likhna. correctOption hamesha 1,2,3,4 mein se ek number ho (1 ka matlab option1 sahi hai). 'askedIn' field SIRF tab bharo jab tumhe pakka pata ho ki ye sawaal kisi real pichhle exam mein aaya tha — warna 'askedIn' field poori tarah hata do, khaali mat chhodo.";

  const copyDemoForAI = async () => {
    const text = `${AI_PROMPT_HINT}\n\n${JSON.stringify(DEMO_QUESTIONS, null, 2)}`;
    try {
      await navigator.clipboard.writeText(text);
      setMessage("📋 Demo JSON + prompt copy ho gaya — ab kisi AI chatbot mein paste karke bhej dein.");
    } catch {
      setMessage("❌ Copy nahi ho paaya, browser permission check karein.");
    }
  };

  const handleSingleSubmit = async (e) => {
    e.preventDefault();
    setMessage("");

    if (!form.subjectName.trim() || !form.topicName.trim() || !form.question.trim()) {
      setMessage("❌ Subject, Topic aur Question — teeno zaroori hain.");
      return;
    }
    if (!form.option1 || !form.option2 || !form.option3 || !form.option4 || !form.correctOption) {
      setMessage("❌ Chaaron options aur sahi answer chunna zaroori hai.");
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

      setMessage("✅ Question add ho gaya!");
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
      setMessage(err.response?.data?.message || "Error aaya.");
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
      setMessage("❌ JSON format galat hai — check karein.");
      return;
    }
    if (!Array.isArray(parsed) || parsed.length === 0) {
      setMessage("❌ JSON ek array hona chahiye, kam se kam 1 question ke saath.");
      return;
    }

    setStatus("submitting");
    try {
      await api.post("/add-question", parsed);
      setMessage(`✅ ${parsed.length} questions add ho gaye!`);
      setCountThisSession((c) => c + parsed.length);
      setBulkJson("");
    } catch (err) {
      setMessage(err.response?.data?.message || "Error aaya.");
    } finally {
      setStatus("idle");
    }
  };

  const inputClass = "w-full px-4 py-2.5 text-sm bg-[#0A0D14] border border-gray-700 focus:border-[#7C3AED] rounded-xl outline-none text-white placeholder-gray-600";
  const fileInputClass = "w-full text-xs text-gray-400 file:mr-3 file:py-2 file:px-3 file:rounded-lg file:border-0 file:bg-[#1F2937] file:text-gray-300 file:text-xs";

  return (
    <div className="bg-[#111827] border border-[#7C3AED]/40 rounded-2xl p-5 sm:p-6">
      <div className="flex items-center justify-between mb-1">
        <h3 className="font-semibold text-base">➕ Question Add Karein</h3>
        {countThisSession > 0 && <span className="text-xs text-green-400">{countThisSession} is session mein add hue</span>}
      </div>
      <p className="text-xs text-gray-500 mb-4">Subject/Topic mein CHHOTA, SPECIFIC naam dalein (jaise "Number System", "Percentage") — bada combined naam (jaise "Elementary Arithmetic") dalne se mock test mein sirf 3 hi kabhi use honge, chahe kitne bhi daal do.</p>

      <div className="flex gap-2 mb-4">
        <button type="button" onClick={() => setMode("single")} className={`px-4 py-1.5 rounded-full text-xs font-medium ${mode === "single" ? "bg-[#7C3AED] text-white" : "bg-[#1F2937] text-gray-400"}`}>
          Ek-Ek Karke (form)
        </button>
        <button type="button" onClick={() => setMode("bulk")} className={`px-4 py-1.5 rounded-full text-xs font-medium ${mode === "bulk" ? "bg-[#7C3AED] text-white" : "bg-[#1F2937] text-gray-400"}`}>
          Bulk JSON (AI se likhwa ke)
        </button>
      </div>

      {message && (
        <div className={`mb-4 p-3 rounded-lg text-xs text-center ${message.startsWith("✅") || message.startsWith("📋") ? "bg-green-500/10 text-green-400" : "bg-red-500/10 text-red-400"}`}>
          {message}
        </div>
      )}

      {mode === "single" ? (
        <form onSubmit={handleSingleSubmit} className="space-y-3">
          <input name="examName" value={form.examName} onChange={handleChange} placeholder="Exam Name (jaise: UPSSSC PET)" className={inputClass} />

          {/* 🆕 Ab subject/topic TYPE nahi, blueprint se CHUNA jaata hai —
              isse spelling/spacing mismatch (jo mock ko khaali kar deta
              tha) hamesha ke liye khatam ho jaata hai */}
          {form.examName.trim() && structureLoading && (
            <p className="text-xs text-gray-500">Blueprint check ho raha hai...</p>
          )}

          {form.examName.trim() && !structureLoading && subjectOptions.length === 0 ? (
            <div className="p-3 bg-amber-500/10 border border-amber-500/25 rounded-xl text-xs text-amber-400">
              ⚠️ '{form.examName}' ke liye abhi koi Blueprint nahi mila. Pehle "📐 Blueprint Add Karein" se ek banayein, phir wahi subject/topic naam yahan dropdown mein milenge.
            </div>
          ) : subjectOptions.length > 0 ? (
            <>
              <select value={form.subjectName} onChange={handleSubjectSelect} className={inputClass}>
                <option value="">Subject Chunein</option>
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
                  <option value="">Topic Chunein</option>
                  {topicOptions.map((t) => <option key={t.topicName} value={t.topicName}>{t.topicName}</option>)}
                  <option value="__custom__">+ Naya topic likhein...</option>
                </select>
              )}
              {form.subjectName && useCustomTopic && (
                <div className="flex gap-2">
                  <input name="topicName" value={form.topicName} onChange={handleChange} placeholder="Naya topic naam (agla Blueprint update mein isi naam se add karein)" className={`${inputClass} flex-1`} />
                  <button type="button" onClick={() => setUseCustomTopic(false)} className="px-3 rounded-xl bg-[#1F2937] border border-gray-700 text-xs text-gray-400">List</button>
                </div>
              )}
            </>
          ) : (
            <>
              <input name="subjectName" value={form.subjectName} onChange={handleChange} placeholder="Subject naam (exam type karte hi dropdown ban jayega)" className={inputClass} />
              <input name="topicName" value={form.topicName} onChange={handleChange} placeholder="Topic naam" className={inputClass} />
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
            <option value="">Sahi Answer Chunein</option>
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

          <input name="askedIn" value={form.askedIn} onChange={handleChange} placeholder='Pehle kab pucha gaya? jaise "UPSSSC PET 2019" (optional — sirf real ho to bharein)' className={inputClass} />

          <button type="submit" disabled={status === "submitting"} className="w-full py-2.5 rounded-xl bg-[#7C3AED] hover:bg-[#6D28D9] font-semibold text-sm disabled:opacity-50">
            {status === "submitting" ? "Add ho raha hai..." : "Question Add Karein"}
          </button>
        </form>
      ) : (
        <form onSubmit={handleBulkSubmit} className="space-y-3">
          <button type="button" onClick={copyDemoForAI} className="w-full py-2.5 rounded-xl bg-[#1F2937] border border-[#7C3AED]/40 text-[#A78BFA] text-sm font-medium hover:bg-[#7C3AED]/10">
            📋 Demo JSON + AI Prompt Copy Karein
          </button>
          <p className="text-[11px] text-gray-500">Upar wala button dabao → copy hua text kisi AI chatbot (ChatGPT/Claude/Gemini) mein paste karo → jo JSON array wapas mile, use neeche paste karke submit karo. Photo bulk mode mein add nahi ho sakti — photo wale questions "Ek-Ek Karke" mode se add karein.</p>

          <textarea
            value={bulkJson}
            onChange={(e) => setBulkJson(e.target.value)}
            rows={12}
            placeholder="Yahan AI se mila JSON array paste karein..."
            className={`${inputClass} font-mono text-xs`}
          />

          <button type="submit" disabled={status === "submitting" || !bulkJson.trim()} className="w-full py-2.5 rounded-xl bg-[#7C3AED] hover:bg-[#6D28D9] font-semibold text-sm disabled:opacity-50">
            {status === "submitting" ? "Add ho raha hai..." : "Sabhi Questions Add Karein"}
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
      setMessage("❌ Exam Name aur Blueprint Name zaroori hain.");
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
      setMessage("❌ Kam se kam ek subject, ek topic aur uska question count dalein.");
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
      setMessage(`✅ '${blueprintName.trim()}' blueprint ban gaya! (${totalQuestions} questions, ${totalMarks} marks)`);
      setBlueprintName("");
      setSubjects([EMPTY_SUBJECT_ROW()]);
    } catch (err) {
      setMessage(err.response?.data?.message || "Error aaya.");
    } finally {
      setStatus("idle");
    }
  };

  const inputClass = "w-full px-4 py-2.5 text-sm bg-[#0A0D14] border border-gray-700 focus:border-[#7C3AED] rounded-xl outline-none text-white placeholder-gray-600";
  const tinyInputClass = "px-2.5 py-1.5 text-xs bg-[#111827] border border-gray-700 focus:border-[#7C3AED] rounded-lg outline-none text-white placeholder-gray-600";

  return (
    <div className="bg-[#111827] border border-[#7C3AED]/40 rounded-2xl p-5 sm:p-6">
      <h3 className="font-semibold text-base mb-1">📐 Blueprint Add Karein</h3>
      <p className="text-xs text-gray-500 mb-4">Har topic ka apna exact question count dalein — mock mein bilkul utna hi milega, koi hidden limit nahi. Unseen Passage bhi ab ek normal topic ki tarah, subject ke andar hi add hota hai.</p>

      {message && (
        <div className={`mb-4 p-3 rounded-lg text-xs text-center ${message.startsWith("✅") ? "bg-green-500/10 text-green-400" : "bg-red-500/10 text-red-400"}`}>
          {message}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-3">
        <input value={examName} onChange={(e) => setExamName(e.target.value)} placeholder="Exam Name (jaise: UPSSSC PET)" className={inputClass} />
        <input value={blueprintName} onChange={(e) => setBlueprintName(e.target.value)} placeholder="Blueprint Name (jaise: UPSSSC PET Full Mock 1)" className={inputClass} />

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
                  <input value={s.subjectName} onChange={(e) => updateSubjectName(sIdx, e.target.value)} placeholder="Subject naam (jaise: Reasoning, Maths & DI)" className={`${tinyInputClass} flex-1 min-w-0`} />
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
                          <input value={t.topicName} onChange={(e) => updateTopic(sIdx, tIdx, "topicName", e.target.value)} placeholder="Topic naam (jaise: Number System)" className={`${tinyInputClass} flex-1 min-w-0`} />
                          <input type="number" min="1" value={t.questionCount} onChange={(e) => updateTopic(sIdx, tIdx, "questionCount", e.target.value)} placeholder="Q" className={`${tinyInputClass} w-16 flex-shrink-0`} />
                          <button type="button" onClick={() => removeTopicRow(sIdx, tIdx)} className="w-7 h-7 flex-shrink-0 flex items-center justify-center rounded-lg text-gray-600 hover:text-red-400 text-xs">✕</button>
                        </div>
                      )}
                      <label className="flex items-center gap-1.5 text-[10px] text-gray-500 pl-1">
                        <input type="checkbox" checked={t.isUnseenPassage} onChange={() => toggleUnseenPassage(sIdx, tIdx)} className="accent-[#7C3AED]" />
                        Ye ek Unseen Passage topic hai (poora passage + uske sawaal ek saath aayenge)
                      </label>
                    </div>
                  ))}
                  <button type="button" onClick={() => addTopicRow(sIdx)} className="text-[11px] text-[#A78BFA] hover:underline">+ Topic Jodein</button>
                </div>
              </div>
            ))}
          </div>
          <button type="button" onClick={addSubjectRow} className="mt-2 w-full py-2 rounded-lg bg-[#1F2937] border border-gray-700 text-gray-300 hover:border-gray-500 text-xs font-medium">
            + Aur Subject Jodein
          </button>
        </div>

        <div className="bg-[#0A0D14] border border-gray-800 rounded-xl p-3 flex items-center justify-between text-sm">
          <span className="text-gray-400">Total (auto-calculated):</span>
          <span className="font-semibold text-[#A78BFA]">{totalQuestions} questions · {totalMarks} marks</span>
        </div>

        <button type="submit" disabled={status === "submitting"} className="w-full py-2.5 rounded-xl bg-[#7C3AED] hover:bg-[#6D28D9] font-semibold text-sm disabled:opacity-50">
          {status === "submitting" ? "Bana rahe hain..." : "Blueprint Banayein"}
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
      setMessage("❌ Exam Name, Subject, Topic aur Passage text zaroori hain.");
      return;
    }
    const validQuestions = questions.filter((q) => q.question.trim() && q.option1 && q.option2 && q.option3 && q.option4 && q.correctOption);
    if (validQuestions.length === 0) {
      setMessage("❌ Kam se kam ek poora sawaal (options + sahi answer ke saath) dalein.");
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
      setMessage(`✅ Passage add ho gaya! (${validQuestions.length} questions)`);
      setPassageText("");
      setQuestions([{ ...EMPTY_PASSAGE_Q }]);
    } catch (err) {
      setMessage(err.response?.data?.message || "Error aaya.");
    } finally {
      setStatus("idle");
    }
  };

  const inputClass = "w-full px-4 py-2.5 text-sm bg-[#0A0D14] border border-gray-700 focus:border-[#7C3AED] rounded-xl outline-none text-white placeholder-gray-600";
  const tinyInputClass = "px-3 py-2 text-xs bg-[#111827] border border-gray-700 focus:border-[#7C3AED] rounded-lg outline-none text-white placeholder-gray-600";

  return (
    <div className="bg-[#111827] border border-[#7C3AED]/40 rounded-2xl p-5 sm:p-6">
      <h3 className="font-semibold text-base mb-1">📖 Unseen Passage Add Karein</h3>
      <p className="text-xs text-gray-500 mb-4">Ek passage + uske saare sawaal ek saath — jis subject/topic ko yahan chunoge, mock mein wahi sawaal usi subject ke andar, ek block mein saath-saath aayenge.</p>

      {message && (
        <div className={`mb-4 p-3 rounded-lg text-xs text-center ${message.startsWith("✅") ? "bg-green-500/10 text-green-400" : "bg-red-500/10 text-red-400"}`}>
          {message}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-3">
        <input value={examName} onChange={(e) => { setExamName(e.target.value); setSubjectName(""); setTopicName(""); }} placeholder="Exam Name (jaise: UPSSSC PET)" className={inputClass} />

        {examName.trim() && structureLoading && <p className="text-xs text-gray-500">Blueprint check ho raha hai...</p>}
        {examName.trim() && !structureLoading && subjectsWithPassage.length === 0 ? (
          <div className="p-3 bg-amber-500/10 border border-amber-500/25 rounded-xl text-xs text-amber-400">
            ⚠️ '{examName}' ke liye koi Unseen Passage topic nahi mila. Pehle "📐 Blueprint Add Karein" mein kisi subject ke andar ek topic ko "Unseen Passage" mark karein.
          </div>
        ) : subjectsWithPassage.length > 0 ? (
          <>
            <select value={subjectName} onChange={(e) => { setSubjectName(e.target.value); setTopicName(""); }} className={inputClass}>
              <option value="">Subject Chunein</option>
              {subjectsWithPassage.map((s) => <option key={s.subjectName} value={s.subjectName}>{s.subjectName}</option>)}
            </select>

            {subjectName && (
              <select value={topicName} onChange={(e) => setTopicName(e.target.value)} className={inputClass}>
                <option value="">Passage Topic Chunein</option>
                {passageTopics.map((t) => <option key={t.topicName} value={t.topicName}>{t.topicName}</option>)}
              </select>
            )}
          </>
        ) : null}

        <textarea value={passageText} onChange={(e) => setPassageText(e.target.value)} rows={6} placeholder="Poora passage yahan paste karein..." className={inputClass} />

        <div>
          <p className="text-xs font-semibold tracking-wider text-gray-400 uppercase mt-3 mb-2">Is Passage Ke Sawaal</p>
          <div className="space-y-3">
            {questions.map((q, idx) => (
              <div key={idx} className="bg-[#0A0D14] border border-gray-800 rounded-xl p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] text-gray-500">Question {idx + 1}</span>
                  <button type="button" onClick={() => removeQuestionRow(idx)} className="text-gray-600 hover:text-red-400 text-xs">✕</button>
                </div>
                <textarea value={q.question} onChange={(e) => updateQuestion(idx, "question", e.target.value)} rows={2} placeholder="Sawaal" className={`${tinyInputClass} w-full`} />
                <div className="grid grid-cols-2 gap-2">
                  <input value={q.option1} onChange={(e) => updateQuestion(idx, "option1", e.target.value)} placeholder="Option 1" className={tinyInputClass} />
                  <input value={q.option2} onChange={(e) => updateQuestion(idx, "option2", e.target.value)} placeholder="Option 2" className={tinyInputClass} />
                  <input value={q.option3} onChange={(e) => updateQuestion(idx, "option3", e.target.value)} placeholder="Option 3" className={tinyInputClass} />
                  <input value={q.option4} onChange={(e) => updateQuestion(idx, "option4", e.target.value)} placeholder="Option 4" className={tinyInputClass} />
                </div>
                <select value={q.correctOption} onChange={(e) => updateQuestion(idx, "correctOption", e.target.value)} className={`${tinyInputClass} w-full`}>
                  <option value="">Sahi Answer Chunein</option>
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
            + Aur Sawaal Jodein
          </button>
        </div>

        <button type="submit" disabled={status === "submitting"} className="w-full py-2.5 rounded-xl bg-[#7C3AED] hover:bg-[#6D28D9] font-semibold text-sm disabled:opacity-50">
          {status === "submitting" ? "Add ho raha hai..." : "Passage Add Karein"}
        </button>
      </form>
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

        <AddUnseenPassageCard />

        <AddQuestionCard />

        <CreateMainTeacherCard />

        <div className="space-y-3">
          <p className="text-xs font-semibold tracking-wider text-gray-500 uppercase">Content (Advanced)</p>

          <JsonActionCard
            title="📊 Rank Predictor Data Add Karein"
            description="examName, year, dataPoints ([{score, rank}]), totalCandidates, totalVacancies, isActive"
            endpoint="/add-rank-predictor-data"
            placeholder={JSON.stringify({ examName: "UPSC", year: 2026, dataPoints: [{ score: 150, rank: 500 }], totalCandidates: 500000, totalVacancies: 1000, isActive: true }, null, 2)}
            aiHint="Neeche diye JSON format mein mujhe [EXAM NAAM BADLEIN] ke liye realistic score-vs-rank dataPoints do (kam se kam 8-10 points, high score se low score tak). Sirf ek JSON object return karo, koi extra text nahi."
          />

          <JsonActionCard
            title="📄 Previous Year Test (Global) Add Karein"
            description="examName, testName, year, description, subjects ([{subjectName, questions: [...]}]), marksPerQuestion, negativeMarking, durationMinutes"
            endpoint="/add-previous-year-test"
            placeholder={JSON.stringify({ examName: "UPSC", testName: "UPSC Prelims 2025", year: 2025, description: "", subjects: [{ subjectName: "History", questions: [{ question: "यहाँ सवाल", option1: "विकल्प 1", option2: "विकल्प 2", option3: "विकल्प 3", option4: "विकल्प 4", correctOption: 1, answerExplain: "व्याख्या", topicName: "Ancient India" }] }], marksPerQuestion: 2, negativeMarking: 0.5, durationMinutes: 120 }, null, 2)}
            aiHint="Neeche diye JSON format mein mujhe [EXAM NAAM] ke [SAAL] ke previous year paper jaisa poora test do — [SUBJECT NAAM BADLEIN] subject ke [KITNE CHAHIYE] MCQ questions Hindi mein. correctOption 1-4 number ho. Sirf ek JSON object return karo, koi extra text nahi."
          />

          <JsonActionCard
            title="📰 Current Affair Add Karein"
            description="examName, date (YYYY-MM-DD), title, items ([{headline, content, category, source}])"
            endpoint="/add-current-affair"
            placeholder={JSON.stringify({ examName: "UPSC", date: "2026-09-17", title: "Daily Current Affairs", items: [{ headline: "यहाँ headline", content: "yahan poora detail", category: "National", source: "PIB" }] }, null, 2)}
            aiHint="Neeche diye JSON format mein mujhe [TAREEKH] ke [EXAM NAAM] ke liye [KITNI CHAHIYE] real current affairs items do (asli, verified khabrein — banayi hui nahi). Sirf ek JSON object return karo, koi extra text nahi."
          />

          <JsonActionCard
            title="📝 Current Affair Quiz Add Karein"
            description="examName, date (YYYY-MM-DD), questions ([{question, option1..4, correctOption, answerExplain}])"
            endpoint="/add-current-affair-quiz"
            placeholder={JSON.stringify({ examName: "UPSC", date: "2026-09-17", questions: [{ question: "यहाँ सवाल", option1: "विकल्प 1", option2: "विकल्प 2", option3: "विकल्प 3", option4: "विकल्प 4", correctOption: 1, answerExplain: "व्याख्या" }] }, null, 2)}
            aiHint="Neeche diye JSON format mein mujhe [TAREEKH] ke real current affairs par based [KITNE CHAHIYE] quiz questions do. correctOption 1-4 number ho. Sirf ek JSON object return karo, koi extra text nahi."
          />
        </div>
      </div>
    </div>
  );
};

export default AdminPanel;
