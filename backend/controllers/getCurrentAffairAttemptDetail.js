import CurrentAffairQuiz from "../models/CurrentAffairQuiz.js";
import CurrentAffairAttempt from "../models/CurrentAffairAttempt.js";

export const getCurrentAffairAttemptDetail = async (req, res) => {
  try {
    const userId = req.user._id;
    const { examName, date } = req.params;

    const [quiz, attempt] = await Promise.all([
      CurrentAffairQuiz.findOne({ examName, date }),
      CurrentAffairAttempt.findOne({ userId, examName, date }),
    ]);

    if (!quiz) return res.status(404).json({ success: false, message: "Quiz nahi mila." });
    if (!attempt) {
      return res.status(404).json({
        success: false,
        message: "Aapne abhi tak ye quiz attempt nahi kiya hai.",
      });
    }

    const questionMap = {};
    for (const q of quiz.questions) {
      questionMap[q._id.toString()] = q;
    }

    const questionBreakdown = attempt.attemptedQuestions
      .map((aq) => {
        const frozenQ = questionMap[aq.questionId.toString()];
        if (!frozenQ) return null;
        return {
          questionId: frozenQ._id,
          question: frozenQ.question,
          options: {
            option1: frozenQ.option1,
            option2: frozenQ.option2,
            option3: frozenQ.option3,
            option4: frozenQ.option4,
          },
          correctOption: frozenQ.correctOption,
          userAnswer: aq.userAnswer,
          isCorrect: aq.isCorrect,
          answerExplain: frozenQ.answerExplain || null,
        };
      })
      .filter(Boolean);

    return res.status(200).json({
      success: true,
      data: {
        examName,
        date,
        overview: {
          totalScore: attempt.totalScore,
          correctCount: attempt.correctCount,
          wrongCount: attempt.wrongCount,
          unattemptedCount: attempt.unattemptedCount,
        },
        questionBreakdown,
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Detail fetch karte waqt error aaya.",
      error: error.message,
    });
  }
};