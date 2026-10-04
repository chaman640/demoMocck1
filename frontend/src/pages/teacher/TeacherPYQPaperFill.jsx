import React, { useState, useEffect, useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";
import api from "../../api/api";
import TeacherBottomNav from "../../components/TeacherBottomNav";

const SkeletonBlock = ({ className = "" }) => (
  <div className={`bg-gray-800/70 rounded animate-pulse ${className}`} />
);

const PageSkeleton = () => (
  <div className="min-h-screen bg-[#0A0D14] text-white px-4 sm:px-6 py-8 pb-24">
    <div className="max-w-2xl mx-auto space-y-4">
      <SkeletonBlock className="w-48 h-7" />
      <SkeletonBlock className="w-full h-96 rounded-2xl" />
    </div>
  </div>
);

const EMPTY_FORM = {
  topicName: "",
  question: "",
  option1: "",
  option2: "",
  option3: "",
  option4: "",
  correctOption: "",
  answerExplain: "",
};

const TeacherPYQPaperFill = () => {
  const navigate = useNavigate();
  const { paperId, subjectName: subjectNameParam } = useParams();
  const subjectName = decodeURIComponent(subjectNameParam);

  const [phase, setPhase] = useState("loading");
  const [errorMsg, setErrorMsg] = useState("");
  const [paperInfo, setPaperInfo] = useState(null);
  const [progress, setProgress] = useState(null);

  const [form, setForm] = useState(EMPTY_FORM);
  const [formError, setFormError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [sessionAdded, setSessionAdded] = useState([]);

  const load = useCallback(async () => {
    setPhase("loading");
    try {
      const res = await api.get(`/teacher/previous-year-paper/${paperId}`);
      const data = res.data.data;
      setPaperInfo(data);
      const sp = data.subjectProgress.find((s) => s.subjectName === subjectName);
      setProgress(sp || null);
      setPhase("view");
    } catch (err) {
      if (err.response?.status === 401) {
        navigate("/TeacherLogin");
        return;
      }
      setErrorMsg(err.response?.data?.message || "Could not load the paper.");
      setPhase("error");
    }
  }, [paperId, subjectName, navigate]);

  useEffect(() => { load(); }, [load]);

  const handleChange = (e) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const resetForm = () => setForm(EMPTY_FORM);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError("");

    if (
      !form.topicName.trim() ||
      !form.question.trim() ||
      !form.option1.trim() ||
      !form.option2.trim() ||
      !form.option3.trim() ||
      !form.option4.trim() ||
      !form.correctOption
    ) {
      setFormError("All fields are required!");
      return;
    }

    setSubmitting(true);
    try {
      const res = await api.post(`/teacher/previous-year-paper/${paperId}/fill-subject`, {
        subjectName,
        questions: [
          {
            topicName: form.topicName.trim(),
            question: form.question.trim(),
            option1: form.option1.trim(),
            option2: form.option2.trim(),
            option3: form.option3.trim(),
            option4: form.option4.trim(),
            correctOption: Number(form.correctOption),
            answerExplain: form.answerExplain.trim(),
          },
        ],
      });

      setSessionAdded((prev) => [{ question: form.question, topicName: form.topicName }, ...prev]);
      setProgress((prev) => ({
        ...prev,
        current: res.data.data.currentCount,
        filled: res.data.data.filled,
      }));
      resetForm();

      if (res.data.data.filled) {
        // Quota poora ho gaya — form ab dobara load karke locked state dikhega
        await load();
      }
    } catch (err) {
      setFormError(err.response?.data?.message || "Could not save the question.");
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
          <button
            onClick={() => navigate("/TeacherPYQPapers")}
            className="px-5 py-2 rounded-lg bg-[#7C3AED] hover:bg-[#6D28D9] text-sm font-medium"
          >
            Go to Papers List
          </button>
        </div>
        <TeacherBottomNav />
      </div>
    );
  }

  if (!progress) {
    return (
      <div className="min-h-screen bg-[#0A0D14] text-white flex items-center justify-center px-6 pb-24">
        <p className="text-gray-300">This subject was not found in this paper's blueprint.</p>
        <TeacherBottomNav />
      </div>
    );
  }

  const inputClass = "w-full px-4 py-2.5 text-sm bg-[#0A0D14] border border-gray-700 focus:border-[#7C3AED] rounded-xl outline-none text-white placeholder-gray-600";
  const remaining = progress.required - progress.current;

  return (
    <div className="min-h-screen bg-[#0A0D14] text-white px-4 sm:px-6 py-8 pb-24">
      <div className="max-w-2xl mx-auto space-y-6">
        <button
          onClick={() => navigate("/TeacherPYQPapers")}
          className="text-sm text-gray-400 hover:text-white flex items-center gap-1"
        >
          &larr; All Papers
        </button>

        <div>
          <h1 className="text-xl font-bold mb-1">{paperInfo.testName}</h1>
          <p className="text-gray-400 text-sm">
            {subjectName} &middot; {progress.current}/{progress.required} bhara
          </p>
          <div className="h-2 bg-[#1F2937] rounded-full overflow-hidden mt-2">
            <div
              className={`h-full ${progress.filled ? "bg-green-500" : "bg-[#7C3AED]"}`}
              style={{ width: `${Math.min(100, Math.round((progress.current / progress.required) * 100))}%` }}
            />
          </div>
        </div>

        {progress.filled ? (
          <div className="bg-green-500/10 border border-green-500/25 rounded-2xl p-6 text-center">
            <p className="text-green-400 font-semibold mb-1">✓ Quota Complete!</p>
            <p className="text-sm text-gray-400">
              All {progress.required} questions for '{subjectName}' have been added.
            </p>
          </div>
        ) : (
          <div className="bg-[#111827] border border-gray-800 rounded-2xl p-5">
            <p className="text-xs text-gray-500 mb-4">{remaining} more questions needed</p>

            {formError && (
              <div className="mb-4 p-3 bg-red-500/10 text-red-400 border border-red-500/25 rounded-xl text-sm text-center">
                {formError}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold mb-1.5 uppercase tracking-wide text-gray-400">
                  Topic
                </label>
                <input type="text" name="topicName" value={form.topicName} onChange={handleChange} placeholder="e.g. Sandhi" className={inputClass} />
              </div>

              <div>
                <label className="block text-xs font-semibold mb-1.5 uppercase tracking-wide text-gray-400">
                  Question
                </label>
                <textarea name="question" value={form.question} onChange={handleChange} rows={3} placeholder="Write the question here..." className={inputClass} />
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
                  Click a number to set the correct answer (current: {form.correctOption || "none"})
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold mb-1.5 uppercase tracking-wide text-gray-400">
                  Explanation (optional)
                </label>
                <textarea name="answerExplain" value={form.answerExplain} onChange={handleChange} rows={2} placeholder="Why the correct answer is correct..." className={inputClass} />
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full py-3 rounded-xl bg-[#7C3AED] hover:bg-[#6D28D9] font-semibold disabled:opacity-50"
              >
                {submitting ? "Saving..." : "Save Question"}
              </button>
            </form>
          </div>
        )}

        {sessionAdded.length > 0 && (
          <div>
            <h3 className="text-sm font-semibold text-gray-300 mb-3">
              Added this session ({sessionAdded.length})
            </h3>
            <div className="space-y-2">
              {sessionAdded.map((q, i) => (
                <div key={i} className="bg-[#111827] border border-gray-800 rounded-xl p-3">
                  <p className="text-xs text-gray-500 mb-1">{q.topicName}</p>
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

export default TeacherPYQPaperFill;