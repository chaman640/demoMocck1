import CurrentAffairQuiz from "../models/CurrentAffairQuiz.js";
import { getTodayIST } from "../utils/dateHelpers.js";

export const addCurrentAffairQuiz = async (req, res) => {
  try {
    const { examName, date, questions } = req.body;

    if (!examName || !Array.isArray(questions) || questions.length === 0) {
      return res.status(400).json({
        success: false,
        message: "examName aur kam se kam ek question zaroori hai!",
      });
    }

    for (const q of questions) {
      if (!q.question || !q.option1 || !q.option2 || !q.option3 || !q.option4) {
        return res.status(400).json({
          success: false,
          message: "Har question mein sawaal aur chaaro options zaroori hain!",
        });
      }
      if (!q.correctOption || q.correctOption < 1 || q.correctOption > 4) {
        return res.status(400).json({
          success: false,
          message: "correctOption 1 se 4 ke beech hona chahiye!",
        });
      }
    }

    const finalDate = date || getTodayIST();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(finalDate)) {
      return res.status(400).json({
        success: false,
        message: "Date format 'YYYY-MM-DD' mein hona chahiye (e.g. 2026-07-16)!",
      });
    }

    const saved = await CurrentAffairQuiz.findOneAndUpdate(
      { examName, date: finalDate },
      { $set: { examName, date: finalDate, questions } },
      { new: true, upsert: true, runValidators: true }
    );

    return res.status(201).json({
      success: true,
      message: `'${finalDate}' ke liye '${examName}' quiz save ho gaya! (${questions.length} sawaal)`,
      data: saved,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Quiz save karte waqt error aaya.",
      error: error.message,
    });
  }
};