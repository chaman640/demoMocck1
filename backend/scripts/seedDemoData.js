// backend/scripts/seedDemoData.js
//
// Demo data seeder — student side + teacher side ke SAARE pages dekhne ke liye.
// Isse backend/scripts/ mein rakho aur backend/.env mein ROWQUESTION_URI set
// hone ke baad chalao:
//
//     cd backend
//     node scripts/seedDemoData.js
//
// Requirements: Node 18+, .env mein ROWQUESTION_URI (Atlas connection string,
// <username> jaisa koi bracket placeholder nahi hona chahiye), aur Atlas ke
// Network Access mein tumhara IP (ya 0.0.0.0/0 testing ke liye) allow hona chahiye.
//
// Safe-to-rerun: script pehle apne khud ke bane demo accounts/records dhoondh
// kar delete karta hai (email domain "@demo.mocktest.local", coupon codes
// "UPSC27A"/"SSCEV", aur "[Demo]" prefix waale titles), phir fresh data banata hai.

import "dotenv/config";
import bcrypt from "bcrypt";
import { rowQuestionConnection } from "../config/rowQuestion.js";

import Teacher from "../models/Teacher.js";
import User from "../models/User.js";
import Coupon from "../models/Coupon.js";
import CouponAccess from "../models/CouponAccess.js";
import { Question } from "../models/rowQuestionSchema.js";
import Blueprint from "../models/bluePrint.js";
import CustomTest from "../models/CustomTest.js";
import CustomTestAttempt from "../models/CustomTestAttempt.js";
import PreviousYearTest from "../models/PreviousYearTest.js";
import PreviousYearAttempt from "../models/PreviousYearAttempt.js";
import CurrentAffair from "../models/CurrentAffair.js";
import CurrentAffairQuiz from "../models/CurrentAffairQuiz.js";
import CurrentAffairAttempt from "../models/CurrentAffairAttempt.js";
import Challenge from "../models/Challenge.js";
import ChallengeAttempt from "../models/ChallengeAttempt.js";
import RankPredictorData from "../models/RankPredictorData.js";
import Performance from "../models/Performance.js";
import HiddenQuestion from "../models/HiddenQuestion.js";

const hash = (plain) => bcrypt.hash(plain, 10);
const todayIST = () => new Date().toISOString().slice(0, 10);

const mcq = (question, options, correctOption, subjectName, topicName, answerExplain) => ({
  question,
  option1: options[0],
  option2: options[1],
  option3: options[2],
  option4: options[3],
  correctOption,
  subjectName,
  topicName,
  answerExplain,
});

async function cleanup() {
  const demoEmailRe = /@demo\.mocktest\.local$/i;
  const oldTeachers = await Teacher.find({ email: demoEmailRe }, "_id");
  const oldUsers = await User.find({ email: demoEmailRe }, "_id");
  const oldCoupons = await Coupon.find({ code: { $in: ["UPSC27A", "SSCEV"] } }, "_id");
  const teacherIds = oldTeachers.map((t) => t._id);
  const userIds = oldUsers.map((u) => u._id);
  const couponIds = oldCoupons.map((c) => c._id);

  await Promise.all([
    CouponAccess.deleteMany({ coupon: { $in: couponIds } }),
    Question.deleteMany({ coupon: { $in: couponIds } }),
    CustomTest.deleteMany({ couponId: { $in: couponIds } }),
    CustomTestAttempt.deleteMany({ userId: { $in: userIds } }),
    PreviousYearTest.deleteMany({ $or: [{ couponId: { $in: couponIds } }, { testName: /^\[Demo\]/ }] }),
    PreviousYearAttempt.deleteMany({ userId: { $in: userIds } }),
    CurrentAffair.deleteMany({ title: /^\[Demo\]/ }),
    CurrentAffairQuiz.deleteMany({ examName: { $in: ["UPSC", "SSC CGL"] }, date: todayIST() }),
    CurrentAffairAttempt.deleteMany({ userId: { $in: userIds } }),
    Challenge.deleteMany({ createdByName: /Aditi Singh \[Demo\]/ }),
    ChallengeAttempt.deleteMany({ userId: { $in: userIds } }),
    RankPredictorData.deleteMany({ examName: { $in: ["UPSC", "SSC CGL"] }, year: 2026 }),
    Performance.deleteMany({ userId: { $in: userIds } }),
    HiddenQuestion.deleteMany({ userId: { $in: userIds } }),
    Blueprint.deleteMany({ blueprintName: /^\[Demo\]/ }),
  ]);
  await Coupon.deleteMany({ _id: { $in: couponIds } });
  await Teacher.deleteMany({ _id: { $in: teacherIds } });
  await User.deleteMany({ _id: { $in: userIds } });
  console.log("Purani demo data saaf kar di gayi (agar thi).");
}

