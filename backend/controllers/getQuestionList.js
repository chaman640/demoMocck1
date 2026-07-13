// controllers/getQuestionList.js
import { Question } from "../models/rowQuestionSchema.js";

// Ek exam + subject (+ optional topic) ke saare questions — poora detail,
// review karne ke liye (correctOption bhi shamil hai — isliye ye route admin-only hai)
export const getQuestionList = async (req, res) => {
  try {
    const { examName, subjectName, topicName } = req.params;

    if (!examName || !subjectName) {
      return res.status(400).json({
        success: false,
        message: "examName aur subjectName zaroori hain!",
      });
    }

    const filter = {
      examName: { $in: [examName] },
      subjectName,
    };

    // "all" ka matlab — topic se filter mat karo, poora subject dikhao
    if (topicName && topicName !== "all") {
      filter.topicName = topicName;
    }

    const questions = await Question.find(filter).sort({ topicName: 1, questionNumber: 1 });

    return res.status(200).json({
      success: true,
      totalQuestions: questions.length,
      data: questions,
    });
  } catch (error) {
    console.error("getQuestionList error:", error);
    return res.status(500).json({
      success: false,
      message: "Questions fetch karte waqt error aaya.",
      error: error.message,
    });
  }
};