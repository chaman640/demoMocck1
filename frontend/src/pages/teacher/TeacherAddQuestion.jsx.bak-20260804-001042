import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../api/api";
import TeacherBottomNav from "../../components/TeacherBottomNav";
import ActiveCouponSwitcher from "../../components/ActiveCouponSwitcher";

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

        {!teacher?.activeCoupon ? (
          <div className="bg-[#111827] border border-gray-800 rounded-2xl p-6 text-center">
            <p className="text-sm text-gray-400">
              Sawaal add karne se pehle upar se ek active batch select karein.
            </p>
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
                    <input
                      type="text"
                      name="subjectName"
                      value={form.subjectName}
                      onChange={handleChange}
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