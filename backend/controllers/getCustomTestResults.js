// backend/controllers/getCustomTestResults.js
//
// 🆕 NAYA — Teacher ek specific Custom Test kholke do cheezein dekh sake:
//   1. Leaderboard — batch ke har student ne kitna score kiya, rank ke saath
//      (jisne nahi diya wo "Not attempted" mein alag dikhega)
//   2. Question Analysis — us EK test ke har sawaal ka: correct option,
//      kitne % students ne kaunsa option choose kiya, aur explanation —
//      taaki teacher ko pata chale kaunsa sawaal students ko sabse zyada
//      pareshan kar raha hai
import mongoose from "mongoose";
import CustomTest from "../models/CustomTest.js";
import CustomTestAttempt from "../models/CustomTestAttempt.js";
import User from "../models/User.js";
import { getAllowedSubjectsForTeacher } from "../utils/classAnalytics.js";
import { sameSubject } from "../utils/subjectName.js";

// ─────────────────────────────────────────────
// Test teacher ke active batch ka hi hai, ye verify karta hai
// ─────────────────────────────────────────────
const verifyTestAccess = async (teacher, testId) => {
  if (!mongoose.Types.ObjectId.isValid(testId)) {
    return { allowed: false, status: 400, message: "Invalid Test ID." };
  }
  const test = await CustomTest.findById(testId);
  if (!test) return { allowed: false, status: 404, message: "Test nahi mila." };

  if (!teacher.activeCoupon || test.couponId.toString() !== teacher.activeCoupon.toString()) {
    return { allowed: false, status: 403, message: "Ye test aapke active batch ka nahi hai." };
  }
  return { allowed: true, test };
};

// ─────────────────────────────────────────────
// GET /teacher/custom-test/:testId/results — Leaderboard
// ─────────────────────────────────────────────
export const getCustomTestLeaderboard = async (req, res) => {
  try {
    const { testId } = req.params;
    const check = await verifyTestAccess(req.teacher, testId);
    if (!check.allowed) return res.status(check.status).json({ success: false, message: check.message });
    const test = check.test;

    const batchStudents = await User.find({ activeCoupon: req.teacher.activeCoupon }).select("_id name phone");

    const attempts = await CustomTestAttempt.find({ testId }).select(
      "userId totalScore correctCount wrongCount unattemptedCount totalTimeTakenInSeconds createdAt"
    );
    const attemptMap = new Map(attempts.map((a) => [a.userId.toString(), a]));

    const maxScore = test.totalQuestions * test.marksPerQuestion;

    const allRows = batchStudents.map((s) => {
      const a = attemptMap.get(s._id.toString());
      if (!a) {
        return { studentId: s._id, name: s.name, phone: s.phone, attempted: false };
      }
      return {
        studentId: s._id,
        name: s.name,
        phone: s.phone,
        attempted: true,
        totalScore: a.totalScore,
        correctCount: a.correctCount,
        wrongCount: a.wrongCount,
        unattemptedCount: a.unattemptedCount,
        totalTimeTakenInSeconds: a.totalTimeTakenInSeconds,
        attemptedAt: a.createdAt,
      };
    });

    // Rank sirf attempt karne walon ko milta hai, score ke hisaab se
    const leaderboard = allRows
      .filter((r) => r.attempted)
      .sort((a, b) => b.totalScore - a.totalScore)
      .map((r, i) => ({ ...r, rank: i + 1 }));

    const notAttempted = allRows.filter((r) => !r.attempted);

    return res.status(200).json({
      success: true,
      data: {
        testId: test._id,
        testName: test.testName,
        totalQuestions: test.totalQuestions,
        maxScore,
        totalBatchStudents: batchStudents.length,
        totalAttempted: leaderboard.length,
        leaderboard,
        notAttempted,
      },
    });
  } catch (error) {
    console.error("getCustomTestLeaderboard error:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// ─────────────────────────────────────────────
// GET /teacher/custom-test/:testId/question-analysis
// Is EK test ke har sawaal ka option-pick breakdown
// ─────────────────────────────────────────────
export const getCustomTestQuestionAnalysis = async (req, res) => {
  try {
    const { testId } = req.params;
    const check = await verifyTestAccess(req.teacher, testId);
    if (!check.allowed) return res.status(check.status).json({ success: false, message: check.message });
    const test = check.test;

    // Sub-teacher apne authorized subjects ke alawa is test ke doosre
    // subjects ka analysis nahi dekh sakta
    const allowedSubjects = await getAllowedSubjectsForTeacher(req.teacher);

    const attempts = await CustomTestAttempt.find({ testId }).select("attemptedQuestions");

    const counts = new Map(); // questionId → counts
    for (const attempt of attempts) {
      for (const aq of attempt.attemptedQuestions) {
        const key = aq.questionId.toString();
        if (!counts.has(key)) {
          counts.set(key, { total: 0, wrong: 0, unattempted: 0, opt1: 0, opt2: 0, opt3: 0, opt4: 0 });
        }
        const c = counts.get(key);
        if (aq.isCorrect === null || aq.isCorrect === undefined) {
          c.unattempted++;
          continue;
        }
        c.total++;
        if (aq.isCorrect === false) c.wrong++;
        if (aq.userAnswer === "1") c.opt1++;
        else if (aq.userAnswer === "2") c.opt2++;
        else if (aq.userAnswer === "3") c.opt3++;
        else if (aq.userAnswer === "4") c.opt4++;
      }
    }

    const questions = [];
    let qNumber = 0;
    for (const subj of test.subjects) {
      if (Array.isArray(allowedSubjects) && !allowedSubjects.some((a) => sameSubject(a, subj.subjectName))) continue;

      for (const q of subj.questions) {
        qNumber++;
        const c = counts.get(q._id.toString()) || { total: 0, wrong: 0, unattempted: 0, opt1: 0, opt2: 0, opt3: 0, opt4: 0 };
        questions.push({
          questionNumber: qNumber,
          questionId: q._id,
          subjectName: subj.subjectName,
          topicName: q.topicName,
          question: q.question,
          questionPhoto: q.questionPhoto || null, // 🆕
          options: { option1: q.option1, option2: q.option2, option3: q.option3, option4: q.option4 },
          correctOption: q.correctOption,
          answerExplain: q.answerExplain,
          answerExplainWithPhoto: q.answerExplainWithPhoto || null, // 🆕
          askedIn: q.askedIn ?? null, // 🆕
          totalAttempts: c.total,
          unattemptedCount: c.unattempted,
          wrongCount: c.wrong,
          wrongPercentage: c.total === 0 ? 0 : Number(((c.wrong / c.total) * 100).toFixed(2)),
          optionPickPercentage: {
            option1: c.total === 0 ? 0 : Number(((c.opt1 / c.total) * 100).toFixed(2)),
            option2: c.total === 0 ? 0 : Number(((c.opt2 / c.total) * 100).toFixed(2)),
            option3: c.total === 0 ? 0 : Number(((c.opt3 / c.total) * 100).toFixed(2)),
            option4: c.total === 0 ? 0 : Number(((c.opt4 / c.total) * 100).toFixed(2)),
          },
        });
      }
    }

    return res.status(200).json({
      success: true,
      data: { testId: test._id, testName: test.testName, totalStudentsAttempted: attempts.length, questions },
    });
  } catch (error) {
    console.error("getCustomTestQuestionAnalysis error:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};
