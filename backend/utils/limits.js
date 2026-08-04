// utils/limits.js
// ─────────────────────────────────────────────
// Bulk upload ki hadd.
//
// KYUN: pehle `POST /add-question` ya `/teacher/add-question` mein aap
// jitna bada array chaho bhej sakte the. 5000 questions ka ek request
// aane par server har question ke liye countDocuments() chalata, phir
// ek hi saath 5000 documents insert karta — Render free plan (512MB RAM)
// pe process memory khatam karke mar jata, aur us waqt jitne students
// test de rahe hote sabka test toot jata.
//
// Ab साफ़ 400 error milta hai jisme likha hai ki file ko kaise todna hai.
// ─────────────────────────────────────────────

export const MAX_BULK_QUESTIONS = Number(process.env.MAX_BULK_QUESTIONS || 300);

/**
 * Array bada hone par res pe 400 bhej deta hai aur `true` return karta hai
 * (matlab "controller ko yahin ruk jana chahiye").
 */
export const tooManyItems = (res, arr, label = "questions") => {
  if (Array.isArray(arr) && arr.length > MAX_BULK_QUESTIONS) {
    res.status(400).json({
      success: false,
      message:
        `Ek baar mein zyada se zyada ${MAX_BULK_QUESTIONS} ${label} bhej sakte hain ` +
        `(aapne ${arr.length} bheje). Apni file ko ${MAX_BULK_QUESTIONS}-${label} ` +
        `ke chhote hisso mein todkar ek-ek karke upload karein.`,
    });
    return true;
  }
  return false;
};

export default { MAX_BULK_QUESTIONS, tooManyItems };
