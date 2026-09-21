import CurrentAffair from "../models/CurrentAffair.js";
import CurrentAffairQuiz from "../models/CurrentAffairQuiz.js";
import CurrentAffairAttempt from "../models/CurrentAffairAttempt.js";
import User from "../models/User.js";
import { getTodayIST } from "../utils/dateHelpers.js";

// GET /current-affair/:examName  ya  /current-affair/:examName/:date
//
// 🐛 FIX (Sept 2026): Pehle is function mein date resolve karne ka logic
// aisa tha ki agar Admin ne KABHI bhi is exam ke liye koi GLOBAL current
// affair nahi daala tha, to `dateToUse` hamesha `undefined` reh jaata tha.
// Us wajah se neeche wala check —
//     if (user?.activeCoupon && dateToUse) { ... batchAffair dhoondo ... }
// — kabhi chalता hi nahi tha, chahe Teacher ne apne batch ke liye current
// affair theek se save kyun na kiya ho. Isi wajah se:
//   • Teacher side se "save ho gaya" dikhta tha (DB mein save ho bhi raha tha)
//   • Student side par wo kabhi dikhta nahi tha (ye function use fetch hi
//     nahi kar pata tha, kyunki dateToUse set hi nahi hota tha)
//
// FIX: ab hum pehle "aaj ki date" (ya jo date request ki gayi ho) FIX kar
// lete hain, aur global + batch dono ko usi date ke against dhoondte hain —
// bhale hi global na mile. Latest-fallback sirf tab chalta hai jab koi bhi
// specific date request nahi ki gayi thi aur aaj ke liye kuch nahi mila.
export const getCurrentAffair = async (req, res) => {
  try {
    const { examName } = req.params;
    const requestedDate = req.params.date;
    const userId = req.user._id;

    const user = await User.findById(userId).select("activeCoupon exam");

    // Step 1: Date fix karo — ya to jo request ki gayi ho, ya aaj (IST).
    // Pehle ye sirf tab set hota tha jab Admin ka global entry mil jaata —
    // ab hamesha ek valid date set hoti hai, taaki batch-check kabhi skip na ho.
    let dateToUse = requestedDate || getTodayIST();

    let globalAffair = await CurrentAffair.findOne({ examName, date: dateToUse, coupon: null });
    let batchAffair = user?.activeCoupon
      ? await CurrentAffair.findOne({ examName, date: dateToUse, coupon: user.activeCoupon })
      : null;

    // Step 2: Agar aaj/requested date ke liye kuch bhi (na global na batch)
    // nahi mila, aur user ne khud koi specific date maangi nahi thi, to
    // sabse latest GLOBAL date par fallback karo — aur wahan bhi batch check
    // dobara karo (pehle ye missing tha).
    if (!requestedDate && !globalAffair && !batchAffair) {
      const latestGlobal = await CurrentAffair.findOne({ examName, coupon: null }).sort({ date: -1 });
      if (latestGlobal) {
        dateToUse = latestGlobal.date;
        globalAffair = latestGlobal;
        batchAffair = user?.activeCoupon
          ? await CurrentAffair.findOne({ examName, date: dateToUse, coupon: user.activeCoupon })
          : null;
      }
    }

    // 🆕 DIAGNOSTIC LOGGING — agar kuch bhi nahi mila, Render Logs mein
    // exact wajah print karo (examName mismatch sabse common cause hai).
    if (!globalAffair && !batchAffair) {
      const anyForThisExamAnyDate = await CurrentAffair.countDocuments({ examName });
      const allExamNamesInDB = await CurrentAffair.distinct("examName");
      console.log(`🔍 [CURRENT-AFFAIR-DEBUG] Student ka exam field: "${user?.exam}" — request kiya examName: "${examName}"`);
      console.log(`   → Is exact examName ke liye DB mein kahin bhi (kisi bhi date ka) entry: ${anyForThisExamAnyDate}`);
      console.log(`   → DB mein current-affairs jin examName ke liye maujood hain: ${JSON.stringify(allExamNamesInDB)}`);
      if (anyForThisExamAnyDate === 0 && allExamNamesInDB.length > 0) {
        console.log(`   ⚠️ examName mismatch ho sakta hai! Upar wali list mein se koi "${examName}" se milta-julta (lekin exact match nahi) naam dhoondein.`);
      }

      return res.status(200).json({ success: true, available: false, data: null });
    }

    // Dono ke items jodo — batch wale pehle (teacher ne khaas apne
    // students ke liye daala hai, isliye zyada relevant), phir global.
    const combinedItems = [
      ...(batchAffair?.items || []),
      ...(globalAffair?.items || []),
    ];

    const finalDate = dateToUse;

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
        hasBatchContent: !!batchAffair, // frontend chahe to "aapke batch se" badge dikha sakta hai
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
// scope se bahar hai, taaki simple rahe) — is function mein koi change nahi.
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
