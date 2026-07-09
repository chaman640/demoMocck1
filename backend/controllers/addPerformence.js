// controllers/addPerformence.js

import Performance from "../models/Performance.js";
import Blueprint from "../models/bluePrint.js";
import { Question } from "../models/rowQuestionSchema.js"; // subjectName nikalne ke liye

export const addPerformence = async (req, res) => {
  try {
    const { userId, examName, blueprintName, attemptedQuestions } = req.body;

    // ─────────────────────────────────────────────
    // 1. Validation
    // ─────────────────────────────────────────────
    if (!userId || !examName || !blueprintName || !attemptedQuestions) {
      return res.status(400).json({
        success: false,
        message:
          "userId, examName, blueprintName aur attemptedQuestions bharna zaroori hai!",
      });
    }

    if (!Array.isArray(attemptedQuestions) || attemptedQuestions.length === 0) {
      return res.status(400).json({
        success: false,
        message:
          "attemptedQuestions me kam se kam ek question hona chahiye!",
      });
    }

    // ─────────────────────────────────────────────
    // 2. Validation + Count
    // ─────────────────────────────────────────────
    let correctCount = 0;
    let wrongCount = 0;
    let unattemptedCount = 0;

    for (const q of attemptedQuestions) {
      // isCorrect validation
      if (
        q.isCorrect !== true &&
        q.isCorrect !== false &&
        q.isCorrect !== null
      ) {
        return res.status(400).json({
          success: false,
          message: `Question ${q.questionId} ka isCorrect sirf true, false ya null ho sakta hai.`,
        });
      }

      // BUG FIX: userAnswer null consistency check
      // unattempted (isCorrect: null) → userAnswer null hona chahiye
      // attempted (isCorrect: true/false) → userAnswer null nahi hona chahiye
      if (
        q.isCorrect === null &&
        q.userAnswer !== null &&
        q.userAnswer !== undefined &&
        q.userAnswer !== ""
      ) {
        return res.status(400).json({
          success: false,
          message: `Question ${q.questionId} unattempted hai lekin userAnswer diya gaya hai.`,
        });
      }
      if (
        (q.isCorrect === true || q.isCorrect === false) &&
        (q.userAnswer === null || q.userAnswer === undefined || q.userAnswer === "")
      ) {
        return res.status(400).json({
          success: false,
          message: `Question ${q.questionId} attempted hai lekin userAnswer missing hai.`,
        });
      }

      // timeTaken validation
      if (
        q.timeTakenInSeconds !== undefined &&
        q.timeTakenInSeconds !== null &&
        (typeof q.timeTakenInSeconds !== "number" ||
          q.timeTakenInSeconds < 0)
      ) {
        return res.status(400).json({
          success: false,
          message: `Question ${q.questionId} ka timeTakenInSeconds invalid hai.`,
        });
      }

      // Count
      if (q.isCorrect === true) {
        correctCount++;
      } else if (q.isCorrect === false) {
        wrongCount++;
      } else {
        unattemptedCount++;
      }
    }

    // ─────────────────────────────────────────────
    // 3. Blueprint
    // BUG FIX: pehle sirf blueprintName se dhoondte the — agar do alag
    // exams mein same blueprintName ban jaye to galat blueprint mil sakta tha.
    // Ab examName bhi match karenge, jaise addMocktest.js mein hota hai.
    // ─────────────────────────────────────────────
    const blueprint = await Blueprint.findOne({
      blueprintName,
      examName,
    });

    if (!blueprint) {
      return res.status(404).json({
        success: false,
        message: `'${blueprintName}' ka Blueprint nahi mila '${examName}' exam ke liye!`,
      });
    }

    // Question count verify
    if (
      correctCount + wrongCount + unattemptedCount !==
      blueprint.totalQuestions
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Question count blueprint.totalQuestions se match nahi karta.",
      });
    }

    // ─────────────────────────────────────────────
    // 4. Score Calculate
    // ─────────────────────────────────────────────
    const calculatedScore =
      correctCount * blueprint.marksPerQuestion -
      wrongCount * blueprint.negativeMarking;

    // ─────────────────────────────────────────────
    // 5. Subject-wise Analysis Calculate (accuracy + time dono)
    // ─────────────────────────────────────────────

    // 5a. Sare questionIds nikalo
    const questionIds = attemptedQuestions
      .map((q) => q.questionId)
      .filter(Boolean);

    // 5b. Ek hi query mein sare questions ka subjectName fetch karo
    const questionDocs = await Question.find({
      _id: { $in: questionIds },
    }).select("_id subjectName");

    // 5c. Lookup map: questionId(string) -> subjectName
    const subjectNameMap = {};
    for (const doc of questionDocs) {
      subjectNameMap[doc._id.toString()] = doc.subjectName;
    }

    // 5d. Subject ke hisaab se group karo
    // BUG FIX: pehle 'wrong' alag track nahi ho raha tha —
    // 'total - correct' galat tha kyunki unattempted bhi total mein the
    // Ab wrong alag se count ho raha hai
    const subjectGroups = {};

    for (const q of attemptedQuestions) {
      if (!q.questionId) continue;

      const subjectName = subjectNameMap[q.questionId.toString()];
      if (!subjectName) continue;

      if (!subjectGroups[subjectName]) {
        subjectGroups[subjectName] = {
          correct: 0,
          wrong: 0,        // ✅ FIX: alag se track ho raha hai
          unattempted: 0,  // ✅ FIX: alag se track ho raha hai
          total: 0,
          totalTime: 0,
          timedCount: 0,
        };
      }

      subjectGroups[subjectName].total++;

      if (q.isCorrect === true) {
        subjectGroups[subjectName].correct++;
      } else if (q.isCorrect === false) {
        subjectGroups[subjectName].wrong++;        // ✅ FIX
      } else {
        subjectGroups[subjectName].unattempted++;  // ✅ FIX
      }

      // Sirf un questions ka time gino jinka time data hai
      if (
        typeof q.timeTakenInSeconds === "number" &&
        q.timeTakenInSeconds >= 0
      ) {
        subjectGroups[subjectName].totalTime += q.timeTakenInSeconds;
        subjectGroups[subjectName].timedCount++;
      }
    }

    // 5e. subjectAnalysis array banao
    const subjectAnalysis = Object.keys(subjectGroups).map((subjectName) => {
      const { correct, wrong, unattempted, total, totalTime, timedCount } =
        subjectGroups[subjectName];

      const accuracy =
        total === 0 ? 0 : Number(((correct / total) * 100).toFixed(2));

      const averageTimePerQuestion =
        timedCount === 0
          ? 0
          : Number((totalTime / timedCount).toFixed(2));

      return {
        subjectName,
        accuracy,
        correctCount: correct,
        wrongCount: wrong,          // ✅ FIX: sahi value aa rahi hai
        unattemptedCount: unattempted, // ✅ FIX: sahi value aa rahi hai
        totalQuestions: total,
        totalTimeTaken: totalTime,
        averageTimePerQuestion,
      };
    });

    // ─────────────────────────────────────────────
    // 6. Save Performance
    // ─────────────────────────────────────────────
    const newPerformance = new Performance({
      userId,
      examName,
      blueprintName,
      attemptedQuestions,
      totalScore: calculatedScore,
      correctCount,
      wrongCount,
      unattemptedCount,
      subjectAnalysis,
    });

    await newPerformance.save();

    // ─────────────────────────────────────────────
    // 7. Response
    // ─────────────────────────────────────────────
    return res.status(201).json({
      success: true,
      message: "User Performance Successfully Save Ho Gayi.",
      data: {
        performanceId: newPerformance._id,
        scoreDetails: {
          totalQuestions: blueprint.totalQuestions,
          correct: correctCount,
          wrong: wrongCount,
          unattempted: unattemptedCount,
          totalScore: calculatedScore,
        },
        subjectAnalysis,
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Performance save karte waqt server error aaya.",
      error: error.message,
    });
  }
};