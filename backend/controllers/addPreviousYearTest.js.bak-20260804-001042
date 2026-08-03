// controllers/addPreviousYearTest.js
// Admin isse poora previous year paper ek saath add karega —
// har question ka text, options, correct option, explanation sab manually.
import PreviousYearTest from "../models/PreviousYearTest.js";

export const addPreviousYearTest = async (req, res) => {
  try {
    const {
      examName,
      testName,
      year,
      description,
      marksPerQuestion,
      negativeMarking,
      durationMinutes,
      subjects,
    } = req.body;

    // 1. Basic validation
    if (!examName || !testName || !year || !durationMinutes || !subjects) {
      return res.status(400).json({
        success: false,
        message:
          "examName, testName, year, durationMinutes aur subjects bharna zaroori hai!",
      });
    }

    if (!Array.isArray(subjects) || subjects.length === 0) {
      return res.status(400).json({
        success: false,
        message: "subjects mein kam se kam ek subject ka data hona chahiye!",
      });
    }

    // 2. Har subject + har question sahi format mein ho, check karo
    for (const subj of subjects) {
      if (!subj.subjectName || !Array.isArray(subj.questions) || subj.questions.length === 0) {
        return res.status(400).json({
          success: false,
          message: `'${subj.subjectName || "Unknown"}' subject mein subjectName aur kam se kam ek question hona chahiye!`,
        });
      }

      for (const q of subj.questions) {
        if (!q.question || !q.option1 || !q.option2 || !q.option3 || !q.option4 || !q.correctOption) {
          return res.status(400).json({
            success: false,
            message: `'${subj.subjectName}' subject ke ek question mein question/options/correctOption missing hai!`,
          });
        }
        if (q.correctOption < 1 || q.correctOption > 4) {
          return res.status(400).json({
            success: false,
            message: `'${subj.subjectName}' subject ke ek question ka correctOption 1 se 4 ke beech hona chahiye!`,
          });
        }
      }
    }

    // 3. Naya document banao — totalQuestions pre-save hook se auto-calculate hoga
    const newTest = new PreviousYearTest({
      examName,
      testName,
      year,
      description: description || "",
      marksPerQuestion: marksPerQuestion ?? 1,
      negativeMarking: negativeMarking ?? 0,
      durationMinutes,
      subjects,
    });

    await newTest.save();

    return res.status(201).json({
      success: true,
      message: `'${testName}' successfully add ho gaya! (${newTest.totalQuestions} questions)`,
      data: newTest,
    });
  } catch (error) {
    console.error("addPreviousYearTest error:", error);
    return res.status(500).json({
      success: false,
      message: "Server mein error aa gaya Previous Year Test save karte waqt.",
      error: error.message,
    });
  }
};