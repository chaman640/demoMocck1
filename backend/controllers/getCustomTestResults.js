import mongoose from "mongoose";
import CustomTest from "../models/CustomTest.js";
import CustomTestAttempt from "../models/CustomTestAttempt.js";
import User from "../models/User.js";
import { getAllowedSubjectsForTeacher } from "../utils/classAnalytics.js";
import { sameSubject } from "../utils/subjectName.js";

const QUESTION_TIME_MIN_SAMPLE = 3;

const verifyTestAccess = async (teacher, testId) => {
  if (!mongoose.Types.ObjectId.isValid(testId)) {
    return { allowed: false, status: 400, message: "Invalid Test ID." };
  }
  const test = await CustomTest.findById(testId);
  if (!test) return { allowed: false, status: 404, message: "Test not found." };

  if (!teacher.activeCoupon || test.couponId.toString() !== teacher.activeCoupon.toString()) {
    return { allowed: false, status: 403, message: "This test does not belong to your active batch." };
  }
  return { allowed: true, test };
};

export const getCustomTestLeaderboard = async (req, res) => {
  try {
    const { testId } = req.params;
    const check = await verifyTestAccess(req.teacher, testId);
    if (!check.allowed) return res.status(check.status).json({ success: false, message: check.message });
    const test = check.test;

    const batchStudents = await User.find({ activeCoupon: req.teacher.activeCoupon }).select("_id name phone");

    // Har student ka PEHLA attempt — retake (jab answers pehle hi dekh liye
    // hon) se leaderboard nahi badalna chahiye. Pehle Map mein aakhri attempt
    // reh jaata tha.
    const attempts = await CustomTestAttempt.find({ testId })
      .select("userId totalScore correctCount wrongCount unattemptedCount totalTimeTakenInSeconds createdAt")
      .sort({ createdAt: 1 });
    const attemptMap = new Map();
    for (const a of attempts) {
      const key = a.userId.toString();
      if (!attemptMap.has(key)) attemptMap.set(key, a);
    }

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

export const getCustomTestQuestionAnalysis = async (req, res) => {
  try {
    const { testId } = req.params;
    const check = await verifyTestAccess(req.teacher, testId);
    if (!check.allowed) return res.status(check.status).json({ success: false, message: check.message });
    const test = check.test;

    const allowedSubjects = await getAllowedSubjectsForTeacher(req.teacher);

    // Sirf har student ka pehla attempt gino (retake answers dekh kar hote hain)
    const allAttempts = await CustomTestAttempt.find({ testId }).select("userId attemptedQuestions").sort({ createdAt: 1 });
    const seenStudents = new Set();
    const attempts = allAttempts.filter((a) => {
      const key = a.userId.toString();
      if (seenStudents.has(key)) return false;
      seenStudents.add(key);
      return true;
    });

    const counts = new Map();
    for (const attempt of attempts) {
      for (const aq of attempt.attemptedQuestions) {
        const key = aq.questionId.toString();
        if (!counts.has(key)) {
          counts.set(key, { total: 0, wrong: 0, unattempted: 0, opt1: 0, opt2: 0, opt3: 0, opt4: 0, totalTime: 0, timedCount: 0 });
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
        if (typeof aq.timeTakenInSeconds === "number" && aq.timeTakenInSeconds >= 0) {
          c.totalTime += aq.timeTakenInSeconds;
          c.timedCount++;
        }
      }
    }

    const questions = [];
    let qNumber = 0;
    for (const subj of test.subjects) {
      if (Array.isArray(allowedSubjects) && !allowedSubjects.some((a) => sameSubject(a, subj.subjectName))) continue;

      for (const q of subj.questions) {
        qNumber++;
        const c = counts.get(q._id.toString()) || { total: 0, wrong: 0, unattempted: 0, opt1: 0, opt2: 0, opt3: 0, opt4: 0, totalTime: 0, timedCount: 0 };
        questions.push({
          questionNumber: qNumber,
          questionId: q._id,
          subjectName: subj.subjectName,
          topicName: q.topicName,
          question: q.question,
          questionPhoto: q.questionPhoto || null,
          options: { option1: q.option1, option2: q.option2, option3: q.option3, option4: q.option4 },
          correctOption: q.correctOption,
          answerExplain: q.answerExplain,
          answerExplainWithPhoto: q.answerExplainWithPhoto || null,
          askedIn: q.askedIn ?? null,
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
          averageTimeSeconds: c.timedCount >= QUESTION_TIME_MIN_SAMPLE ? Math.round(c.totalTime / c.timedCount) : null,
          timeSampleSize: c.timedCount,
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
