// controllers/submitCustomTest.js
// Score hamesha SERVER-SIDE calculate hota hai frozen correctOption se —
// frontend ke bheje "isCorrect" pe kabhi bharosa nahi karte.
import mongoose from "mongoose";
import CustomTest from "../models/CustomTest.js";
import CustomTestAttempt from "../models/CustomTestAttempt.js";

export const submitCustomTest = async (req, res) => {
  try {
    const userId = req.user._id;
    const { testId } = req.params;
    const { attemptedQuestions } = req.body;

    if (!mongoose.Types.ObjectId.isValid(testId)) {
      return res.status(400).json({ success: false, message: "Invalid Test ID" });
    }
    if (!Array.isArray(attemptedQuestions) || attemptedQuestions.length === 0) {
      return res.status(400).json({
        success: false,
        message: "attemptedQuestions mein kam se kam ek question hona chahiye!",
      });
    }

    const test = await CustomTest.findOne({ _id: testId, isActive: true });
    if (!test) {
      return res.status(404).json({ success: false, message: "Ye test nahi mila." });
    }

    // Batch-check yahan bhi — list/get sirf UI-level filtering hai,
    // asli security check submit mein bhi zaroori hai
    const studentCouponId = req.user.activeCoupon ? req.user.activeCoupon.toString() : null;
    if (studentCouponId !== test.couponId.toString()) {
      return res.status(403).json({
        success: false,
        message: "Ye test aapki batch ke liye available nahi hai.",
      });
    }

    const questionMap = {};
    for (const subj of test.subjects) {
      for (const q of subj.questions) {
        questionMap[q._id.toString()] = q;
      }
    }

    let correctCount = 0, wrongCount = 0, unattemptedCount = 0, totalTimeTakenInSeconds = 0;
    const finalAttemptedQuestions = [];

    for (const aq of attemptedQuestions) {
      const qId = aq.questionId ? aq.questionId.toString() : null;
      const realQ = qId ? questionMap[qId] : null;
      if (!realQ) continue;

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
        message: "Koi valid question match nahi hua is test ke sath.",
      });
    }

    const totalScore =
      correctCount * test.marksPerQuestion - wrongCount * test.negativeMarking;

    const newAttempt = new CustomTestAttempt({
      testId: test._id,
      userId,
      examName: test.examName,
      testName: test.testName,
      couponId: test.couponId,
      attemptedQuestions: finalAttemptedQuestions,
      totalScore,
      correctCount,
      wrongCount,
      unattemptedCount,
      totalTimeTakenInSeconds,
    });

    await newAttempt.save();

    return res.status(201).json({
      success: true,
      message: "Custom Test submit ho gaya!",
      data: {
        attemptId: newAttempt._id,
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
    console.error("submitCustomTest error:", error);
    return res.status(500).json({
      success: false,
      message: "Server mein error aa gaya test submit karte waqt.",
      error: error.message,
    });
  }
};