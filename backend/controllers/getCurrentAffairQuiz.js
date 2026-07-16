import CurrentAffairQuiz from "../models/CurrentAffairQuiz.js";
import CurrentAffairAttempt from "../models/CurrentAffairAttempt.js";

export const getCurrentAffairQuiz = async (req, res) => {
  try {
    const { examName, date } = req.params;
    const userId = req.user._id;

    const quiz = await CurrentAffairQuiz.findOne({ examName, date });
    if (!quiz) {
      return res.status(404).json({ success: false, message: "Is din ka quiz abhi available nahi hai." });
    }

    const existingAttempt = await CurrentAffairAttempt.findOne({ userId, examName, date });

    const safeQuestions = quiz.questions.map((q) => ({
      _id: q._id,
      question: q.question,
      option1: q.option1,
      option2: q.option2,
      option3: q.option3,
      option4: q.option4,
    }));

    return res.status(200).json({
      success: true,
      data: {
        examName,
        date,
        totalQuestions: safeQuestions.length,
        questions: safeQuestions,
        alreadyAttempted: !!existingAttempt,
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Quiz fetch karte waqt error aaya.",
      error: error.message,
    });
  }
};