// controllers/addPerformence.js

import Performance from "../models/Performance.js";
import Blueprint from "../models/bluePrint.js";
import { Question } from "../models/rowQuestionSchema.js";

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
    // 2. Per-question shape validation
    // BUG FIX (security): isCorrect ab yahan validate/trust NAHI kiya jaata.
    // Pehle jo bhi isCorrect frontend bhejta tha wahi seedha DB mein save
    // ho jaata tha — matlab Network request edit karke score badhaya ja
    // sakta tha. Ab sirf questionId aur timeTakenInSeconds ka shape check
    // karenge; isCorrect hum khud STEP 4-5 mein DB se nikalenge.
    // ─────────────────────────────────────────────
    for (const q of attemptedQuestions) {
      if (!q.questionId) {
        return res.status(400).json({
          success: false,
          message: "Har attempted question ka questionId zaroori hai.",
        });
      }

      if (
        q.timeTakenInSeconds !== undefined &&
        q.timeTakenInSeconds !== null &&
        (typeof q.timeTakenInSeconds !== "number" || q.timeTakenInSeconds < 0)
      ) {
        return res.status(400).json({
          success: false,
          message: `Question ${q.questionId} ka timeTakenInSeconds invalid hai.`,
        });
      }
    }

    // ─────────────────────────────────────────────
    // 3. Blueprint dhundo (marksPerQuestion, negativeMarking, totalQuestions ke liye)
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

    // ─────────────────────────────────────────────
    // 4. Sare attempted questions ka REAL correctOption + subjectName
    // ek hi query mein DB se nikalo — yahi ab source of truth hai
    // (submitChallenge.js mein bhi bilkul isi pattern se hota hai)
    // ─────────────────────────────────────────────
    const questionIds = attemptedQuestions
      .map((q) => q.questionId)
      .filter(Boolean);

    const questionDocs = await Question.find({
      _id: { $in: questionIds },
    }).select("_id subjectName correctOption");

    const questionMap = {};
    for (const doc of questionDocs) {
      questionMap[doc._id.toString()] = doc;
    }

    // ─────────────────────────────────────────────
    // 5. Har question ke liye isCorrect SERVER-SIDE calculate karo,
    // aur subject-wise grouping bhi isi ek loop mein kar lo
    // ─────────────────────────────────────────────
    let correctCount = 0;
    let wrongCount = 0;
    let unattemptedCount = 0;

    const finalAttemptedQuestions = [];
    const subjectGroups = {};

    for (const q of attemptedQuestions) {
      const qIdStr = q.questionId ? q.questionId.toString() : null;
      const questionDoc = qIdStr ? questionMap[qIdStr] : null;

      // Agar ye question DB mein mila hi nahi (deleted ya tampered
      // questionId), skip karo — fake ID daal ke score badhaya nahi ja sakta
      if (!questionDoc) continue;

      const userAnswer =
        q.userAnswer !== undefined && q.userAnswer !== null && q.userAnswer !== ""
          ? String(q.userAnswer)
          : null;

      // BUG FIX: isCorrect ab frontend se NAHI aata — hum khud
      // userAnswer ko DB ke correctOption se compare karke nikalte hain
      const isCorrect =
        userAnswer === null
          ? null
          : userAnswer === String(questionDoc.correctOption);

      const timeTaken =
        typeof q.timeTakenInSeconds === "number" && q.timeTakenInSeconds >= 0
          ? q.timeTakenInSeconds
          : null;

      if (isCorrect === true) correctCount++;
      else if (isCorrect === false) wrongCount++;
      else unattemptedCount++;

      finalAttemptedQuestions.push({
        questionId: questionDoc._id,
        userAnswer,
        isCorrect,
        timeTakenInSeconds: timeTaken,
      });

      // Subject-wise grouping — DB ke subjectName se (client se nahi)
      const subjectName = questionDoc.subjectName;
      if (subjectName) {
        if (!subjectGroups[subjectName]) {
          subjectGroups[subjectName] = {
            correct: 0,
            wrong: 0,
            unattempted: 0,
            total: 0,
            totalTime: 0,
            timedCount: 0,
          };
        }

        subjectGroups[subjectName].total++;

        if (isCorrect === true) subjectGroups[subjectName].correct++;
        else if (isCorrect === false) subjectGroups[subjectName].wrong++;
        else subjectGroups[subjectName].unattempted++;

        if (timeTaken !== null) {
          subjectGroups[subjectName].totalTime += timeTaken;
          subjectGroups[subjectName].timedCount++;
        }
      }
    }

    // Agar koi bhi valid question match nahi hua (sab tampered/deleted the)
    // Note: purana dead check (counts === attemptedQuestions.length, jo
    // hamesha true hota tha) yahan se hata diya — ab ye meaningful check hai
    if (finalAttemptedQuestions.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Koi valid question match nahi hua is mock test ke sath.",
      });
    }

    // ─────────────────────────────────────────────
    // 6. Score Calculate
    // ─────────────────────────────────────────────
    const calculatedScore =
      correctCount * blueprint.marksPerQuestion -
      wrongCount * blueprint.negativeMarking;

    // ─────────────────────────────────────────────
    // 7. subjectAnalysis array banao
    // ─────────────────────────────────────────────
    const subjectAnalysis = Object.keys(subjectGroups).map((subjectName) => {
      const { correct, wrong, unattempted, total, totalTime, timedCount } =
        subjectGroups[subjectName];

      const accuracy =
        total === 0 ? 0 : Number(((correct / total) * 100).toFixed(2));

      const averageTimePerQuestion =
        timedCount === 0 ? 0 : Number((totalTime / timedCount).toFixed(2));

      return {
        subjectName,
        accuracy,
        correctCount: correct,
        wrongCount: wrong,
        unattemptedCount: unattempted,
        totalQuestions: total,
        totalTimeTaken: totalTime,
        averageTimePerQuestion,
      };
    });

    // ─────────────────────────────────────────────
    // 8. Save Performance
    // ─────────────────────────────────────────────
    const newPerformance = new Performance({
      userId,
      examName,
      blueprintName,
      attemptedQuestions: finalAttemptedQuestions,
      totalScore: calculatedScore,
      correctCount,
      wrongCount,
      unattemptedCount,
      subjectAnalysis,
    });

    await newPerformance.save();

    // ─────────────────────────────────────────────
    // 9. Response
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