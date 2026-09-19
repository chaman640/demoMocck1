import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../api/api";
import TeacherBottomNav from "../../components/TeacherBottomNav";
import ActiveCouponSwitcher from "../../components/ActiveCouponSwitcher";
import SubjectPicker from "../../components/SubjectPicker";

const SkeletonBlock = ({ className = "" }) => (
  <div className={`bg-gray-800/70 rounded animate-pulse ${className}`} />
);

const PageSkeleton = () => (
  <div className="min-h-screen bg-[#0A0D14] text-white px-4 sm:px-6 py-8 pb-24">
    <div className="max-w-2xl mx-auto space-y-4">
      <SkeletonBlock className="w-48 h-7" />
      <SkeletonBlock className="w-full h-16 rounded-xl" />
      <SkeletonBlock className="w-full h-96 rounded-2xl" />
    </div>
  </div>
);

const EMPTY_FORM = {
  subjectName: "",
  topicName: "",
  question: "",
  option1: "",
  option2: "",
  option3: "",
  option4: "",
  correctOption: "",
  answerExplain: "",
  askedIn: "", // 🆕 optional — "UPSSSC PET 2019" jaisa
};

const TeacherAddQuestion = () => {
  const navigate = useNavigate();

  const [phase, setPhase] = useState("loading");
  const [errorMsg, setErrorMsg] = useState("");
  const [teacher, setTeacher] = useState(null);
  const [role, setRole] = useState("main");
  const [subjectOptions, setSubjectOptions] = useState([]); // sub-teacher ke liye

  const [form, setForm] = useState(EMPTY_FORM);
  const [questionPhoto, setQuestionPhoto] = useState(null);
  const [answerPhoto, setAnswerPhoto] = useState(null);
  const [formError, setFormError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [sessionAdded, setSessionAdded] = useState([]);
  const [mode, setMode] = useState("single"); // 🆕 "single" | "bulk"
  const [bulkJson, setBulkJson] = useState("");
  const [bulkMessage, setBulkMessage] = useState("");

  const load = useCallback(async () => {
    setPhase("loading");
    try {
      const [meRes, couponsRes] = await Promise.all([
        api.get("/teacher-me"),
        api.get("/my-coupons"),
      ]);
      const t = meRes.data.data;
      setTeacher(t);
      setRole(couponsRes.data.role || "main");

      if (couponsRes.data.role === "sub" && t.activeCoupon) {
        const activeCoup = (couponsRes.data.data || []).find((c) => c._id === t.activeCoupon);
        setSubjectOptions(activeCoup ? activeCoup.subjects : []);
      }

      setPhase("view");
    } catch (err) {
      if (err.response?.status === 401) {
        navigate("/TeacherLogin");
        return;
      }
      setErrorMsg(err.response?.data?.message || "Data load nahi ho paaya.");
      setPhase("error");
    }
  }, [navigate]);

  useEffect(() => { load(); }, [load]);

  const handleCouponChanged = () => {
    setSessionAdded([]);
    load();
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const resetForm = () => {
    setForm((prev) => ({ ...EMPTY_FORM, subjectName: prev.subjectName })); // subject retain karo — usually same subject ke kai questions daalte hain
    setQuestionPhoto(null);
    setAnswerPhoto(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError("");

    if (!teacher?.activeCoupon) {
      setFormError("Pehle apna active batch select karein!");
      return;
    }
    if (
      !form.subjectName.trim() ||
      !form.topicName.trim() ||
      !form.question.trim() ||
      !form.option1.trim() ||
      !form.option2.trim() ||
      !form.option3.trim() ||
      !form.option4.trim() ||
      !form.correctOption ||
      !form.answerExplain.trim()
    ) {
      setFormError("Sabhi fields (photo ke alawa) zaroori hain!");
      return;
    }

    setSubmitting(true);
    try {
      const fd = new FormData();
      fd.append("couponId", teacher.activeCoupon);
      fd.append("subjectName", form.subjectName.trim());
      fd.append("topicName", form.topicName.trim());
      fd.append("question", form.question.trim());
      fd.append("option1", form.option1.trim());
      fd.append("option2", form.option2.trim());
      fd.append("option3", form.option3.trim());
      fd.append("option4", form.option4.trim());
      fd.append("correctOption", form.correctOption);
      fd.append("answerExplain", form.answerExplain.trim());
      if (form.askedIn.trim()) fd.append("askedIn", form.askedIn.trim()); // 🆕 optional
      if (questionPhoto) fd.append("questionPhoto", questionPhoto);
      if (answerPhoto) fd.append("answerExplainWithPhoto", answerPhoto);

      const res = await api.post("/teacher/add-question", fd);
      const saved = res.data.data?.[0] || res.data.data;

      setSessionAdded((prev) => [
        { question: form.question, subjectName: form.subjectName, topicName: form.topicName },
        ...prev,
      ]);
      resetForm();
    } catch (err) {
      setFormError(err.response?.data?.message || "Question save nahi ho paaya.");
    } finally {
      setSubmitting(false);
    }
  };

  // 🆕 AI ko bhejne layak demo JSON + samjhaane wala prompt, ek saath copy
  const DEMO_BULK_QUESTIONS = [
    {
      subjectName: form.subjectName || "Reasoning",
      topicName: "Blood Relations",
      question: "यहाँ सवाल लिखें?",
      option1: "पहला विकल्प",
      option2: "दूसरा विकल्प",
      option3: "तीसरा विकल्प",
      option4: "चौथा विकल्प",
      correctOption: 1,
      answerExplain: "यहाँ व्याख्या लिखें",
    },
  ];
  const AI_PROMPT_HINT =
    "Neeche diye JSON format mein mujhe [SUBJECT/TOPIC BADLEIN] ke [KITNE CHAHIYE VO NUMBER] MCQ questions Hindi mein do. Sirf ek JSON array return karo, koi extra text mat likhna. correctOption hamesha 1,2,3,4 mein se ek number ho (1 ka matlab option1 sahi hai).";

  const copyBulkDemoForAI = async () => {
    const text = `${AI_PROMPT_HINT}\n\n${JSON.stringify(DEMO_BULK_QUESTIONS, null, 2)}`;
    try {
      await navigator.clipboard.writeText(text);
      setBulkMessage("📋 Demo JSON + prompt copy ho gaya — kisi AI chatbot mein paste karke bhej dein.");
    } catch {
      setBulkMessage("❌ Copy nahi ho paaya.");
    }
  };

  const handleBulkSubmit = async (e) => {
    e.preventDefault();
    setBulkMessage("");

    if (!teacher?.activeCoupon) {
      setBulkMessage("❌ Pehle apna active batch select karein!");
      return;
    }

    let parsed;
    try {
      parsed = JSON.parse(bulkJson);
    } catch {
      setBulkMessage("❌ JSON format galat hai — check karein.");
      return;
    }
    if (!Array.isArray(parsed) || parsed.length === 0) {
      setBulkMessage("❌ JSON ek array hona chahiye, kam se kam 1 question ke saath.");
      return;
    }

    setSubmitting(true);
    try {
      await api.post("/teacher/add-question", { couponId: teacher.activeCoupon, questions: parsed });
      setBulkMessage(`✅ ${parsed.length} questions add ho gaye!`);
      setSessionAdded((prev) => [
        ...parsed.map((q) => ({ question: q.question, subjectName: q.subjectName, topicName: q.topicName })),
        ...prev,
      ]);
      setBulkJson("");
    } catch (err) {
      setBulkMessage(err.response?.data?.message || "Questions save nahi ho paaye.");
    } finally {
      setSubmitting(false);
    }
  };

  if (phase === "loading") return <PageSkeleton />;

  if (phase === "error") {
    return (
      <div className="min-h-screen bg-[#0A0D14] text-white flex items-center justify-center px-6 pb-24">
        <div className="max-w-md text-center space-y-4">
          <p className="text-gray-300">{errorMsg}</p>
          <button onClick={load} className="px-5 py-2 rounded-lg bg-[#7C3AED] hover:bg-[#6D28D9] text-sm font-medium">
            Dobara Try Karein
          </button>
        </div>
        <TeacherBottomNav />
      </div>
    );
  }

  const inputClass =
    "w-full px-4 py-2.5 text-sm bg-[#0A0D14] border border-gray-700 focus:border-[#7C3AED] rounded-xl outline-none transition-colors text-white placeholder-gray-600";

  return (
    <div className="min-h-screen bg-[#0A0D14] text-white px-4 sm:px-6 py-8 pb-24">
      <div className="max-w-2xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold mb-1">Question Add Karein</h1>
          <p className="text-gray-400 text-sm">Apne active batch ke liye naya sawaal jodein</p>
        </div>

        <ActiveCouponSwitcher activeCouponId={teacher?.activeCoupon} onChanged={handleCouponChanged} />

        {teacher?.activeCoupon && (
          <div className="flex gap-2">
            <button type="button" onClick={() => setMode("single")} className={`px-4 py-1.5 rounded-full text-xs font-medium ${mode === "single" ? "bg-[#7C3AED] text-white" : "bg-[#1F2937] text-gray-400"}`}>
              Ek-Ek Karke (form)
            </button>
            <button type="button" onClick={() => setMode("bulk")} className={`px-4 py-1.5 rounded-full text-xs font-medium ${mode === "bulk" ? "bg-[#7C3AED] text-white" : "bg-[#1F2937] text-gray-400"}`}>
              Bulk JSON (AI se likhwa ke)
            </button>
          </div>
        )}

        {!teacher?.activeCoupon ? (
          <div className="bg-[#111827] border border-gray-800 rounded-2xl p-6 text-center">
            <p className="text-sm text-gray-400">
              Sawaal add karne se pehle upar se ek active batch select karein.
            </p>
          </div>
        ) : mode === "bulk" ? (
          <div className="bg-[#111827] border border-gray-800 rounded-2xl p-5">
            {bulkMessage && (
              <div className={`mb-4 p-3 rounded-xl text-sm text-center ${bulkMessage.startsWith("✅") || bulkMessage.startsWith("📋") ? "bg-green-500/10 text-green-400" : "bg-red-500/10 text-red-400"}`}>
                {bulkMessage}
              </div>
            )}
            <form onSubmit={handleBulkSubmit} className="space-y-3">
              <button type="button" onClick={copyBulkDemoForAI} className="w-full py-2.5 rounded-xl bg-[#1F2937] border border-[#7C3AED]/40 text-[#A78BFA] text-sm font-medium hover:bg-[#7C3AED]/10">
                📋 Demo JSON + AI Prompt Copy Karein
              </button>
              <p className="text-[11px] text-gray-500">Upar wala button dabao → copy hua text kisi AI chatbot mein paste karo → jo JSON array mile use neeche paste karke submit karo. Photo bulk mode mein add nahi hoti — photo wale sawaal "Ek-Ek Karke" mode se add karein.</p>
              <textarea
                value={bulkJson}
                onChange={(e) => setBulkJson(e.target.value)}
                rows={12}
                placeholder="Yahan AI se mila JSON array paste karein..."
                className={`${inputClass} font-mono text-xs`}
              />
              <button type="submit" disabled={submitting || !bulkJson.trim()} className="w-full py-3 rounded-xl bg-[#7C3AED] hover:bg-[#6D28D9] font-semibold disabled:opacity-50">
                {submitting ? "Save ho raha hai..." : "Sabhi Sawaal Save Karein"}
              </button>
            </form>
          </div>
        ) : (
          <div className="bg-[#111827] border border-gray-800 rounded-2xl p-5">
            {formError && (
              <div className="mb-4 p-3 bg-red-500/10 text-red-400 border border-red-500/25 rounded-xl text-sm text-center">
                {formError}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold mb-1.5 uppercase tracking-wide text-gray-400">
                    Subject
                  </label>
                  {role === "sub" ? (
                    <select
                      name="subjectName"
                      value={form.subjectName}
                      onChange={handleChange}
                      className={`${inputClass} appearance-none cursor-pointer`}
                    >
                      <option value="">Subject chunein</option>
                      {subjectOptions.map((s) => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                  ) : (
                    // 👇 subject ab type karne ke bajaye chips se chun sakte hain.
                    // Spelling galti (Maths / maths / Math) se pehle sub-teacher
                    // lock ho jata tha aur sawaal mock test me aate hi nahi the.
                    <SubjectPicker
                      value={form.subjectName}
                      onChange={(v) => setForm((prev) => ({ ...prev, subjectName: v }))}
                      placeholder="e.g. Hindi"
                      className={inputClass}
                    />
                  )}
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1.5 uppercase tracking-wide text-gray-400">
                    Topic
                  </label>
                  <input
                    type="text"
                    name="topicName"
                    value={form.topicName}
                    onChange={handleChange}
                    placeholder="e.g. Sandhi"
                    className={inputClass}
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold mb-1.5 uppercase tracking-wide text-gray-400">
                  Question
                </label>
                <textarea
                  name="question"
                  value={form.question}
                  onChange={handleChange}
                  rows={3}
                  placeholder="Sawaal yahan likhein..."
                  className={inputClass}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold mb-1.5 uppercase tracking-wide text-gray-400">
                  Question Photo (optional)
                </label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => setQuestionPhoto(e.target.files?.[0] || null)}
                  className="w-full text-xs text-gray-400 file:mr-3 file:py-2 file:px-3 file:rounded-lg file:border-0 file:bg-[#1F2937] file:text-gray-300 file:text-xs"
                />
              </div>

              {/* 🆕 Ye sawaal pehle kis exam/saal mein aa chuka hai — optional,
                  student ko sawaal ke niche isi label ke roop mein dikhega */}
              <div>
                <label className="block text-xs font-semibold mb-1.5 uppercase tracking-wide text-gray-400">
                  Pehle Kab Pucha Gaya? (optional)
                </label>
                <input
                  type="text"
                  name="askedIn"
                  value={form.askedIn}
                  onChange={handleChange}
                  placeholder="jaise: UPSSSC PET 2019"
                  className={inputClass}
                />
                <p className="text-[11px] text-gray-500 mt-1">Agar ye ek PYQ hai, to yahan bata dein — student ko sawaal ke niche dikhega.</p>
              </div>

              <div className="space-y-3">
                {[1, 2, 3, 4].map((n) => (
                  <div key={n} className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => setForm((prev) => ({ ...prev, correctOption: String(n) }))}
                      className={`w-8 h-8 flex-shrink-0 rounded-full border flex items-center justify-center text-xs font-medium transition-colors ${
                        form.correctOption === String(n)
                          ? "border-green-500 bg-green-500/20 text-green-400"
                          : "border-gray-600 text-gray-500 hover:border-gray-400"
                      }`}
                      title="Sahi jawab set karein"
                    >
                      {n}
                    </button>
                    <input
                      type="text"
                      name={`option${n}`}
                      value={form[`option${n}`]}
                      onChange={handleChange}
                      placeholder={`Option ${n}`}
                      className={inputClass}
                    />
                  </div>
                ))}
                <p className="text-[11px] text-gray-500">
                  Number pe click karke sahi jawab set karein (abhi: {form.correctOption || "koi nahi"})
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold mb-1.5 uppercase tracking-wide text-gray-400">
                  Explanation
                </label>
                <textarea
                  name="answerExplain"
                  value={form.answerExplain}
                  onChange={handleChange}
                  rows={2}
                  placeholder="Sahi jawab kyun sahi hai..."
                  className={inputClass}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold mb-1.5 uppercase tracking-wide text-gray-400">
                  Explanation Photo (optional)
                </label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => setAnswerPhoto(e.target.files?.[0] || null)}
                  className="w-full text-xs text-gray-400 file:mr-3 file:py-2 file:px-3 file:rounded-lg file:border-0 file:bg-[#1F2937] file:text-gray-300 file:text-xs"
                />
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full py-3 rounded-xl bg-[#7C3AED] hover:bg-[#6D28D9] font-semibold disabled:opacity-50"
              >
                {submitting ? "Save ho raha hai..." : "Sawaal Save Karein"}
              </button>
            </form>
          </div>
        )}

        {/* Session feedback */}
        {sessionAdded.length > 0 && (
          <div>
            <h3 className="text-sm font-semibold text-gray-300 mb-3">
              Is session mein add kiye gaye ({sessionAdded.length})
            </h3>
            <div className="space-y-2">
              {sessionAdded.map((q, i) => (
                <div key={i} className="bg-[#111827] border border-gray-800 rounded-xl p-3">
                  <p className="text-xs text-gray-500 mb-1">{q.subjectName} &middot; {q.topicName}</p>
                  <p className="text-sm text-gray-200 truncate">{q.question}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
      <TeacherBottomNav />
    </div>
  );
};

export default TeacherAddQuestion;
