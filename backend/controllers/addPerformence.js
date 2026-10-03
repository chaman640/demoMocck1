import mongoose from "mongoose";
// controllers/addPerformence.js
import Performance from "../models/Performance.js";
import Blueprint from "../models/bluePrint.js";
import { Question } from "../models/rowQuestionSchema.js";
import UnseenPassage from "../models/UnseenPassage.js";
import { dedupeAttemptedQuestions, questionSetHash } from "../utils/attemptHelpers.js";

// Same mock (same questions) itne ghante ke andar dobara submit ho to naya
// record nahi banta — pehla result hi lautaya jaata hai (double-tap / retry
// se coins aur teacher commission do baar na judein)
const RESUBMIT_WINDOW_HOURS = 6;
import { creditQuestionsToCommissionHolders } from "../utils/commissionTracking.js";
import { creditDailyCoinsIfEligible } from "../utils/coinRewards.js";

export const addPerformence = async (req, res) => {
  try {
    const { examName, blueprintName } = req.body;
    const attemptedQuestions = Array.isArray(req.body.attemptedQuestions)
      ? dedupeAttemptedQuestions(req.body.attemptedQuestions)
      : req.body.attemptedQuestions;

    // ─────────────────────────────────────────────
    // 🔒 SECURITY FIX: userId ab request body se NAHI aata.
    //
    // Pehle ye route bina login ke tha aur body ka `userId` blindly trust
    // karta tha — koi bhi banda kisi bhi user ki ID daal kar uske account
    // mein fake performance/score daal sakta tha (analysis khराब kar deta).
    // Ab route pe userInfo middleware hai aur ID session se aati hai.
    // ─────────────────────────────────────────────
    if (!req.user || !req.user._id) {
      return res.status(401).json({ success: false, message: "Login zaroori hai!" });
    }
    const userId = req.user._id;

    // 1. Validation
    if (!examName || !blueprintName || !attemptedQuestions) {
      return res.status(400).json({
        success: false,
        message: "examName, blueprintName aur attemptedQuestions bharna zaroori hai!",
      });
    }

    if (!Array.isArray(attemptedQuestions) || attemptedQuestions.length === 0) {
      return res.status(400).json({
        success: false,
        message: "attemptedQuestions me kam se kam ek question hona chahiye!",
      });
    }

    // 2. Per-question shape validation
    // NOTE: `isCorrect` jaanbujh kar trust nahi karte — wo neeche server-side
    // DB ke correctOption se calculate hota hai.
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

    // 3. Blueprint
    const blueprint = await Blueprint.findOne({ blueprintName, examName });

    if (!blueprint) {
      return res.status(404).json({
        success: false,
        message: `'${blueprintName}' ka Blueprint nahi mila '${examName}' exam ke liye!`,
      });
    }

    // 4. Sare questions ka REAL correctOption + subjectName DB se
    // Blueprint ke topics ka jod — totalQuestions galat bhara ho tab bhi
    // asli mock reject na ho
    const topicSum = (blueprint.subjects || []).reduce(
      (sum, s) => sum + (s.topics || []).reduce((t, tp) => t + (Number(tp.questionCount) || 0), 0),
      0
    );
    const maxQuestions = Math.max(Number(blueprint.totalQuestions) || 0, topicSum);
    if (attemptedQuestions.length > maxQuestions) {
      return res.status(400).json({
        success: false,
        message: "Is mock mein itne questions nahi ho sakte.",
      });
    }

    const questionIds = attemptedQuestions
      .map((q) => String(q.questionId))
      .filter((id) => mongoose.Types.ObjectId.isValid(id));

    const setHash = questionSetHash(questionIds);
    const duplicate = await Performance.findOne({
      userId,
      blueprintName,
      questionSetHash: setHash,
      createdAt: { $gte: new Date(Date.now() - RESUBMIT_WINDOW_HOURS * 60 * 60 * 1000) },
    });
    if (duplicate) {
      return res.status(200).json({
        success: true,
        message: "Ye mock pehle hi submit ho chuka hai.",
        data: {
          performanceId: duplicate._id,
          coinsEarned: 0,
          scoreDetails: {
            totalQuestions: blueprint.totalQuestions,
            correct: duplicate.correctCount,
            wrong: duplicate.wrongCount,
            unattempted: duplicate.unattemptedCount,
            totalScore: duplicate.totalScore,
          },
          subjectAnalysis: duplicate.subjectAnalysis,
        },
      });
    }

    // Sirf isi exam ke question bank ke sawaal score honge
    const questionDocs = await Question.find({ _id: { $in: questionIds }, examName }).select(
      "_id subjectName correctOption"
    );

    const questionMap = {};
    for (const doc of questionDocs) {
      questionMap[doc._id.toString()] = doc;
    }

    // Unseen passage ke sawaal alag collection mein rehte hain — pehle ye
    // chupchaap skip ho jaate the aur unke marks kabhi nahi judte the
    const missingIds = questionIds.filter((id) => !questionMap[id]);
    if (missingIds.length > 0) {
      const passages = await UnseenPassage.find({
        examName,
        "questions._id": { $in: missingIds },
      }).select("subjectName questions._id questions.correctOption");
      const wanted = new Set(missingIds);
      for (const passage of passages) {
        for (const pq of passage.questions) {
          const id = pq._id.toString();
          if (wanted.has(id)) {
            questionMap[id] = { _id: pq._id, subjectName: passage.subjectName, correctOption: pq.correctOption };
          }
        }
      }
    }

    // 5. isCorrect SERVER-SIDE calculate + subject grouping
    let correctCount = 0;
    let wrongCount = 0;
    let unattemptedCount = 0;

    const finalAttemptedQuestions = [];
    const subjectGroups = {};

    for (const q of attemptedQuestions) {
      const qIdStr = q.questionId ? q.questionId.toString() : null;
      const questionDoc = qIdStr ? questionMap[qIdStr] : null;

      // Fake/deleted questionId → skip
      if (!questionDoc) continue;

      const userAnswer =
        q.userAnswer !== undefined && q.userAnswer !== null && q.userAnswer !== ""
          ? String(q.userAnswer)
          : null;

      const isCorrect =
        userAnswer === null ? null : userAnswer === String(questionDoc.correctOption);

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

    if (finalAttemptedQuestions.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Koi valid question match nahi hua is mock test ke sath.",
      });
    }

    // 6. Score
    const calculatedScore =
      correctCount * blueprint.marksPerQuestion - wrongCount * blueprint.negativeMarking;

    // 7. subjectAnalysis
    const subjectAnalysis = Object.keys(subjectGroups).map((subjectName) => {
      const { correct, wrong, unattempted, total, totalTime, timedCount } =
        subjectGroups[subjectName];

      const accuracy = total === 0 ? 0 : Number(((correct / total) * 100).toFixed(2));
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

    // 8. Save
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
      questionSetHash: setHash,
    });

    await newPerformance.save();

    await creditQuestionsToCommissionHolders(req.user, correctCount + wrongCount);

    const coinsEarned = await creditDailyCoinsIfEligible(req.user, {
      attempted: correctCount + wrongCount,
      total: correctCount + wrongCount + unattemptedCount,
    });

    // 9. Response
    return res.status(201).json({
      success: true,
      message: "User Performance Successfully Save Ho Gayi.",
      data: {
        performanceId: newPerformance._id,
        coinsEarned,
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
    console.error("addPerformence error:", error);
    return res.status(500).json({
      success: false,
      message: "Performance save karte waqt server error aaya.",
      error: error.message,
    });
  }
};
