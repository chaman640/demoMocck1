// utils/subjectName.js
// ─────────────────────────────────────────────
// SUBJECT NAAM KI SPELLING KA POORA SOLUTION
//
// PROBLEM: puraane code me subject ka naam 11 alag jagah "bilkul akshar-dar-akshar"
// match hona zaroori tha. Ek chhoti si galti — "Maths" vs "maths" vs "Math" vs
// "Hindi " (aakhir me space) — aur ye sab silently toot jata tha:
//   • sub-teacher us subject me question add hi nahi kar pata (403)
//   • PYQ paper hamesha "draft" me atka reh jata, student ko dikhta hi nahi
//   • teacher ke daale hue sawaal mock test me KABHI nahi aate
//   • analysis me ek hi subject do-do baar dikhta ("Maths" aur "maths")
//
// SOLUTION 3 layer ka hai:
//   1) normalize  — aage-peeche ke space hatao, beech ke double space ek karo
//   2) case-insensitive match — "maths" likho ya "MATHS", access mil jayega
//   3) canonicalize — save karte waqt agar wahi subject pehle se maujood hai
//      to USI ki spelling use karo. Yaani teacher "hindi" type kare to DB me
//      "Hindi" hi jayega. Isse data kabhi bhi tukdon me nahi batega.
// ─────────────────────────────────────────────
import Blueprint from "../models/bluePrint.js";
import CouponAccess from "../models/CouponAccess.js";
import { Question } from "../models/rowQuestionSchema.js";
import PreviousYearTest from "../models/PreviousYearTest.js";
import CustomTest from "../models/CustomTest.js";

/** "  hindi   vyakaran " → "hindi vyakaran" */
export const normalizeSubject = (s) => String(s ?? "").replace(/\s+/g, " ").trim();

/** Comparison ke liye key — "Hindi" aur " hindi " dono ka key "hindi" */
export const subjectKey = (s) => normalizeSubject(s).toLowerCase();

export const escapeRegex = (s) => String(s).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/** MongoDB query ke liye: case-insensitive EXACT match ka regex */
export const ciExact = (s) => new RegExp(`^${escapeRegex(normalizeSubject(s))}$`, "i");

/** Do subject naam ek hi hain? (case + space ignore karke) */
export const sameSubject = (a, b) => {
  const ka = subjectKey(a);
  return ka !== "" && ka === subjectKey(b);
};

/**
 * Is batch (coupon) ke liye ab tak jitne subject kahin bhi use hue hain, sab laao.
 *
 * blueprintSubjects → admin ke Mock Test blueprint ke subjects.
 *   YE SABSE ZAROORI HAIN: mock test inhi naamon se sawaal dhundhta hai.
 *   Agar teacher inse alag naam use karega to uske sawaal mock test me
 *   kabhi nahi aayenge (aur koi error bhi nahi aayega — bilkul chup-chaap).
 *
 * usedSubjects → is coupon me pehle se maujood subjects (questions, PYQ papers,
 *   custom tests, aur sub-teachers ko diye gaye access se).
 */
export const getKnownSubjects = async (couponId, examName) => {
  const [blueprints, qSubjects, pyqPapers, customTests, accessRecords] = await Promise.all([
    examName ? Blueprint.find({ examName }).select("subjects.subjectName") : [],
    couponId ? Question.distinct("subjectName", { coupon: couponId }) : [],
    couponId ? PreviousYearTest.find({ couponId }).select("blueprint.subjectName") : [],
    couponId ? CustomTest.find({ couponId }).select("subjects.subjectName") : [],
    couponId ? CouponAccess.find({ coupon: couponId }).select("subject") : [],
  ]);

  const blueprintSubjects = [];
  const pushUnique = (arr, val) => {
    const n = normalizeSubject(val);
    if (n && !arr.some((x) => subjectKey(x) === subjectKey(n))) arr.push(n);
  };

  for (const bp of blueprints) {
    for (const s of bp.subjects || []) pushUnique(blueprintSubjects, s.subjectName);
  }

  const usedSubjects = [];
  for (const s of qSubjects || []) pushUnique(usedSubjects, s);
  for (const p of pyqPapers) for (const b of p.blueprint || []) pushUnique(usedSubjects, b.subjectName);
  for (const t of customTests) for (const s of t.subjects || []) pushUnique(usedSubjects, s.subjectName);
  for (const a of accessRecords) pushUnique(usedSubjects, a.subject);

  return { blueprintSubjects, usedSubjects };
};

/**
 * Teacher ne jo type kiya usko "sahi" spelling me badal do.
 *
 * Priority:
 *   1. Mock-test blueprint ka naam (kyunki mock test isi se chalta hai)
 *   2. Is batch me pehle se use ho raha naam
 *   3. Bilkul naya subject → sirf normalize karke waise hi rakh do
 */
export const canonicalizeSubject = (input, known) => {
  const norm = normalizeSubject(input);
  if (!norm) return { canonical: "", isNew: false, inBlueprint: false };

  const key = norm.toLowerCase();

  const fromBlueprint = (known?.blueprintSubjects || []).find((s) => s.toLowerCase() === key);
  if (fromBlueprint) return { canonical: fromBlueprint, isNew: false, inBlueprint: true };

  const fromUsed = (known?.usedSubjects || []).find((s) => s.toLowerCase() === key);
  if (fromUsed) return { canonical: fromUsed, isNew: false, inBlueprint: false };

  return { canonical: norm, isNew: true, inBlueprint: false };
};

/** Ek saath kai subjects canonicalize karne ke liye shortcut */
export const canonicalizeMany = (inputs, known) =>
  (inputs || []).map((s) => canonicalizeSubject(s, known));
