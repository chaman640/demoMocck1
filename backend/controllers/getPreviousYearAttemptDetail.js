// controllers/getPreviousYearAttemptDetail.js
// Submit ke baad review screen isi se poora breakdown (correct answer +
// explanation ke sath) fetch karti hai
import mongoose from "mongoose";
import PreviousYearTest from "../models/PreviousYearTest.js";
import PreviousYearAttempt from "../models/PreviousYearAttempt.js";

export const getPreviousYearAttemptDetail = async (req, res) => {
  try {
    const userId = req.user._id;
    const { attemptId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(attemptId)) {
      return res.status(400).json({ success: false, message: "Invalid Attempt ID" });
    }

    // STEP 1: Attempt dhundo — sirf apna hi dekh sake
    const attempt = await PreviousYearAttempt.findOne({ _id: attemptId, userId });

    if (!attempt) {
      return res.status(404).json({ success: false, message: "Ye attempt nahi mila." });
    }

    // STEP 2: Test dhundo (question, options, correctOption, explanation)
    const test = await PreviousYearTest.findById(attempt.testId);

    if (!test) {
      return res.status(404).json({
        success: false,
        message: "Is attempt ka original test ab available nahi hai.",
      });
    }

    const questionMap = {};
    for (const subj of test.subjects) {
      for (const q of subj.questions) {
        questionMap[q._id.toString()] = q;
      }
    }

    // STEP 3: Har attempted question ko full detail ke sath merge karo
    const questionBreakdown = attempt.attemptedQuestions
      .map((aq) => {
        const qId = aq.questionId ? aq.questionId.toString() : null;
        const q = qId ? questionMap[qId] : null;
        if (!q) return null;

        return {
          questionId: q._id,
          question: q.question,
          options: {
            option1: q.option1,
            option2: q.option2,
            option3: q.option3,
            option4: q.option4,
          },
          correctOption: q.correctOption,
          userAnswer: aq.userAnswer,
          isCorrect: aq.isCorrect,
          answerExplain: q.answerExplain || null,
          topicName: q.topicName,
          subjectName: q.subjectName,
          timeTakenInSeconds: aq.timeTakenInSeconds,
        };
      })
      .filter(Boolean);

    return res.status(200).json({
      success: true,
      data: {
        attemptId: attempt._id,
        testId: test._id,
        examName: attempt.examName,
        testName: attempt.testName,
        year: attempt.year,
        overview: {
          totalScore: attempt.totalScore,
          correctCount: attempt.correctCount,
          wrongCount: attempt.wrongCount,
          unattemptedCount: attempt.unattemptedCount,
          totalTimeTakenInSeconds: attempt.totalTimeTakenInSeconds,
        },
        questionBreakdown,
      },
    });
  } catch (error) {
    console.error("getPreviousYearAttemptDetail error:", error);
    return res.status(500).json({
      success: false,
      message: "Attempt detail fetch karte waqt error aaya.",
      error: error.message,
    });
  }
};