// controllers/addQuestion.js  (ADMIN — global question pool)
import { Question } from "../models/rowQuestionSchema.js";

export const addQuestion = async (req, res) => {
  try {
    // 1️⃣ Single object ya array — dono support
    const questionsData = Array.isArray(req.body) ? req.body : [req.body];

    if (
      !questionsData ||
      questionsData.length === 0 ||
      !questionsData[0] ||
      Object.keys(questionsData[0]).length === 0
    ) {
      return res.status(400).json({
        success: false,
        message: "Blank data aa raha hai. Format check karein.",
      });
    }

    // ─────────────────────────────────────────────
    // 2️⃣ 🐛 FIX: save() se PEHLE poora batch validate karo.
    //
    // Purana code seedha loop mein `newQuestion.save()` karta tha. Agar 10 mein
    // se 7th question galat hota, to pehle 6 DB mein save ho chuke hote aur
    // request 500 error deti thi — aadha data DB mein, aadha nahi ("half-saved"
    // mess jise manually saaf karna padta tha).
    // Ab "sab ya koi nahi" — pehle validate, phir ek hi insertMany.
    // ─────────────────────────────────────────────
    const errors = [];
    const normalized = [];

    questionsData.forEach((q, idx) => {
      const n = idx + 1;

      if (!q.question || !q.option1 || !q.option2 || !q.option3 || !q.option4) {
        errors.push(`Question ${n}: question aur chaaro options zaroori hain.`);
        return;
      }
      const correctOpt = Number(q.correctOption);
      if (!correctOpt || correctOpt < 1 || correctOpt > 4) {
        errors.push(`Question ${n}: correctOption 1 se 4 ke beech hona chahiye.`);
        return;
      }
      if (!q.subjectName || !q.topicName) {
        errors.push(`Question ${n}: subjectName aur topicName zaroori hain.`);
        return;
      }
      if (!q.answerExplain) {
        errors.push(`Question ${n}: answerExplain zaroori hai (schema mein required hai).`);
        return;
      }

      // 🐛 FIX: examName schema mein array hai. Agar koi plain string bhej de
      // to mongoose usko cast to array kar deta hai, lekin `{ $in: [...] }`
      // wali queries confuse ho jati thi. Ab yahin normalize kar rahe hain.
      const examName = Array.isArray(q.examName)
        ? q.examName.filter(Boolean)
        : q.examName
        ? [q.examName]
        : [];
      if (examName.length === 0) {
        errors.push(`Question ${n}: examName (array) zaroori hai.`);
        return;
      }

      normalized.push({
        question: q.question,
        option1: q.option1,
        option2: q.option2,
        option3: q.option3,
        option4: q.option4,
        correctOption: correctOpt,
        answerExplain: q.answerExplain,
        subjectName: String(q.subjectName).trim(),
        topicName: String(q.topicName).trim(),
        examName,
        questionPhoto: q.questionPhoto || null,
        answerExplainWithPhoto: q.answerExplainWithPhoto || null,
      });
    });

    if (errors.length > 0) {
      return res.status(400).json({
        success: false,
        message: "Kuch questions mein validation errors hain — koi bhi save nahi hua:",
        errors,
      });
    }

    // ─────────────────────────────────────────────
    // 3️⃣ 🐛 FIX: questionNumber auto-numbering
    //
    // Purana code har question ke liye alag countDocuments() chalata tha.
    // Ek hi request mein same subject+topic ke 5 questions aate to
    // sabko SAME number mil jata tha (count abhi update nahi hua hota).
    // Ab per-request counter map rakh rahe hain.
    // ─────────────────────────────────────────────
    const counterMap = {};
    const docsToInsert = [];

    for (const q of normalized) {
      const key = `${q.examName.join("|")}|||${q.subjectName}|||${q.topicName}`;

      if (!(key in counterMap)) {
        const existingCount = await Question.countDocuments({
          examName: { $in: q.examName },
          subjectName: q.subjectName,
          topicName: q.topicName,
        });
        counterMap[key] = existingCount;
      }
      counterMap[key] += 1;

      docsToInsert.push({ ...q, questionNumber: counterMap[key] });
    }

    const savedQuestions = await Question.insertMany(docsToInsert);

    return res.status(201).json({
      success: true,
      message: `🎉 ${savedQuestions.length} Questions successfully saved!`,
      data: savedQuestions,
    });
  } catch (error) {
    console.error("addQuestion error:", error);
    return res.status(500).json({
      success: false,
      message: "❌ Question save karne mein error aaya",
      error: error.message,
    });
  }
};
