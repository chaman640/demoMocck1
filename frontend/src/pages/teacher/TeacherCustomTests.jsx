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
      <SkeletonBlock className="w-full h-24 rounded-2xl" />
    </div>
  </div>
);

const EMPTY_META = { testName: "", durationMinutes: "", marksPerQuestion: 1, negativeMarking: 0 };
const EMPTY_Q_FORM = {
  topicName: "",
  question: "",
  questionPhoto: "", // 🆕 Cloudinary URL (upload turant hota hai, yahan URL store hoti hai)
  option1: "",
  option2: "",
  option3: "",
  option4: "",
  correctOption: "",
  answerExplain: "",
  answerExplainWithPhoto: "", // 🆕
  askedIn: "", // 🆕 optional — "UPSSSC PET 2019" jaisa
};

const TeacherCustomTests = () => {
  const navigate = useNavigate();

  const [phase, setPhase] = useState("loading");
  const [errorMsg, setErrorMsg] = useState("");
  const [teacher, setTeacher] = useState(null);
  const [role, setRole] = useState("main");
  const [subjectOptions, setSubjectOptions] = useState([]); // sub-teacher ke authorized subjects
  const [tests, setTests] = useState([]);

  const [showBuilder, setShowBuilder] = useState(false);
  const [meta, setMeta] = useState(EMPTY_META);
  const [subjects, setSubjects] = useState([]); // [{ subjectName, questions: [...] }]

  const [newSubjectName, setNewSubjectName] = useState("");
  const [activeSubjectIdx, setActiveSubjectIdx] = useState(null); // kaunse subject mein question add ho raha hai
  const [qForm, setQForm] = useState(EMPTY_Q_FORM);
  const [uploadingPhoto, setUploadingPhoto] = useState(null); // 🆕 "question" | "explain" | null

  const [builderError, setBuilderError] = useState("");
  const [creating, setCreating] = useState(false);
  const [builderMode, setBuilderMode] = useState("form"); // 🆕 "form" | "bulk"
  const [bulkTestJson, setBulkTestJson] = useState("");
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

      if (t.activeCoupon) {
        const testsRes = await api.get("/teacher/custom-test/list");
        setTests(testsRes.data.data || []);
      } else {
        setTests([]);
      }

      setPhase("view");
    } catch (err) {
      if (err.response?.status === 401) {
        navigate("/TeacherLogin");
        return;
      }
      setErrorMsg(err.response?.data?.message || "Tests load nahi ho paaye.");
      setPhase("error");
    }
  }, [navigate]);

  useEffect(() => { load(); }, [load]);

  const handleCouponChanged = () => {
    resetBuilder();
    load();
  };

  const resetBuilder = () => {
    setShowBuilder(false);
    setMeta(EMPTY_META);
    setSubjects([]);
    setNewSubjectName("");
    setActiveSubjectIdx(null);
    setQForm(EMPTY_Q_FORM);
    setBuilderError("");
  };

  // ── Subject management ──
  const addSubject = () => {
    const name = newSubjectName.trim();
    if (!name) return;
    if (subjects.some((s) => s.subjectName === name)) {
      setBuilderError("Ye subject pehle se add hai.");
      return;
    }
    setSubjects((prev) => [...prev, { subjectName: name, questions: [] }]);
    setNewSubjectName("");
    setActiveSubjectIdx(subjects.length); // naye subject ko active kar do
    setBuilderError("");
  };

  const removeSubject = (idx) => {
    setSubjects((prev) => prev.filter((_, i) => i !== idx));
    if (activeSubjectIdx === idx) setActiveSubjectIdx(null);
  };

  // ── Question management (active subject ke andar) ──
  const handleQChange = (e) => {
    setQForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  // 🆕 Photo select karte hi turant upload — poora test JSON se banta hai
  // (multipart nahi), isliye photo pehle alag se upload karke URL leni
  // padti hai, phir wahi URL qForm mein store hoti hai
  const handlePhotoUpload = async (field, file) => {
    if (!file) return;
    setUploadingPhoto(field === "questionPhoto" ? "question" : "explain");
    setBuilderError("");
    try {
      const fd = new FormData();
      fd.append("image", file);
      const res = await api.post("/teacher/upload-image", fd, { headers: { "Content-Type": "multipart/form-data" } });
      setQForm((prev) => ({ ...prev, [field]: res.data.url }));
    } catch (err) {
      setBuilderError(err.response?.data?.message || "Photo upload nahi ho paayi.");
    } finally {
      setUploadingPhoto(null);
    }
  };

  const addQuestionToActiveSubject = () => {
    setBuilderError("");
    if (activeSubjectIdx === null) return;
    if (
      !qForm.question.trim() ||
      !qForm.option1.trim() ||
      !qForm.option2.trim() ||
      !qForm.option3.trim() ||
      !qForm.option4.trim() ||
      !qForm.correctOption
    ) {
      setBuilderError("Sabhi question fields zaroori hain!");
      return;
    }

    setSubjects((prev) =>
      prev.map((s, i) =>
        i === activeSubjectIdx
          ? {
              ...s,
              questions: [
                ...s.questions,
                {
                  ...qForm,
                  correctOption: Number(qForm.correctOption),
                  topicName: qForm.topicName.trim() || "General",
                },
              ],
            }
          : s
      )
    );
    setQForm(EMPTY_Q_FORM);
  };

  const removeQuestionFromSubject = (subjIdx, qIdx) => {
    setSubjects((prev) =>
      prev.map((s, i) => (i === subjIdx ? { ...s, questions: s.questions.filter((_, qi) => qi !== qIdx) } : s))
    );
  };

  // ── Final submit ──
  const handleCreateTest = async () => {
    setBuilderError("");

    if (!meta.testName.trim() || !meta.durationMinutes) {
      setBuilderError("Test naam aur duration zaroori hain!");
      return;
    }
    if (subjects.length === 0) {
      setBuilderError("Kam se kam ek subject add karein!");
      return;
    }
    const emptySubject = subjects.find((s) => s.questions.length === 0);
    if (emptySubject) {
      setBuilderError(`'${emptySubject.subjectName}' mein kam se kam ek question add karein.`);
      return;
    }

    setCreating(true);
    try {
      await api.post("/teacher/custom-test/create", {
        couponId: teacher.activeCoupon,
        testName: meta.testName.trim(),
        durationMinutes: Number(meta.durationMinutes),
        marksPerQuestion: Number(meta.marksPerQuestion) || 1,
        negativeMarking: Number(meta.negativeMarking) || 0,
        subjects,
      });
      resetBuilder();
      await load();
    } catch (err) {
      setBuilderError(err.response?.data?.message || "Test nahi ban paaya.");
    } finally {
      setCreating(false);
    }
  };

  // 🆕 AI ko bhejne layak demo JSON — poora test ek saath (meta + subjects + questions)
  const DEMO_TEST_JSON = {
    testName: "Reasoning Practice Set 1",
    durationMinutes: 30,
    marksPerQuestion: 1,
    negativeMarking: 0.25,
    subjects: [
      {
        subjectName: "Reasoning",
        questions: [
          {
            question: "यहाँ सवाल लिखें?",
            option1: "पहला विकल्प",
            option2: "दूसरा विकल्प",
            option3: "तीसरा विकल्प",
            option4: "चौथा विकल्प",
            correctOption: 1,
            answerExplain: "यहाँ व्याख्या लिखें",
            topicName: "Blood Relations",
          },
        ],
      },
    ],
  };
  const AI_TEST_PROMPT_HINT =
    "Neeche diye JSON format mein mujhe [SUBJECT NAAM BADLEIN] subject ka ek poora practice test do — [KITNE QUESTIONS CHAHIYE] MCQ questions Hindi mein, [KITNA DURATION] minute ka test. Sirf ek JSON object return karo, koi extra text mat likhna. correctOption hamesha 1,2,3,4 mein se ek number ho.";

  const copyTestDemoForAI = async () => {
    const text = `${AI_TEST_PROMPT_HINT}\n\n${JSON.stringify(DEMO_TEST_JSON, null, 2)}`;
    try {
      await navigator.clipboard.writeText(text);
      setBulkMessage("📋 Demo JSON + prompt copy ho gaya — kisi AI chatbot mein paste karke bhej dein.");
    } catch {
      setBulkMessage("❌ Copy nahi ho paaya.");
    }
  };

  const handleBulkCreateTest = async (e) => {
    e.preventDefault();
    setBulkMessage("");

    let parsed;
    try {
      parsed = JSON.parse(bulkTestJson);
    } catch {
      setBulkMessage("❌ JSON format galat hai — check karein.");
      return;
    }
    if (!parsed.testName || !parsed.durationMinutes || !Array.isArray(parsed.subjects) || parsed.subjects.length === 0) {
      setBulkMessage("❌ testName, durationMinutes aur subjects (kam se kam 1) zaroori hain.");
      return;
    }

    setCreating(true);
    try {
      await api.post("/teacher/custom-test/create", {
        couponId: teacher.activeCoupon,
        testName: parsed.testName,
        durationMinutes: Number(parsed.durationMinutes),
        marksPerQuestion: Number(parsed.marksPerQuestion) || 1,
        negativeMarking: Number(parsed.negativeMarking) || 0,
        subjects: parsed.subjects,
      });
      setBulkMessage("✅ Test ban gaya!");
      setBulkTestJson("");
      resetBuilder();
      setShowBuilder(false);
      await load();
    } catch (err) {
      setBulkMessage(err.response?.data?.message || "Test nahi ban paaya.");
    } finally {
      setCreating(false);
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

  const inputClass = "w-full px-3 py-2 text-xs bg-[#0A0D14] border border-gray-700 focus:border-[#7C3AED] rounded-lg outline-none text-white placeholder-gray-600";
  const totalQuestionsInBuilder = subjects.reduce((sum, s) => sum + s.questions.length, 0);

  return (
    <div className="min-h-screen bg-[#0A0D14] text-white px-4 sm:px-6 py-8 pb-24">
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold mb-1">Custom Tests</h1>
            <p className="text-gray-400 text-sm">Weekly ya chapter-wise test banayein</p>
          </div>
          {teacher?.activeCoupon && (
            <button
              onClick={() => { setShowBuilder((s) => !s); if (showBuilder) resetBuilder(); }}
              className="text-xs px-3 py-2 rounded-lg bg-[#7C3AED] hover:bg-[#6D28D9] font-medium flex-shrink-0"
            >
              {showBuilder ? "Cancel" : "+ Naya Test"}
            </button>
          )}
        </div>

        <ActiveCouponSwitcher activeCouponId={teacher?.activeCoupon} onChanged={handleCouponChanged} />

        {!teacher?.activeCoupon ? (
          <div className="bg-[#111827] border border-gray-800 rounded-2xl p-6 text-center">
            <p className="text-sm text-gray-400">Test banane ke liye pehle active batch select karein.</p>
          </div>
        ) : (
          <>
            {/* ── Builder ── */}
            {showBuilder && (
              <div className="bg-[#111827] border border-gray-800 rounded-2xl p-5 space-y-5">
                {builderError && (
                  <div className="p-3 bg-red-500/10 text-red-400 border border-red-500/25 rounded-xl text-sm text-center">
                    {builderError}
                  </div>
                )}

                <div className="flex gap-2">
                  <button type="button" onClick={() => setBuilderMode("form")} className={`px-4 py-1.5 rounded-full text-xs font-medium ${builderMode === "form" ? "bg-[#7C3AED] text-white" : "bg-[#1F2937] text-gray-400"}`}>
                    Form Se Banayein
                  </button>
                  <button type="button" onClick={() => setBuilderMode("bulk")} className={`px-4 py-1.5 rounded-full text-xs font-medium ${builderMode === "bulk" ? "bg-[#7C3AED] text-white" : "bg-[#1F2937] text-gray-400"}`}>
                    Bulk JSON (AI se likhwa ke)
                  </button>
                </div>

                {builderMode === "bulk" ? (
                  <div className="space-y-3">
                    {bulkMessage && (
                      <div className={`p-3 rounded-xl text-sm text-center ${bulkMessage.startsWith("✅") || bulkMessage.startsWith("📋") ? "bg-green-500/10 text-green-400" : "bg-red-500/10 text-red-400"}`}>
                        {bulkMessage}
                      </div>
                    )}
                    <button type="button" onClick={copyTestDemoForAI} className="w-full py-2.5 rounded-xl bg-[#1F2937] border border-[#7C3AED]/40 text-[#A78BFA] text-sm font-medium hover:bg-[#7C3AED]/10">
                      📋 Demo JSON + AI Prompt Copy Karein
                    </button>
                    <p className="text-[11px] text-gray-500">Upar wala button dabao → AI chatbot mein paste karo → poora test JSON mile to neeche paste karke banayein.</p>
                    <textarea
                      value={bulkTestJson}
                      onChange={(e) => setBulkTestJson(e.target.value)}
                      rows={14}
                      placeholder="Yahan AI se mila poora test JSON paste karein..."
                      className={`${inputClass} font-mono`}
                    />
                    <button type="button" onClick={handleBulkCreateTest} disabled={creating || !bulkTestJson.trim()} className="w-full py-3 rounded-xl bg-[#7C3AED] hover:bg-[#6D28D9] font-semibold text-sm disabled:opacity-50">
                      {creating ? "Ban raha hai..." : "Test Banayein"}
                    </button>
                  </div>
                ) : (
                  <>
                {/* Test meta */}
                <div>
                  <h3 className="text-sm font-semibold text-gray-300 mb-3">Test Details</h3>
                  <div className="space-y-3">
                    <input
                      type="text"
                      value={meta.testName}
                      onChange={(e) => setMeta((p) => ({ ...p, testName: e.target.value }))}
                      placeholder="Test naam (e.g. Weekly Test - Week 1)"
                      className={inputClass}
                    />
                    <div className="grid grid-cols-3 gap-2">
                      <input
                        type="number"
                        value={meta.durationMinutes}
                        onChange={(e) => setMeta((p) => ({ ...p, durationMinutes: e.target.value }))}
                        placeholder="Duration (min)"
                        className={inputClass}
                      />
                      <input
                        type="number"
                        value={meta.marksPerQuestion}
                        onChange={(e) => setMeta((p) => ({ ...p, marksPerQuestion: e.target.value }))}
                        placeholder="Marks/Q"
                        className={inputClass}
                      />
                      <input
                        type="number"
                        step="0.25"
                        value={meta.negativeMarking}
                        onChange={(e) => setMeta((p) => ({ ...p, negativeMarking: e.target.value }))}
                        placeholder="Negative"
                        className={inputClass}
                      />
                    </div>
                  </div>
                </div>

                {/* Add subject */}
                <div>
                  <h3 className="text-sm font-semibold text-gray-300 mb-3">Subjects</h3>
                  <div className="flex gap-2 mb-3">
                    {role === "sub" ? (
                      <select
                        value={newSubjectName}
                        onChange={(e) => setNewSubjectName(e.target.value)}
                        className={`${inputClass} flex-1 appearance-none cursor-pointer`}
                      >
                        <option value="">Subject chunein</option>
                        {subjectOptions
                          .filter((s) => !subjects.some((sub) => sub.subjectName === s))
                          .map((s) => (
                            <option key={s} value={s}>{s}</option>
                          ))}
                      </select>
                    ) : (
                      <SubjectPicker
                        value={newSubjectName}
                        onChange={setNewSubjectName}
                        placeholder="Subject naam (e.g. Hindi)"
                        className={`${inputClass} w-full`}
                        wrapperClassName="flex-1 min-w-0"
                        compact
                      />
                    )}
                    <button
                      type="button"
                      onClick={addSubject}
                      className="px-4 py-2 text-xs rounded-lg bg-[#1F2937] border border-gray-700 hover:border-[#7C3AED] flex-shrink-0"
                    >
                      + Add
                    </button>
                  </div>

                  {/* Subject tabs */}
                  {subjects.length > 0 && (
                    <div className="flex gap-2 overflow-x-auto pb-1 mb-4">
                      {subjects.map((s, idx) => (
                        <button
                          key={s.subjectName}
                          onClick={() => setActiveSubjectIdx(idx)}
                          className={`px-3 py-1.5 rounded-full text-xs whitespace-nowrap flex items-center gap-1.5 flex-shrink-0 ${
                            activeSubjectIdx === idx
                              ? "bg-[#7C3AED] text-white"
                              : "bg-[#1F2937] border border-gray-800 text-gray-400"
                          }`}
                        >
                          {s.subjectName} ({s.questions.length})
                          <span
                            onClick={(e) => { e.stopPropagation(); removeSubject(idx); }}
                            className="text-red-300 hover:text-red-100"
                          >
                            ✕
                          </span>
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Active subject — question add form */}
                  {activeSubjectIdx !== null && subjects[activeSubjectIdx] && (
                    <div className="bg-[#0A0D14] border border-gray-800 rounded-xl p-4 space-y-3">
                      <p className="text-xs text-gray-500">
                        '{subjects[activeSubjectIdx].subjectName}' mein question add karein
                      </p>

                      <input
                        type="text"
                        name="topicName"
                        value={qForm.topicName}
                        onChange={handleQChange}
                        placeholder="Topic (optional)"
                        className={inputClass}
                      />
                      <textarea
                        name="question"
                        value={qForm.question}
                        onChange={handleQChange}
                        rows={2}
                        placeholder="Sawaal likhein..."
                        className={inputClass}
                      />

                      {/* 🆕 Question ke saath photo */}
                      <div>
                        <label className="block text-[10px] text-gray-500 uppercase mb-1">Question Photo (optional)</label>
                        <input
                          type="file"
                          accept="image/*"
                          disabled={uploadingPhoto === "question"}
                          onChange={(e) => handlePhotoUpload("questionPhoto", e.target.files?.[0])}
                          className="w-full text-xs text-gray-400 file:mr-3 file:py-2 file:px-3 file:rounded-lg file:border-0 file:bg-[#1F2937] file:text-gray-300 file:text-xs"
                        />
                        {uploadingPhoto === "question" && <p className="text-[10px] text-[#A78BFA] mt-1">Upload ho raha hai...</p>}
                        {qForm.questionPhoto && uploadingPhoto !== "question" && <p className="text-[10px] text-green-400 mt-1">✅ Photo lag gayi</p>}
                      </div>

                      <div className="space-y-2">
                        {[1, 2, 3, 4].map((n) => (
                          <div key={n} className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => setQForm((prev) => ({ ...prev, correctOption: String(n) }))}
                              className={`w-7 h-7 flex-shrink-0 rounded-full border flex items-center justify-center text-[11px] font-medium ${
                                qForm.correctOption === String(n)
                                  ? "border-green-500 bg-green-500/20 text-green-400"
                                  : "border-gray-600 text-gray-500"
                              }`}
                            >
                              {n}
                            </button>
                            <input
                              type="text"
                              name={`option${n}`}
                              value={qForm[`option${n}`]}
                              onChange={handleQChange}
                              placeholder={`Option ${n}`}
                              className={inputClass}
                            />
                          </div>
                        ))}
                      </div>

                      <textarea
                        name="answerExplain"
                        value={qForm.answerExplain}
                        onChange={handleQChange}
                        rows={2}
                        placeholder="Explanation (optional)"
                        className={inputClass}
                      />

                      {/* 🆕 Explanation ke saath photo (jaise diagram/chart) */}
                      <div>
                        <label className="block text-[10px] text-gray-500 uppercase mb-1">Explanation Photo (optional)</label>
                        <input
                          type="file"
                          accept="image/*"
                          disabled={uploadingPhoto === "explain"}
                          onChange={(e) => handlePhotoUpload("answerExplainWithPhoto", e.target.files?.[0])}
                          className="w-full text-xs text-gray-400 file:mr-3 file:py-2 file:px-3 file:rounded-lg file:border-0 file:bg-[#1F2937] file:text-gray-300 file:text-xs"
                        />
                        {uploadingPhoto === "explain" && <p className="text-[10px] text-[#A78BFA] mt-1">Upload ho raha hai...</p>}
                        {qForm.answerExplainWithPhoto && uploadingPhoto !== "explain" && <p className="text-[10px] text-green-400 mt-1">✅ Photo lag gayi</p>}
                      </div>

                      {/* 🆕 Ye sawaal pehle kis exam/saal mein aa chuka hai — student ko sawaal ke niche dikhega */}
                      <input
                        type="text"
                        name="askedIn"
                        value={qForm.askedIn}
                        onChange={handleQChange}
                        placeholder="Pehle kab pucha gaya? jaise: UPSSSC PET 2019 (optional)"
                        className={inputClass}
                      />

                      <button
                        type="button"
                        onClick={addQuestionToActiveSubject}
                        className="w-full py-2 rounded-lg bg-[#1F2937] border border-[#7C3AED]/40 text-[#A78BFA] text-xs font-medium hover:bg-[#7C3AED]/10"
                      >
                        + Is Subject Mein Question Add Karein
                      </button>

                      {/* Already added questions in this subject */}
                      {subjects[activeSubjectIdx].questions.length > 0 && (
                        <div className="space-y-1.5 pt-2">
                          {subjects[activeSubjectIdx].questions.map((q, qi) => (
                            <div key={qi} className="flex items-center justify-between bg-[#111827] rounded-lg px-3 py-2">
                              <p className="text-xs text-gray-300 truncate flex-1">{q.question}</p>
                              <button
                                onClick={() => removeQuestionFromSubject(activeSubjectIdx, qi)}
                                className="text-red-400 text-xs ml-2 flex-shrink-0"
                              >
                                ✕
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                <button
                  onClick={handleCreateTest}
                  disabled={creating || totalQuestionsInBuilder === 0}
                  className="w-full py-3 rounded-xl bg-[#7C3AED] hover:bg-[#6D28D9] font-semibold disabled:opacity-50"
                >
                  {creating ? "Ban raha hai..." : `Test Banayein (${totalQuestionsInBuilder} sawaal)`}
                </button>
                  </>
                )}
              </div>
            )}

            {/* ── List ── */}
            {tests.length === 0 ? (
              <div className="bg-[#111827] border border-gray-800 rounded-2xl p-6 text-center">
                <p className="text-sm text-gray-400">Is batch ke liye abhi koi custom test nahi bana.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {tests.map((t) => (
                  <div key={t.testId} className="bg-[#111827] border border-gray-800 rounded-2xl p-5">
                    <h3 className="font-semibold text-sm mb-1">{t.testName}</h3>
                    <p className="text-xs text-gray-500 mb-2">
                      {t.totalQuestions} sawaal &middot; {t.durationMinutes} min &middot; {t.subjectNames.join(", ")}
                    </p>
                    <p className="text-[11px] text-gray-600 mb-3">
                      Banaya by {t.createdByName} &middot;{" "}
                      {new Date(t.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                    </p>
                    {/* 🆕 Results — leaderboard (kisne kitna score kiya) + question-wise analysis */}
                    <button
                      onClick={() => navigate(`/TeacherCustomTestResults/${t.testId}`)}
                      className="w-full py-2 rounded-lg bg-[#1F2937] border border-[#7C3AED]/40 text-[#A78BFA] text-xs font-medium hover:bg-[#7C3AED]/10"
                    >
                      📊 Results Dekhein
                    </button>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
      <TeacherBottomNav />
    </div>
  );
};

export default TeacherCustomTests;
