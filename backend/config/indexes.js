// config/indexes.js
// ─────────────────────────────────────────────
// DATABASE INDEX — ye kya hai, aasaan bhasha mein
//
// Ek kitaab sochiye jisme 1 lakh naam hain, bina kisi kram ke.
// Kisi ek naam ko dhoondhna ho to poori kitaab padhni padegi.
//
// Index = us kitaab ke peeche wali suchi (A-Z), jisme likha hai
// kaunsa naam kis page par hai. Ab wahi naam 1 second mein mil jata hai.
//
// ABHI KYA HO RAHA HAI: aapke database mein kuch hi index hain. Jab teacher
// "class analysis" kholta hai, to MongoDB SAARE performance records ek-ek
// karke padhta hai. 30 students par ye 100ms lagta hai — pata bhi nahi
// chalta. 1 LAKH students par yahi kaam 10-20 SECOND lega, aur teacher
// samjhega ki website hang ho gayi.
//
// Neeche har index ke saath likha hai ki wo kis screen ko tez karta hai.
//
// ⚠️ INDEX MUFT NAHI HOTE: har naya index thodi jagah leta hai aur naya data
// save karna zara sa dheema karta hai. Isliye yahan sirf wahi index hain jo
// sach mein kisi asli query ke kaam aate hain — ek bhi "shayad kaam aayega"
// wala nahi hai.
// ─────────────────────────────────────────────

import Performance from "../models/Performance.js";
import User from "../models/User.js";
import { Question } from "../models/rowQuestionSchema.js";
import Coupon from "../models/Coupon.js";
import CouponAccess from "../models/CouponAccess.js";
import Teacher from "../models/Teacher.js";
import Blueprint from "../models/bluePrint.js";
import CustomTest from "../models/CustomTest.js";
import CustomTestAttempt from "../models/CustomTestAttempt.js";
import PreviousYearTest from "../models/PreviousYearTest.js";
import PreviousYearAttempt from "../models/PreviousYearAttempt.js";
import ChallengeAttempt from "../models/ChallengeAttempt.js";
import Otp from "../models/Otp.js";

