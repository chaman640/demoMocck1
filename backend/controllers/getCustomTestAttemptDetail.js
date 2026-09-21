import mongoose from "mongoose";
import CustomTest from "../models/CustomTest.js";
import CustomTestAttempt from "../models/CustomTestAttempt.js";
import { getBatchAverageTimePerEmbeddedQuestion } from "../utils/classAnalytics.js";

export const getCustomTestAttemptDetail = async (req, res) => {
  try {
    const userId = req.user._id;
    const { attemptId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(attemptId)) {
      return res.status(400).json({ success: false, message: "Invalid Attempt ID" });
    }

    const attempt = await CustomTestAttempt.findOne({ _id: attemptId, userId });
    if (!attempt) {
      return res.status(404).json({ success: false, message: "Ye attempt nahi mila." });
    }

    const test = await CustomTest.findById(attempt.testId);
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

    const questionIds = attempt.attemptedQuestions.map((aq) => aq.questionId).filter(Boolean);
    const batchTimeMap = await getBatchAverageTimePerEmbeddedQuestion(CustomTestAttempt, test._id, questionIds);

    const questionBreakdown = attempt.attemptedQuestions
      .map((aq) => {
        const qId = aq.questionId ? aq.questionId.toString() : null;
        const q = qId ? questionMap[qId] : null;
        if (!q) return null;

        const batchTime = qId ? batchTimeMap[qId] : null;

        return {
          questionId: q._id,
          question: q.question,
          questionPhoto: q.questionPhoto || null,
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
          answerExplainWithPhoto: q.answerExplainWithPhoto || null,
          askedIn: q.askedIn || null,
          topicName: q.topicName,
          subjectName: q.subjectName,
          timeTakenInSeconds: aq.timeTakenInSeconds,
          batchAverageTimeSeconds: batchTime?.averageTimeSeconds ?? null,
          batchTimeSampleSize: batchTime?.sampleSize ?? 0,
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
    console.error("getCustomTestAttemptDetail error:", error);
    return res.status(500).json({
      success: false,
      message: "Attempt detail fetch karte waqt error aaya.",
      error: error.message,
    });
  }
};
