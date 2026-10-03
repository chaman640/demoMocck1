// utils/attemptHelpers.js
//
// Test submit karte waqt client se aaye attemptedQuestions ko saaf karta hai.
// Pehle ek hi sahi question ko 100 baar bhej kar score (aur leaderboard,
// coins, teacher commission) badhaya ja sakta tha — har submit handler ab
// isse guzarta hai.
import crypto from "crypto";

/** Har questionId sirf ek baar (pehli entry rakhi jaati hai). */
export const dedupeAttemptedQuestions = (attemptedQuestions) => {
  const seen = new Set();
  const unique = [];
  for (const aq of attemptedQuestions || []) {
    const id = aq?.questionId ? String(aq.questionId) : "";
    if (!id || seen.has(id)) continue;
    seen.add(id);
    unique.push(aq);
  }
  return unique;
};

/** Ek mock ke questions ka fingerprint — wahi mock dobara submit hua ya nahi. */
export const questionSetHash = (questionIds) =>
  crypto
    .createHash("sha256")
    .update(questionIds.map(String).sort().join(","))
    .digest("hex");
