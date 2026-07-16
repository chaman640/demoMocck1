import CurrentAffairQuiz from "../models/CurrentAffairQuiz.js";
import CurrentAffairAttempt from "../models/CurrentAffairAttempt.js";

export const submitCurrentAffairQuiz = async (req, res) => {
  try {
    const userId = req.user._id;
    const { examName, date } = req.params;
    const { attemptedQuestions } = req.body;

    if (!Array.isArray(attemptedQuestions) || attemptedQuestions.length === 0) {
      return res.status(400).json({
        success: false,
        message: "attemptedQuestions mein kam se kam ek question hona chahiye!",
      });
    }

    const quiz = await CurrentAffairQuiz.findOne({ examName, date });
    if (!quiz) {
      return res.status(404).json({ success: false, message: "Is din ka quiz nahi mila." });
    }

    const existing = await CurrentAffairAttempt.findOne({ userId, examName, date });
    if (existing) {
      return res.status(409).json({
        success: false,
        message: "Aap is din ka quiz pehle hi de chuke hain!",
      });
    }

    const questionMap = {};
    for (const q of quiz.questions) {
      questionMap[q._id.toString()] = q;
    }

    let correctCount = 0, wrongCount = 0, unattemptedCount = 0;
    const finalAttemptedQuestions = [];

    for (const aq of attemptedQuestions) {
      const qId = aq.questionId ? aq.questionId.toString() : null;
      const frozenQ = qId ? questionMap[qId] : null;
      if (!frozenQ) continue; // is quiz ka sawaal nahi — skip

      const userAnswer =
        aq.userAnswer !== undefined && aq.userAnswer !== null && aq.userAnswer !== ""
          ? String(aq.userAnswer)
          : null;

      const isCorrect = userAnswer === null ? null : userAnswer === String(frozenQ.correctOption);

      if (isCorrect === true) correctCount++;
      else if (isCorrect === false) wrongCount++;
      else unattemptedCount++;

      finalAttemptedQuestions.push({ questionId: frozenQ._id, userAnswer, isCorrect });
    }

    if (finalAttemptedQuestions.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Koi valid question match nahi hua is quiz ke sath.",
      });
    }

    // Sirf +1 per correct — koi negative marking nahi.
    // Ye learning/understanding quiz hai, exam simulation nahi, isliye galat guess ki punishment nahi.
    const totalScore = correctCount;

    const newAttempt = new CurrentAffairAttempt({
      userId,
      examName,
      date,
      attemptedQuestions: finalAttemptedQuestions,
      totalScore,
      correctCount,
      wrongCount,
      unattemptedCount,
    });

    await newAttempt.save();

    return res.status(201).json({
      success: true,
      message: "Quiz submit ho gaya!",
      data: { totalScore, correctCount, wrongCount, unattemptedCount },
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "Aap is din ka quiz pehle hi de chuke hain!",
      });
    }
    console.error("submitCurrentAffairQuiz error:", error);
    return res.status(500).json({
      success: false,
      message: "Server mein error aa gaya quiz submit karte waqt.",
      error: error.message,
    });
  }
};