async function run() {
  await rowQuestionConnection.asPromise();
  console.log("DB se connect ho gaya, seeding shuru...");
  await cleanup();

  // ── 1. Teachers ──────────────────────────────────────────
  const teacherPass = await hash("Teacher@123");
  const mainTeacher = await new Teacher({
    name: "Rahul Sharma",
    email: "rahul.teacher@demo.mocktest.local",
    phone: "9999900001",
    password: teacherPass,
    role: "main",
    examName: ["UPSC", "SSC CGL"],
    status: "active",
  }).save();

  const subTeacherActive1 = await new Teacher({
    name: "Priya Verma",
    email: "priya.subteacher@demo.mocktest.local",
    phone: "9999900002",
    password: teacherPass,
    role: "sub",
    parentTeacher: mainTeacher._id,
    assignedSubjects: ["Reasoning"],
    status: "active",
  }).save();

  const subTeacherActive2 = await new Teacher({
    name: "Aman Gupta",
    email: "aman.subteacher@demo.mocktest.local",
    phone: "9999900003",
    password: teacherPass,
    role: "sub",
    parentTeacher: mainTeacher._id,
    assignedSubjects: ["Maths"],
    status: "active",
  }).save();

  const subTeacherPending = await new Teacher({
    name: "Sanjay Yadav",
    email: "sanjay.subteacher@demo.mocktest.local",
    phone: "9999900004",
    role: "sub",
    parentTeacher: mainTeacher._id,
    assignedSubjects: ["GK"],
    status: "pending",
    inviteToken: "demo-invite-token",
    inviteTokenExpiry: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
  }).save();

  mainTeacher.subTeachers = [subTeacherActive1._id, subTeacherActive2._id, subTeacherPending._id];
  await mainTeacher.save();

  // ── 2. Coupons (batches) ─────────────────────────────────
  const couponA = await new Coupon({
    code: "UPSC27A",
    name: "UPSC Prelims 2027 — Batch A",
    exam: "UPSC",
    mainTeacher: mainTeacher._id,
    isDefault: true,
  }).save();

  const couponB = await new Coupon({
    code: "SSCEV",
    name: "SSC CGL Evening",
    exam: "SSC CGL",
    mainTeacher: mainTeacher._id,
    isDefault: false,
  }).save();

  mainTeacher.coupons = [couponA._id, couponB._id];
  mainTeacher.activeCoupon = couponA._id;
  await mainTeacher.save();

  subTeacherActive1.coupons = [couponA._id];
  subTeacherActive1.activeCoupon = couponA._id;
  await subTeacherActive1.save();

  subTeacherActive2.coupons = [couponB._id];
  subTeacherActive2.activeCoupon = couponB._id;
  await subTeacherActive2.save();

  await CouponAccess.insertMany([
    { coupon: couponA._id, subTeacher: subTeacherActive1._id, subject: "Reasoning" },
    { coupon: couponB._id, subTeacher: subTeacherActive2._id, subject: "Maths" },
  ]);

  // ── 3. Students ──────────────────────────────────────────
  const studentPass = await hash("Student@123");
  const makeStudent = (name, phoneSuffix, exam, activeCoupon) =>
    new User({
      name,
      email: `${name.toLowerCase().replace(/\s+/g, ".")}@demo.mocktest.local`,
      phone: `98888000${phoneSuffix}`,
      password: studentPass,
      address: "Lucknow, Uttar Pradesh",
      exam,
      activeCoupon,
      couponHistory: activeCoupon
        ? [{ coupon: activeCoupon, examNameAtJoin: exam, joinedAt: new Date() }]
        : [],
    }).save();

  const aditi = await makeStudent("Aditi Singh", "01", "UPSC", couponA._id);
  const karan = await makeStudent("Karan Mehta", "02", "UPSC", couponA._id);
  const neha = await makeStudent("Neha Joshi", "03", "SSC CGL", couponB._id);
  const vikas = await makeStudent("Vikas Kumar", "04", "SSC CGL", couponB._id);
  const simran = await makeStudent("Simran Kaur", "05", "UPSC", null); // bina batch ka student

  // ── 4. Question pool (global — dono exams ke liye) ──────
  const reasoningQs = [
    mcq("Series: 2, 4, 8, 16, ? — agla number kya hoga?", ["24", "32", "30", "20"], 2, "Reasoning", "Number Series", "Har term pichle se double hai, isliye 32."),
    mcq("Yadi 'PEN' ko 'NEP' likha jata hai, to 'BOOK' ko kaise likhenge?", ["KOOB", "BOOK", "OBOK", "KBOO"], 1, "Reasoning", "Coding-Decoding", "Letters ko reverse order mein likha jata hai."),
    mcq("Odd one out chunein:", ["Dog", "Cat", "Lion", "Table"], 4, "Reasoning", "Classification", "Table ek jaanwar nahi hai."),
    mcq("A ka bhai B hai. B ki behan C hai. C, A se kya rishta rakhti hai?", ["Behan", "Bhai", "Maa", "Beti"], 1, "Reasoning", "Blood Relations", "C, A ki behan hai."),
    mcq("Clock mein 3:15 baje ghanta aur minute ki suiyon ke beech approx kitna angle banega?", ["0°", "7.5°", "15°", "30°"], 2, "Reasoning", "Clock", "3:15 par angle approx 7.5 degree hota hai."),
  ];
  const mathsQs = [
    mcq("15 ka 20% kitna hota hai?", ["2", "3", "4", "5"], 2, "Maths", "Percentage", "15 x 20/100 = 3."),
    mcq("Ek train 60 km/h ki speed se 2 ghante chale to kitni doori tay karegi?", ["100 km", "110 km", "120 km", "130 km"], 3, "Maths", "Speed-Distance", "60 x 2 = 120 km."),
    mcq("(12 + 8) ÷ 4 = ?", ["4", "5", "6", "7"], 2, "Maths", "Simplification", "20 ÷ 4 = 5."),
    mcq("Agar ek number ka 25% 50 hai, to number kya hoga?", ["150", "175", "200", "225"], 3, "Maths", "Percentage", "50 x 4 = 200."),
    mcq("Principal 1000, Rate 10%, Time 2 years — Simple Interest kitna hoga?", ["100", "150", "200", "250"], 3, "Maths", "Simple Interest", "SI = (1000 x 10 x 2)/100 = 200."),
  ];
  const gkQs = [
    mcq("Bharat ka rashtriya pashu kaun sa hai?", ["Sher", "Bagh", "Hathi", "Mor"], 2, "GK", "Static GK", "Bagh (Tiger) Bharat ka rashtriya pashu hai."),
    mcq("Bharat ka sansad bhawan kis shehar mein hai?", ["Mumbai", "Kolkata", "Nai Dilli", "Chennai"], 3, "GK", "Static GK", "Sansad Bhawan Nai Dilli mein hai."),
    mcq("RBI ki sthapna kis varsh hui thi?", ["1935", "1947", "1950", "1969"], 1, "GK", "Economy", "RBI 1935 mein sthapit hui thi."),
    mcq("Bharat ki sabse lambi nadi kaun si hai?", ["Yamuna", "Ganga", "Godavari", "Brahmaputra"], 2, "GK", "Geography", "Ganga Bharat ki sabse lambi nadi hai."),
    mcq("Bharatiya samvidhan kab lagu hua tha?", ["15 Aug 1947", "26 Jan 1950", "26 Nov 1949", "2 Oct 1950"], 2, "GK", "Polity", "Samvidhan 26 January 1950 ko lagu hua tha."),
  ];
  const englishQs = [
    mcq("Choose the correct synonym of 'Happy':", ["Sad", "Joyful", "Angry", "Tired"], 2, "English", "Vocabulary", "'Joyful' means happy."),
    mcq("Choose the correct antonym of 'Ancient':", ["Old", "Modern", "Historic", "Aged"], 2, "English", "Vocabulary", "'Modern' is opposite of ancient."),
    mcq("Fill in the blank: She ___ to school every day.", ["go", "goes", "going", "gone"], 2, "English", "Grammar", "Third person singular subject takes 'goes'."),
    mcq("Identify the noun: 'The cat sat on the mat.'", ["Sat", "On", "Cat", "The"], 3, "English", "Grammar", "'Cat' is the noun."),
    mcq("Choose the correctly spelled word:", ["Neccessary", "Necesary", "Necessary", "Neccesary"], 3, "English", "Spelling", "'Necessary' is the correct spelling."),
  ];

  const poolDocs = [];
  for (const q of [...reasoningQs, ...mathsQs, ...gkQs, ...englishQs]) {
    poolDocs.push(await new Question({ ...q, examName: ["UPSC", "SSC CGL"], coupon: null, addedByTeacher: null }).save());
  }

  // Batch-exclusive (teacher-added) questions
  await new Question({ ...mcq("Batch-exclusive: '20' ka square root?", ["4", "4.47", "5", "20"], 1, "Reasoning", "Batch Special", "√20 ≈ 4.47, lekin option match sirf approx."), examName: ["UPSC"], coupon: couponA._id, addedByTeacher: mainTeacher._id }).save();
  await new Question({ ...mcq("Batch-exclusive: SSC CGL Tier-1 mein kitne sections hote hain?", ["2", "3", "4", "5"], 3, "GK", "Batch Special", "SSC CGL Tier-1 mein 4 sections hote hain."), examName: ["SSC CGL"], coupon: couponB._id, addedByTeacher: mainTeacher._id }).save();

  // ── 5. Blueprints ────────────────────────────────────────
  await new Blueprint({
    blueprintName: "[Demo] UPSC Prelims Full Mock 1",
    examName: "UPSC",
    totalQuestions: 20,
    marksPerQuestion: 2,
    negativeMarking: 0.5,
    durationMinutes: 60,
    subjects: [
      { subjectName: "Reasoning", questionCount: 5, importantTopics: ["Number Series", "Blood Relations"] },
      { subjectName: "Maths", questionCount: 5, importantTopics: ["Percentage", "Simple Interest"] },
      { subjectName: "GK", questionCount: 5, importantTopics: ["Polity", "Economy"] },
      { subjectName: "English", questionCount: 5, importantTopics: ["Grammar", "Vocabulary"] },
    ],
    mockType: "Full",
  }).save();

  await new Blueprint({
    blueprintName: "[Demo] SSC CGL Mini Mock 1",
    examName: "SSC CGL",
    totalQuestions: 10,
    marksPerQuestion: 1,
    negativeMarking: 0.25,
    durationMinutes: 20,
    subjects: [
      { subjectName: "Reasoning", questionCount: 3, importantTopics: [] },
      { subjectName: "Maths", questionCount: 3, importantTopics: [] },
      { subjectName: "GK", questionCount: 2, importantTopics: [] },
      { subjectName: "English", questionCount: 2, importantTopics: [] },
    ],
    mockType: "Mini",
  }).save();

  // ── 6. Custom Test + Attempt ─────────────────────────────
  const customTest = await new CustomTest({
    testName: "[Demo] Reasoning Practice Set 1",
    examName: "UPSC",
    couponId: couponA._id,
    createdBy: mainTeacher._id,
    subjects: [{ subjectName: "Reasoning", questions: reasoningQs.slice(0, 3) }],
    marksPerQuestion: 1,
    negativeMarking: 0.25,
    durationMinutes: 15,
  }).save();

  const ctQuestions = customTest.subjects[0].questions;
  await new CustomTestAttempt({
    testId: customTest._id,
    userId: aditi._id,
    examName: "UPSC",
    testName: customTest.testName,
    couponId: couponA._id,
    attemptedQuestions: [
      { questionId: ctQuestions[0]._id, userAnswer: ctQuestions[0].option2, isCorrect: true, timeTakenInSeconds: 20 },
      { questionId: ctQuestions[1]._id, userAnswer: ctQuestions[1].option1, isCorrect: true, timeTakenInSeconds: 25 },
      { questionId: ctQuestions[2]._id, userAnswer: null, isCorrect: null, timeTakenInSeconds: null },
    ],
    totalScore: 2,
    correctCount: 2,
    wrongCount: 0,
    unattemptedCount: 1,
    totalTimeTakenInSeconds: 45,
  }).save();

  // ── 7. Previous Year Tests + Attempt ─────────────────────
  const globalPyq = await new PreviousYearTest({
    examName: "UPSC",
    testName: "[Demo] UPSC Prelims 2023",
    year: 2023,
    description: "UPSC Prelims 2023 ka sample paper.",
    subjects: [
      { subjectName: "Reasoning", questions: reasoningQs.slice(0, 3) },
      { subjectName: "GK", questions: gkQs.slice(0, 3) },
    ],
    marksPerQuestion: 2,
    negativeMarking: 0.66,
    durationMinutes: 120,
  }).save();

  const pyqQuestions = [...globalPyq.subjects[0].questions, ...globalPyq.subjects[1].questions];
  await new PreviousYearAttempt({
    testId: globalPyq._id,
    userId: karan._id,
    examName: "UPSC",
    testName: globalPyq.testName,
    year: 2023,
    attemptedQuestions: pyqQuestions.map((q, i) => ({
      questionId: q._id,
      userAnswer: i % 2 === 0 ? q.option1 : null,
      isCorrect: i % 2 === 0 ? i === 0 : null,
      timeTakenInSeconds: i % 2 === 0 ? 30 : null,
    })),
    totalScore: 2,
    correctCount: 1,
    wrongCount: 2,
    unattemptedCount: 3,
    totalTimeTakenInSeconds: 90,
  }).save();

  // Teacher-created shell paper for couponA (draft — Maths partially filled)
  await new PreviousYearTest({
    examName: "UPSC",
    testName: "[Demo] UPSC Prelims 2024 (Batch Exclusive)",
    year: 2024,
    couponId: couponA._id,
    createdByTeacher: mainTeacher._id,
    blueprint: [
      { subjectName: "Reasoning", questionCount: 5 },
      { subjectName: "Maths", questionCount: 5 },
    ],
    subjects: [
      { subjectName: "Reasoning", questions: reasoningQs },
      { subjectName: "Maths", questions: mathsQs.slice(0, 2) },
    ],
    marksPerQuestion: 2,
    negativeMarking: 0.5,
    durationMinutes: 120,
  }).save();

  // ── 8. Current Affairs + Quiz + Attempt ──────────────────
  const date = todayIST();
  await new CurrentAffair({
    examName: "UPSC",
    date,
    title: "[Demo] Daily Current Affairs",
    items: [
      { headline: "RBI ne repo rate stable rakhi", content: "Monetary Policy Committee ne repo rate mein koi badlav nahi kiya.", category: "Economy", source: "PIB" },
      { headline: "ISRO ka naya satellite launch", content: "ISRO ne ek naya communication satellite safaltapoorvak launch kiya.", category: "Science", source: "ISRO" },
      { headline: "Nayi rashtriya shiksha neeti par charcha", content: "Sarkar ne shiksha sudhar par ek naya panel banaya.", category: "Polity", source: "PIB" },
    ],
  }).save();

  await new CurrentAffair({
    examName: "SSC CGL",
    date,
    title: "[Demo] Daily Current Affairs",
    items: [
      { headline: "SSC ne naya exam calendar jaari kiya", content: "SSC ne agle saal ke exams ka calendar release kiya.", category: "Exam Update", source: "SSC" },
    ],
  }).save();

  const caQuiz = await new CurrentAffairQuiz({
    examName: "UPSC",
    date,
    questions: [
      { question: "RBI ne repo rate ke saath kya kiya?", option1: "Badhaya", option2: "Ghataya", option3: "Stable rakha", option4: "Khatam kiya", correctOption: 3, answerExplain: "Repo rate stable rakhi gayi." },
      { question: "ISRO ne kis tarah ka satellite launch kiya?", option1: "Weather", option2: "Communication", option3: "Military", option4: "Navigation", correctOption: 2, answerExplain: "Communication satellite launch hua." },
    ],
  }).save();

  await new CurrentAffairAttempt({
    userId: aditi._id,
    examName: "UPSC",
    date,
    attemptedQuestions: caQuiz.questions.map((q) => ({ questionId: q._id, userAnswer: q.option3 || q.option2, isCorrect: true })),
    totalScore: 2,
    correctCount: 2,
    wrongCount: 0,
    unattemptedCount: 0,
  }).save();

  // ── 9. Challenge + Attempt ───────────────────────────────
  const challengeSubjectQs = [reasoningQs[0], reasoningQs[1], mathsQs[0]].map((q, i) => ({
    questionId: poolDocs[i]._id,
    question: q.question,
    option1: q.option1,
    option2: q.option2,
    option3: q.option3,
    option4: q.option4,
    correctOption: q.correctOption,
    answerExplain: q.answerExplain,
    topicName: q.topicName,
    subjectName: q.subjectName,
  }));

  const challenge = await new Challenge({
    createdBy: aditi._id,
    examName: "UPSC",
    blueprintName: "[Demo] UPSC Prelims Full Mock 1",
    challengeCode: "DEMO01",
    subjects: [{ subjectName: "Mixed", questions: challengeSubjectQs }],
    createdByName: "Aditi Singh [Demo]",
    marksPerQuestion: 2,
    negativeMarking: 0.5,
    durationMinutes: 30,
    totalQuestions: challengeSubjectQs.length,
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  }).save();

  await new ChallengeAttempt({
    challengeId: challenge._id,
    userId: karan._id,
    userName: "Karan Mehta",
    attemptedQuestions: challengeSubjectQs.map((q, i) => ({
      questionId: q.questionId,
      userAnswer: i === 0 ? q.option2 : null,
      isCorrect: i === 0 ? true : null,
      timeTakenInSeconds: i === 0 ? 15 : null,
    })),
    challengeCode: "DEMO01",
    examName: "UPSC",
    blueprintName: challenge.blueprintName,
    createdByName: challenge.createdByName,
    totalScore: 2,
    correctCount: 1,
    wrongCount: 0,
    unattemptedCount: 2,
    totalTimeTakenInSeconds: 15,
  }).save();

  // ── 10. Rank Predictor Data ──────────────────────────────
  await new RankPredictorData({
    examName: "UPSC",
    year: 2026,
    dataPoints: [
      { score: 180, rank: 50 },
      { score: 150, rank: 500 },
      { score: 120, rank: 5000 },
      { score: 100, rank: 20000 },
      { score: 80, rank: 60000 },
    ],
    totalCandidates: 500000,
    totalVacancies: 1000,
    isActive: true,
  }).save();

  await new RankPredictorData({
    examName: "SSC CGL",
    year: 2026,
    dataPoints: [
      { score: 160, rank: 100 },
      { score: 130, rank: 2000 },
      { score: 100, rank: 15000 },
    ],
    totalCandidates: 300000,
    totalVacancies: 2000,
    isActive: true,
  }).save();

  // ── 11. Performance (mock test analysis) ─────────────────
  await new Performance({
    userId: aditi._id,
    examName: "UPSC",
    blueprintName: "[Demo] UPSC Prelims Full Mock 1",
    attemptedQuestions: poolDocs.slice(0, 10).map((q, i) => ({
      questionId: q._id,
      userAnswer: i < 6 ? q.option1 : null,
      isCorrect: i < 6 ? i % 3 !== 0 : null,
      timeTakenInSeconds: i < 6 ? 25 + i : null,
      isMarkedForReview: i === 2,
    })),
    totalScore: 8,
    correctCount: 4,
    wrongCount: 2,
    unattemptedCount: 4,
    subjectAnalysis: [
      { subjectName: "Reasoning", accuracy: 60, correctCount: 3, wrongCount: 2, unattemptedCount: 0, totalQuestions: 5, totalTimeTaken: 130, averageTimePerQuestion: 26 },
      { subjectName: "Maths", accuracy: 20, correctCount: 1, wrongCount: 0, unattemptedCount: 4, totalQuestions: 5, totalTimeTaken: 25, averageTimePerQuestion: 25 },
    ],
  }).save();

  // ── 12. Hidden Question (student ne ek question hide kiya) ─
  await new HiddenQuestion({ userId: karan._id, questionId: poolDocs[3]._id }).save();

  console.log("\n✅ Demo data seed ho gaya!\n");
  console.log("── Teacher login ──");
  console.log("Main teacher   : rahul.teacher@demo.mocktest.local / Teacher@123");
  console.log("Sub teacher    : priya.subteacher@demo.mocktest.local / Teacher@123 (active)");
  console.log("Sub teacher    : aman.subteacher@demo.mocktest.local / Teacher@123 (active)");
  console.log("Sub teacher    : sanjay.subteacher@demo.mocktest.local (status: pending, login nahi hoga)");
  console.log("\n── Student login ──");
  console.log("Aditi Singh    : 9888800001 / Student@123 (batch: UPSC27A)");
  console.log("Karan Mehta    : 9888800002 / Student@123 (batch: UPSC27A)");
  console.log("Neha Joshi     : 9888800003 / Student@123 (batch: SSCEV)");
  console.log("Vikas Kumar    : 9888800004 / Student@123 (batch: SSCEV)");
  console.log("Simran Kaur    : 9888800005 / Student@123 (koi batch nahi)");
  console.log("\nBatch codes: UPSC27A (UPSC), SSCEV (SSC CGL)");
  console.log("Challenge code to test: DEMO01");
}

run()
  .then(() => rowQuestionConnection.close())
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("❌ Seeding fail ho gayi:", err);
    rowQuestionConnection.close().finally(() => process.exit(1));
  });