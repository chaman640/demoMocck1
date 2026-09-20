import CurrentAffair from "../models/CurrentAffair.js";
import CurrentAffairQuiz from "../models/CurrentAffairQuiz.js";
import CurrentAffairAttempt from "../models/CurrentAffairAttempt.js";
import User from "../models/User.js";
import { getTodayIST } from "../utils/dateHelpers.js";

// GET /current-affair/:examName  ya  /current-affair/:examName/:date
// date na diya ho to aaj (IST) dhundta hai; agar aaj ka publish nahi hua
// to sabse latest available date de deta hai — taaki khali screen na dikhe
//
// 🆕 CHANGE — ab Admin ka GLOBAL entry (coupon: null) aur student ke apne
// batch ka TEACHER-added entry (coupon: activeCoupon) — dono ke items ek
// saath jodkar dikhaye jaate hain. Agar student kisi batch mein nahi hai,
// sirf global hi dikhta hai (jaisa pehle tha).
export const getCurrentAffair = async (req, res) => {
  try {
    const { examName } = req.params;
    const requestedDate = req.params.date;
    const userId = req.user._id;

    const user = await User.findById(userId).select("activeCoupon exam");

    let dateToUse = requestedDate;
    let globalAffair = null;

    if (dateToUse) {
      globalAffair = await CurrentAffair.findOne({ examName, date: dateToUse, coupon: null });
    } else {
      const today = getTodayIST();
      globalAffair = await CurrentAffair.findOne({ examName, date: today, coupon: null });
      if (globalAffair) {
        dateToUse = today;
      } else {
        globalAffair = await CurrentAffair.findOne({ examName, coupon: null }).sort({ date: -1 });
        dateToUse = globalAffair?.date;
      }
    }

    // 🆕 Isi date ka batch-specific (teacher-added) entry bhi dhoondo —
    // sirf tab jab student kisi batch mein ho
    let batchAffair = null;
    if (user?.activeCoupon && dateToUse) {
      batchAffair = await CurrentAffair.findOne({ examName, date: dateToUse, coupon: user.activeCoupon });
    }

    // 🆕 DIAGNOSTIC LOGGING — agar kuch bhi nahi mila, Render Logs mein
    // exact wajah print karo (examName mismatch sabse common cause hai —
    // bilkul waisa hi jaisa Question Bank mein "UPSSSC" vs "UPSSSC PET"
    // wala tha).
    if (!globalAffair && !batchAffair) {
      const anyForThisExamAnyDate = await CurrentAffair.countDocuments({ examName });
      const allExamNamesInDB = await CurrentAffair.distinct("examName");
      console.log(`🔍 [CURRENT-AFFAIR-DEBUG] Student ka exam field: "${user?.exam}" — request kiya examName: "${examName}"`);
      console.log(`   → Is exact examName ke liye DB mein kahin bhi (kisi bhi date ka) entry: ${anyForThisExamAnyDate}`);
      console.log(`   → DB mein current-affairs jin examName ke liye maujood hain: ${JSON.stringify(allExamNamesInDB)}`);
      if (anyForThisExamAnyDate === 0 && allExamNamesInDB.length > 0) {
        console.log(`   ⚠️ examName mismatch ho sakta hai! Upar wali list mein se koi "${examName}" se milta-julta (lekin exact match nahi) naam dhoondein.`);
      }
    }

    if (!globalAffair && !batchAffair) {
      return res.status(200).json({ success: true, available: false, data: null });
    }

    // Dono ke items jodo — batch wale pehle (teacher ne khaas apne
    // students ke liye daala hai, isliye zyada relevant), phir global
    const combinedItems = [
      ...(batchAffair?.items || []),
      ...(globalAffair?.items || []),
    ];

    const finalDate = globalAffair?.date || batchAffair?.date;

    const [quiz, attempt] = await Promise.all([
      CurrentAffairQuiz.findOne({ examName, date: finalDate }).select("_id questions"),
      CurrentAffairAttempt.findOne({ userId, examName, date: finalDate }),
    ]);

    return res.status(200).json({
      success: true,
      available: true,
      data: {
        examName,
        date: finalDate,
        title: globalAffair?.title || batchAffair?.title,
        items: combinedItems,
        hasBatchContent: !!batchAffair, // 🆕 frontend chahe to "aapke batch se" badge dikha sakta hai
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
// (Ye sirf GLOBAL dates dikhata hai — batch-wise history filhaal
// scope se bahar hai, taaki simple rahe)
export const getCurrentAffairDates = async (req, res) => {
  try {
    const { examName } = req.params;
    const userId = req.user._id;

    const affairs = await CurrentAffair.find({ examName, coupon: null })
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
