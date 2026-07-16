import CurrentAffair from "../models/CurrentAffair.js";
import CurrentAffairQuiz from "../models/CurrentAffairQuiz.js";
import CurrentAffairAttempt from "../models/CurrentAffairAttempt.js";
import { getTodayIST } from "../utils/dateHelpers.js";

// GET /current-affair/:examName  ya  /current-affair/:examName/:date
// date na diya ho to aaj (IST) dhundta hai; agar aaj ka publish nahi hua
// to sabse latest available date de deta hai — taaki khali screen na dikhe
export const getCurrentAffair = async (req, res) => {
  try {
    const { examName } = req.params;
    const requestedDate = req.params.date;
    const userId = req.user._id;

    let affair;

    if (requestedDate) {
      affair = await CurrentAffair.findOne({ examName, date: requestedDate });
    } else {
      const today = getTodayIST();
      affair = await CurrentAffair.findOne({ examName, date: today });
      if (!affair) {
        affair = await CurrentAffair.findOne({ examName }).sort({ date: -1 });
      }
    }

    if (!affair) {
      return res.status(200).json({ success: true, available: false, data: null });
    }

    const [quiz, attempt] = await Promise.all([
      CurrentAffairQuiz.findOne({ examName, date: affair.date }).select("_id questions"),
      CurrentAffairAttempt.findOne({ userId, examName, date: affair.date }),
    ]);

    return res.status(200).json({
      success: true,
      available: true,
      data: {
        examName: affair.examName,
        date: affair.date,
        title: affair.title,
        items: affair.items,
        quizAvailable: !!quiz,
        totalQuizQuestions: quiz ? quiz.questions.length : 0,
        alreadyAttempted: !!attempt,
        attemptSummary: attempt
          ? {
              totalScore: attempt.totalScore,
              correctCount: attempt.correctCount,
              wrongCount: attempt.wrongCount,
              unattemptedCount: attempt.unattemptedCount,
            }
          : null,
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Current affairs fetch karte waqt error aaya.",
      error: error.message,
    });
  }
};

// GET /current-affair/:examName/dates — history list ke liye
export const getCurrentAffairDates = async (req, res) => {
  try {
    const { examName } = req.params;
    const userId = req.user._id;

    const affairs = await CurrentAffair.find({ examName })
      .select("date title items")
      .sort({ date: -1 })
      .limit(60);

    const attempts = await CurrentAffairAttempt.find({
      userId,
      examName,
      date: { $in: affairs.map((a) => a.date) },
    }).select("date totalScore");

    const attemptMap = {};
    attempts.forEach((a) => { attemptMap[a.date] = a.totalScore; });

    return res.status(200).json({
      success: true,
      data: affairs.map((a) => ({
        date: a.date,
        title: a.title,
        itemCount: a.items.length,
        attempted: a.date in attemptMap,
        score: attemptMap[a.date] ?? null,
      })),
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Dates list fetch karte waqt error aaya.",
      error: error.message,
    });
  }
};