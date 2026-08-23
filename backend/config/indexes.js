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
    label: "Performance (sabse bada — har test ka record)",
    indexes: [
      {
        name: "perf_user_exam_date",
        keys: { userId: 1, examName: 1, createdAt: -1 },
        why:
          "SABSE ZAROORI INDEX. Student ki analysis, teacher ka student-view, class " +
          "analysis, aur naya mock banate waqt 'ye sawaal pehle aa chuka hai' — " +
          "ye sab isi query par tike hain. Iske bina 1 lakh students par har " +
          "analysis page 10+ second lega.",
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
          "Teacher jab apne batch mein phone se student dhoondhta hai. Abhi ye " +
          "poore 1 lakh users ko scan karta hai. Iske baad sirf usi batch ke " +
          "students dekhe jaate hain.",
      },
      {
        name: "user_batch_name",
        keys: { activeCoupon: 1, name: 1 },
        why:
          "Batch ke students ki list (class analysis + dashboard ki ginti). Isme " +
          "naam bhi index ke andar hai, isliye MongoDB ko asli record kholne ki " +
          "zaroorat hi nahi padti — sirf index se kaam ho jata hai (sabse tez tarika).",
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
          "Mock test banate waqt sawaal chunna, admin ka question count, aur " +
          "challenge banana. Question bank sabse tezi se badhta hai, isliye ye " +
          "index jaldi hi zaroori ho jayega.",
      },
      {
        name: "q_coupon_sub_topic",
        keys: { coupon: 1, subjectName: 1, topicName: 1 },
        why:
          "Teacher ke apne batch ke sawaal — question add karte waqt numbering, " +
          "batch ka mock test, aur subject ki suchi.",
      },
      {
        name: "q_addedby",
        keys: { addedByTeacher: 1 },
        why: "Teacher dashboard: 'aapne kitne sawaal add kiye'.",
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
        why: "Teacher ke apne batches ki list (nayi pehle). Har teacher login par chalti hai.",
      },
    ],
  },

  {
    model: CouponAccess,
    label: "CouponAccess (sub-teacher ka access)",
    indexes: [
      {
        name: "ca_subteacher_date",
        keys: { subTeacher: 1, createdAt: -1 },
        why:
          "Sub-teacher ko kaunse batch/subject mila hai. Purana index sirf " +
          "coupon se shuru hota hai, isliye sirf subTeacher se dhoondhne par " +
          "wo kaam nahi aata.",
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
          "'Mere sub-teachers' ki list (nayi pehle). Dashboard ki active/pending " +
          "ginti bhi isi se chal jaati hai — parentTeacher se list nikaal kar " +
          "status chhaan liya jaata hai. " +
          "NOTE: pehle isme beech mein 'status' bhi daala tha, lekin tab MongoDB " +
          "ko sorting RAM mein karni padti (equality → sort ka kram tootne se). " +
          "Sub-teacher waise bhi 50 se kam hote hain, isliye status ka alag index " +
          "faltu hai.",
      },
      {
        name: "teacher_invite",
        keys: { inviteToken: 1 },
        options: { sparse: true },
        why:
          "Invite link kholte hi token se teacher dhoondhna. sparse = jinke paas " +
          "token nahi hai wo index mein aate hi nahi, isliye index chhota rehta hai.",
      },
    ],
  },

  {
    model: Blueprint,
    label: "Blueprint (test ka dhaancha)",
    indexes: [
      {
        name: "bp_exam_name",
        keys: { examName: 1, blueprintName: 1 },
        why:
          "Har mock test banane, submit karne aur analysis mein blueprint " +
          "dhoondha jata hai. Chhoti collection hai, lekin query bahut baar chalti hai.",
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
        why: "Student ko apne batch ke test dikhana, aur teacher ko apne banaye test.",
      },
      {
        name: "ct_createdby",
        keys: { createdBy: 1 },
        why: "Teacher dashboard: 'aapne kitne test banaye'.",
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
          "'Ye test aapne pehle diya hai ya nahi' — test list ke har item par " +
          "check hota hai. Purana index testId se shuru hota hai, isliye sirf " +
          "userId se dhoondhne par kaam nahi aata.",
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
        why: "Student ko purane saal ke paper dikhana (naye saal pehle).",
      },
      {
        name: "pyq_coupon_date",
        keys: { couponId: 1, createdAt: -1 },
        why: "Teacher ke apne banaye paper ki list.",
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
        why: "'Ye paper aapne pehle diya hai ya nahi' — CustomTestAttempt wali hi baat.",
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
          "Leaderboard. Iske bina MongoDB saare attempts uthakar RAM mein sort " +
          "karta hai — aur 32MB se upar jaate hi query FAIL ho jati hai. Is " +
          "index ke saath list pehle se sorted milti hai. Rank nikalna bhi isi se tez hota hai.",
      },
      {
        name: "chatt_user_date",
        keys: { userId: 1, createdAt: -1 },
        why: "'Mere challenges' ki list.",
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
          "Har OTP bhejne aur check karne par sabse naya OTP dhoondha jata hai. " +
          "Purana index sirf phone par tha, purpose (signup/reset) par nahi.",
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