// ─────────────────────────────────────────────
// Poori suchi
//
// keys mein 1 = badhte kram mein, -1 = ghatte kram mein.
// Jahan sort "sabse naya pehle" hota hai wahan -1 lagaya hai, taaki
// MongoDB ko data alag se sort na karna pade (sorting sabse mehnga kaam hai).
//
// Field ka ORDER bahut zaroori hai. Niyam: pehle wo field jispar "barabar
// hai" wali shart lagti hai (userId = X), phir sort wali field.
// ─────────────────────────────────────────────
export const INDEX_PLAN = [
  {
    model: Performance,
    label: "Performance (the largest — one record per test)",
    indexes: [
      {
        name: "perf_user_exam_date",
        keys: { userId: 1, examName: 1, createdAt: -1 },
        why:
          "THE MOST IMPORTANT INDEX. Student analysis, the teacher's student view, class " +
          "analysis, and 'this question has already appeared' when building a new mock — " +
          "all of these depend on this query. Without it, with 1 lakh students every " +
          "analysis page will take 10+ seconds.",
      },
    ],
  },

  {
    model: User,
    label: "User (1 lakh students)",
    indexes: [
      {
        name: "user_batch_phone",
        keys: { activeCoupon: 1, phone: 1 },
        why:
          "When a teacher searches for a student by phone in their batch. Right now this " +
          "scans all 1 lakh users. After this, only the students of that batch " +
          "are checked.",
      },
      {
        name: "user_batch_name",
        keys: { activeCoupon: 1, name: 1 },
        why:
          "List of a batch's students (class analysis + dashboard counts). The " +
          "name is also inside the index, so MongoDB never needs to open the " +
          "actual record — the index alone is enough (the fastest way).",
      },
    ],
  },

  {
    model: Question,
    label: "Question (question bank)",
    indexes: [
      {
        name: "q_exam_sub_topic",
        keys: { examName: 1, subjectName: 1, topicName: 1 },
        why:
          "Picking questions when building a mock test, the admin's question count, and " +
          "creating challenges. The question bank grows the fastest, so this " +
          "index will soon become essential.",
      },
      {
        name: "q_coupon_sub_topic",
        keys: { coupon: 1, subjectName: 1, topicName: 1 },
        why:
          "Questions of the teacher's own batch — numbering when adding questions, " +
          "the batch mock test, and the subject list.",
      },
      {
        name: "q_addedby",
        keys: { addedByTeacher: 1 },
        why: "Teacher dashboard: 'how many questions you have added'.",
      },
    ],
  },

  {
    model: Coupon,
    label: "Coupon (batch)",
    indexes: [
      {
        name: "coupon_teacher_date",
        keys: { mainTeacher: 1, createdAt: -1 },
        why: "List of the teacher's own batches (newest first). Runs on every teacher login.",
      },
    ],
  },

  {
    model: CouponAccess,
    label: "CouponAccess (sub-teacher access)",
    indexes: [
      {
        name: "ca_subteacher_date",
        keys: { subTeacher: 1, createdAt: -1 },
        why:
          "Which batch/subject a sub-teacher has been given. The old index only " +
          "starts with coupon, so it does not help when searching " +
          "by subTeacher alone.",
      },
    ],
  },

  {
    model: Teacher,
    label: "Teacher",
    indexes: [
      {
        name: "teacher_parent_date",
        keys: { parentTeacher: 1, createdAt: -1 },
        why:
          "'My sub-teachers' list (newest first). The dashboard's active/pending " +
          "counts also use this — the list is fetched by parentTeacher and " +
          "filtered by status. " +
          "NOTE: 'status' was earlier placed in the middle of this index, but then MongoDB " +
          "had to sort in RAM (the equality → sort order breaks). " +
          "There are fewer than 50 sub-teachers anyway, so a separate status index " +
          "is unnecessary.",
      },
      {
        name: "teacher_invite",
        keys: { inviteToken: 1 },
        options: { sparse: true },
        why:
          "Finding the teacher by token when an invite link is opened. sparse = documents without " +
          "a token are not in the index at all, so the index stays small.",
      },
    ],
  },

  {
    model: Blueprint,
    label: "Blueprint (test structure)",
    indexes: [
      {
        name: "bp_exam_name",
        keys: { examName: 1, blueprintName: 1 },
        why:
          "The blueprint is looked up when every mock test is built, submitted and " +
          "analysed. A small collection, but the query runs very often.",
      },
    ],
  },

  {
    model: CustomTest,
    label: "CustomTest (Batch Test)",
    indexes: [
      {
        name: "ct_coupon_exam_active_date",
        keys: { couponId: 1, examName: 1, isActive: 1, createdAt: -1 },
        why: "Showing students their batch's tests, and teachers the tests they created.",
      },
      {
        name: "ct_createdby",
        keys: { createdBy: 1 },
        why: "Teacher dashboard: 'how many tests you have created'.",
      },
    ],
  },

  {
    model: CustomTestAttempt,
    label: "CustomTestAttempt",
    indexes: [
      {
        name: "cta_user_test",
        keys: { userId: 1, testId: 1 },
        why:
          "'Have you taken this test before or not' — checked for every item " +
          "in the test list. The old index starts with testId, so it does not help " +
          "when searching by userId alone.",
      },
    ],
  },

  {
    model: PreviousYearTest,
    label: "PreviousYearTest",
    indexes: [
      {
        name: "pyq_coupon_exam_status_year",
        keys: { couponId: 1, examName: 1, status: 1, year: -1 },
        why: "Showing students previous year papers (newest year first).",
      },
      {
        name: "pyq_coupon_date",
        keys: { couponId: 1, createdAt: -1 },
        why: "List of papers the teacher created.",
      },
    ],
  },

  {
    model: PreviousYearAttempt,
    label: "PreviousYearAttempt",
    indexes: [
      {
        name: "pya_user_test",
        keys: { userId: 1, testId: 1 },
        why: "'Have you taken this paper before or not' — same as CustomTestAttempt.",
      },
    ],
  },

  {
    model: ChallengeAttempt,
    label: "ChallengeAttempt",
    indexes: [
      {
        name: "chatt_leaderboard",
        keys: { challengeId: 1, totalScore: -1, totalTimeTakenInSeconds: 1 },
        why:
          "Leaderboard. Without this, MongoDB loads all attempts and sorts them " +
          "in RAM — and the query FAILS once it goes above 32MB. With this " +
          "index the list comes back already sorted. Calculating rank is faster too.",
      },
      {
        name: "chatt_user_date",
        keys: { userId: 1, createdAt: -1 },
        why: "'My challenges' list.",
      },
    ],
  },

  {
    model: Otp,
    label: "Otp",
    indexes: [
      {
        name: "otp_phone_purpose_date",
        keys: { phone: 1, purpose: 1, createdAt: -1 },
        why:
          "The newest OTP is looked up every time an OTP is sent and checked. " +
          "The old index was only on phone, not on purpose (signup/reset).",
      },
    ],
  },
];

// ─────────────────────────────────────────────
// Index banane wala function
//
// Ye dobara chalane par kuch nahi bigadta — jo index pehle se hai use
// MongoDB chhod deta hai (koi error nahi, koi dobara kaam nahi).
// ─────────────────────────────────────────────
export const ensureIndexes = async ({ silent = false } = {}) => {
  const log = (...a) => !silent && console.log(...a);
  const results = { created: [], existing: [], failed: [] };

  for (const group of INDEX_PLAN) {
    for (const idx of group.indexes) {
      const startedAt = Date.now();
      try {
        // createIndex khud dekh leta hai ki index pehle se hai ya nahi
        await group.model.collection.createIndex(idx.keys, {
          name: idx.name,
          ...(idx.options || {}),
        });
        const ms = Date.now() - startedAt;

        // 50ms se kam = pehle se tha (bas confirm hua). Zyada = abhi bana.
        if (ms < 50) {
          results.existing.push(idx.name);
        } else {
          results.created.push({ name: idx.name, ms });
          log(`   ✔ ${idx.name.padEnd(30)} ${ms}ms  (${group.label})`);
        }
      } catch (err) {
        results.failed.push({ name: idx.name, error: err.message });
        console.error(`   ✘ ${idx.name}: ${err.message}`);
      }
    }
  }

  return results;
};

export default ensureIndexes;
