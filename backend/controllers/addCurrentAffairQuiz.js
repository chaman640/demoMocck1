import CurrentAffairQuiz from "../models/CurrentAffairQuiz.js";
import { getTodayIST } from "../utils/dateHelpers.js";

export const addCurrentAffairQuiz = async (req, res) => {
  try {
    const { examName, date, questions } = req.body;

    if (!examName || !Array.isArray(questions) || questions.length === 0) {
      return res.status(400).json({
        success: false,
        message: "examName and at least one question are required!",
      });
    }

    for (const q of questions) {
      if (!q.question || !q.option1 || !q.option2 || !q.option3 || !q.option4) {
        return res.status(400).json({
          success: false,
          message: "Every question needs the question text and all four options!",
        });
      }
      if (!q.correctOption || q.correctOption < 1 || q.correctOption > 4) {
        return res.status(400).json({
          success: false,
          message: "correctOption must be between 1 and 4!",
        });
      }
    }

    const finalDate = date || getTodayIST();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(finalDate)) {
      return res.status(400).json({
        success: false,
        message: "Date must be in 'YYYY-MM-DD' format (e.g. 2026-07-16)!",
      });
    }

    const saved = await CurrentAffairQuiz.findOneAndUpdate(
      { examName, date: finalDate },
      { $set: { examName, date: finalDate, questions } },
      { new: true, upsert: true, runValidators: true }
    );

    return res.status(201).json({
      success: true,
      message: `'${examName}' quiz saved for '${finalDate}'! (${questions.length} questions)`,
      data: saved,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Error while saving the quiz.",
      error: error.message,
    });
  }
};