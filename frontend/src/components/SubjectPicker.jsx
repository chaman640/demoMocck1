import React, { useEffect, useState } from "react";
import api from "../api/api";

// ─────────────────────────────────────────────
// NAYA COMPONENT — subject ka naam type karne ki jagah CHUNNE ke liye.
//
// KYUN: pehle teacher ko har jagah subject ka naam haath se type karna padta tha.
// "Maths" / "maths" / "Math" / "Maths " — ek chhoti spelling galti se:
//   • sub-teacher us subject me kaam hi nahi kar pata tha (403 "authorized nahi hain")
//   • PYQ paper hamesha draft me atka rehta, student ko dikhta hi nahi tha
//   • teacher ke sawaal Mock Test me kabhi aate hi nahi the (bina kisi error ke)
//   • analysis me ek hi subject do baar dikhta tha
//
// Backend ab capital/small aur extra space khud sudhaar deta hai. Ye component
// us se aage ki galti rokta hai — bilkul ALAG naam (jaise "Ganit" vs "Maths"),
// jise backend nahi pakad sakta.
//
// ★ wale subjects Mock Test blueprint ke hain — inhi me daale gaye sawaal
//   students ke auto-generate hone wale Mock Test me aate hain.
// ─────────────────────────────────────────────

let cache = { data: null, at: 0 };
const CACHE_MS = 60 * 1000;

export const clearSubjectCache = () => {
  cache = { data: null, at: 0 };
};

export const useTeacherSubjects = () => {
  const [subjects, setSubjects] = useState(cache.data?.subjects || []);
  const [exam, setExam] = useState(cache.data?.exam || null);
  const [loading, setLoading] = useState(!cache.data);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      if (cache.data && Date.now() - cache.at < CACHE_MS) {
        setSubjects(cache.data.subjects || []);
        setExam(cache.data.exam || null);
        setLoading(false);
        return;
      }
      try {
        const res = await api.get("/teacher/subjects");
        if (cancelled) return;
        cache = { data: res.data.data, at: Date.now() };
        setSubjects(res.data.data.subjects || []);
        setExam(res.data.data.exam || null);
      } catch {
        // chup-chaap — suggestion na mile to bhi typing chalti rahegi
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  return { subjects, exam, loading };
};

const norm = (s) => String(s ?? "").replace(/\s+/g, " ").trim();
const key = (s) => norm(s).toLowerCase();

// ─────────────────────────────────────────────
// SubjectHints — sirf list dikhata hai (layout todta nahi).
// Chip par click karne se naam clipboard me copy ho jata hai,
// ya onPick diya ho to wo call hota hai.
// ─────────────────────────────────────────────
export const SubjectHints = ({ onPick, label = "Is batch ke subjects" }) => {
  const { subjects, exam } = useTeacherSubjects();
  const [copied, setCopied] = useState(null);

  if (!subjects || subjects.length === 0) return null;

  const handle = (name) => {
    if (onPick) return onPick(name);
    try {
      navigator.clipboard.writeText(name);
      setCopied(name);
      setTimeout(() => setCopied(null), 1200);
    } catch {
      /* ignore */
    }
  };

  return (
    <div className="mb-2">
      <p className="text-[10px] text-gray-500 mb-1.5">
        {label} {exam ? `(${exam})` : ""} — ★ wale Mock Test blueprint ke hain.
        Click karke naam copy karein, spelling bilkul yahi rakhein:
      </p>
      <div className="flex flex-wrap gap-1.5">
        {subjects.map((s) => (
          <button
            key={s.name}
            type="button"
            onClick={() => handle(s.name)}
            title={
              s.inBlueprint
                ? "Mock Test blueprint ka subject — iske sawaal Mock Test mein aayenge"
                : "Sirf is batch mein use ho raha hai — Mock Test mein nahi aayega"
            }
            className={`text-[11px] px-2 py-1 rounded-full border transition-colors ${
              s.inBlueprint
                ? "bg-[#1F2937] border-gray-700 text-gray-300 hover:border-[#7C3AED]"
                : "bg-transparent border-gray-800 text-gray-500 hover:border-gray-600"
            }`}
          >
            {s.inBlueprint ? "★ " : ""}
            {copied === s.name ? "Copied ✓" : s.name}
          </button>
        ))}
      </div>
    </div>
  );
};

/**
 * SubjectPicker
 *  value, onChange(nextValue)
 *  compact = false   → true ho to chips nahi dikhte (inline flex rows ke liye)
 *  wrapperClassName  → root div ki extra class (jaise "flex-1 min-w-0")
 */
const SubjectPicker = ({
  value = "",
  onChange,
  placeholder = "Subject naam",
  className = "",
  compact = false,
  wrapperClassName = "",
  listId,
}) => {
  const { subjects, exam } = useTeacherSubjects();
  const reactId = typeof React.useId === "function" ? React.useId() : "sp";
  const datalistId = listId || `subject-list-${reactId}`;

  const current = norm(value);
  const match = subjects.find((s) => key(s.name) === key(current));
  const isBrandNew = current !== "" && !match;
  const notInBlueprint = current !== "" && match && !match.inBlueprint;
  const hasBlueprintSubjects = subjects.some((s) => s.inBlueprint);

  return (
    <div className={`w-full ${wrapperClassName}`}>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        list={datalistId}
        className={className}
        autoComplete="off"
      />
      <datalist id={datalistId}>
        {subjects.map((s) => (
          <option key={s.name} value={s.name} />
        ))}
      </datalist>

      {!compact && subjects.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mt-2">
          {subjects.map((s) => (
            <button
              key={s.name}
              type="button"
              onClick={() => onChange(s.name)}
              title={
                s.inBlueprint
                  ? "Mock Test blueprint ka subject — iske sawaal Mock Test mein aayenge"
                  : "Sirf is batch mein use ho raha hai — Mock Test mein nahi aayega"
              }
              className={`text-[11px] px-2 py-1 rounded-full border transition-colors ${
                key(s.name) === key(current)
                  ? "bg-[#7C3AED] border-[#7C3AED] text-white"
                  : s.inBlueprint
                  ? "bg-[#1F2937] border-gray-700 text-gray-300 hover:border-[#7C3AED]"
                  : "bg-transparent border-gray-800 text-gray-500 hover:border-gray-600"
              }`}
            >
              {s.inBlueprint ? "★ " : ""}
              {s.name}
            </button>
          ))}
        </div>
      )}

      {isBrandNew && (
        <p className="text-[11px] text-yellow-500 mt-1.5 leading-relaxed">
          🆕 <b>{current}</b> — ye naya subject ban jayega. Spelling check kar lein
          (upar diye gaye naamon me se chunna zyada safe hai).
        </p>
      )}

      {notInBlueprint && hasBlueprintSubjects && (
        <p className="text-[11px] text-orange-400 mt-1 leading-relaxed">
          ⚠️ <b>{current}</b> {exam ? `'${exam}' ke ` : ""}Mock Test blueprint me nahi hai —
          iske sawaal Custom Test / PYQ me chalenge, lekin auto-generate hone wale
          Mock Test me nahi aayenge.
        </p>
      )}
    </div>
  );
};

export default SubjectPicker;
