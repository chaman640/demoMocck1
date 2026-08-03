// controllers/submitPreviousYearTest.js
// Score hamesha SERVER-SIDE calculate hota hai frozen correctOption se —
// frontend ke bheje "isCorrect" pe kabhi bharosa nahi karte (Challenge jaisa pattern)
import mongoose from "mongoose";
import PreviousYearTest from "../models/PreviousYearTest.js";
import PreviousYearAttempt from "../models/PreviousYearAttempt.js";

export const submitPreviousYearTest = async (req, res) => {
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

    // STEP 1: Test dhundo (correctOption yahi se milega)
    const test = await PreviousYearTest.findOne({ _id: testId, isActive: true });

    if (!test) {
      return res.status(404).json({
        success: false,
        message: "Ye Previous Year Test nahi mila.",
      });
    }

    const questionMap = {};
    for (const subj of test.subjects) {
      for (const q of subj.questions) {
        questionMap[q._id.toString()] = q;
      }
    }

    // STEP 2: Har answer validate + score calculate karo
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

      const isCorrect =
        userAnswer === null ? null : userAnswer === String(realQ.correctOption);

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

    // STEP 3: Score calculate karo
    const totalScore =
      correctCount * test.marksPerQuestion - wrongCount * test.negativeMarking;

    // STEP 4: Attempt save karo (multiple attempts allowed hain)
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

    await newAttempt.save();

    return res.status(201).json({
      success: true,
      message: "Previous Year Test submit ho gaya!",
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
    console.error("submitPreviousYearTest error:", error);
    return res.status(500).json({
      success: false,
      message: "Server mein error aa gaya test submit karte waqt.",
      error: error.message,
    });
  }
};