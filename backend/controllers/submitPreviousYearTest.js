// controllers/submitPreviousYearTest.js
// Score hamesha SERVER-SIDE calculate hota hai frozen correctOption se —
// frontend ke bheje "isCorrect" pe kabhi bharosa nahi karte.
import mongoose from "mongoose";
import PreviousYearTest from "../models/PreviousYearTest.js";
import PreviousYearAttempt from "../models/PreviousYearAttempt.js";
import { creditQuestionsToCommissionHolders } from "../utils/commissionTracking.js";
import { creditDailyCoinsIfEligible } from "../utils/coinRewards.js";
import { dedupeAttemptedQuestions } from "../utils/attemptHelpers.js";

export const submitPreviousYearTest = async (req, res) => {
  try {
    const userId = req.user._id;
    const { testId } = req.params;
    // Ek question sirf ek baar gina jaaye (duplicate bhej kar score badhana band)
    const attemptedQuestions = Array.isArray(req.body.attemptedQuestions)
      ? dedupeAttemptedQuestions(req.body.attemptedQuestions)
      : req.body.attemptedQuestions;

    if (!mongoose.Types.ObjectId.isValid(testId)) {
      return res.status(400).json({ success: false, message: "Invalid Test ID" });
    }

    if (!Array.isArray(attemptedQuestions) || attemptedQuestions.length === 0) {
      return res.status(400).json({
        success: false,
        message: "attemptedQuestions must contain at least one question!",
      });
    }

    // STEP 1: Test dhundo
    // 🐛 FIX: `status: "complete"` ka check add kiya.
    // getPreviousYearTest.js mein ye check tha, lekin submit mein NAHI —
    // matlab ek adhoora (draft) teacher paper ka testId guess karke submit
    // kiya ja sakta tha aur uska attempt DB mein ban jata tha.
    const test = await PreviousYearTest.findOne({
      _id: testId,
      isActive: true,
      status: "complete",
    });

    if (!test) {
      return res.status(404).json({
        success: false,
        message: "Previous Year Test not found.",
      });
    }

    // 🔒 SECURITY FIX: batch-exclusive paper ka check.
    // getPreviousYearTest mein ye check tha lekin submit mein nahi tha —
    // doosri batch ka student direct submit call karke uske paper ka
    // attempt bana sakta tha (aur leaderboard/analysis kharab kar sakta tha).
    if (test.couponId) {
      const studentCouponId = req.user.activeCoupon ? req.user.activeCoupon.toString() : null;
      if (studentCouponId !== test.couponId.toString()) {
        return res.status(403).json({
          success: false,
          message: "This paper is not available for your batch.",
        });
      }
    }

    const questionMap = {};
    for (const subj of test.subjects) {
      for (const q of subj.questions) {
        questionMap[q._id.toString()] = q;
      }
    }

    // STEP 2: Har answer validate + score calculate
    let correctCount = 0;
    let wrongCount = 0;
    let unattemptedCount = 0;
    let totalTimeTakenInSeconds = 0;

    const finalAttemptedQuestions = [];

    for (const aq of attemptedQuestions) {
      const qId = aq.questionId ? aq.questionId.toString() : null;
      const realQ = qId ? questionMap[qId] : null;

      if (!realQ) continue; // is test ka question hi nahi — skip

      const userAnswer =
        aq.userAnswer !== undefined && aq.userAnswer !== null && aq.userAnswer !== ""
          ? String(aq.userAnswer)
          : null;

      const isCorrect = userAnswer === null ? null : userAnswer === String(realQ.correctOption);

      const timeTaken =
        typeof aq.timeTakenInSeconds === "number" && aq.timeTakenInSeconds >= 0
          ? aq.timeTakenInSeconds
          : 0;

      if (isCorrect === true) correctCount++;
      else if (isCorrect === false) wrongCount++;
      else unattemptedCount++;

      totalTimeTakenInSeconds += timeTaken;

      finalAttemptedQuestions.push({
        questionId: realQ._id,
        userAnswer,
        isCorrect,
        timeTakenInSeconds: timeTaken,
      });
    }

    if (finalAttemptedQuestions.length === 0) {
      return res.status(400).json({
        success: false,
        message: "No valid question matched this test.",
      });
    }

    // STEP 3: Score
    const totalScore =
      correctCount * test.marksPerQuestion - wrongCount * test.negativeMarking;

    // STEP 4: Attempt save (multiple attempts allowed hain)
    const newAttempt = new PreviousYearAttempt({
      testId: test._id,
      userId,
      examName: test.examName,
      testName: test.testName,
      year: test.year,
      attemptedQuestions: finalAttemptedQuestions,
      totalScore,
      correctCount,
      wrongCount,
      unattemptedCount,
      totalTimeTakenInSeconds,
    });

    // Retake allowed hai, lekin commission sirf pehli baar — warna wahi paper
    // baar-baar de kar teacher/promoter ka hisab badhaya ja sakta tha
    const isFirstAttempt = !(await PreviousYearAttempt.exists({ testId: test._id, userId }));
    await newAttempt.save();

    if (isFirstAttempt) await creditQuestionsToCommissionHolders(req.user, correctCount + wrongCount);

    const coinsEarned = await creditDailyCoinsIfEligible(req.user, {
      attempted: correctCount + wrongCount,
      // Paper ke asli total se — sirf 1 sawaal bhej kar "100 percent complete" na bane
      total: Math.max(correctCount + wrongCount + unattemptedCount, test.totalQuestions || 0),
    });

    return res.status(201).json({
      success: true,
      message: "Previous Year Test submitted!",
      data: {
        attemptId: newAttempt._id,
        coinsEarned,
        testId: test._id,
        testName: test.testName,
        totalScore,
        correctCount,
        wrongCount,
        unattemptedCount,
        totalTimeTakenInSeconds,
        totalQuestions: test.totalQuestions,
      },
    });
  } catch (error) {
    console.error("submitPreviousYearTest error:", error);
    return res.status(500).json({
      success: false,
      message: "Server error while submitting the test.",
      error: error.message,
    });
  }
};
