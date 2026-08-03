// controllers/addPreviousYearTest.js
// Admin isse poora previous year paper ek saath add karega.
import PreviousYearTest from "../models/PreviousYearTest.js";
import { normalizeSubject, subjectKey } from "../utils/subjectName.js";

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
        message: "examName, testName, year, durationMinutes aur subjects bharna zaroori hai!",
      });
    }

    if (!Array.isArray(subjects) || subjects.length === 0) {
      return res.status(400).json({
        success: false,
        message: "subjects mein kam se kam ek subject ka data hona chahiye!",
      });
    }

    // 2. Validate + normalize
    const seen = new Set();
    const finalSubjects = [];

    for (const subj of subjects) {
      const subjectName = normalizeSubject(subj.subjectName);

      if (!subjectName || !Array.isArray(subj.questions) || subj.questions.length === 0) {
        return res.status(400).json({
          success: false,
          message: `'${subj.subjectName || "Unknown"}' subject mein subjectName aur kam se kam ek question hona chahiye!`,
        });
      }

      // 🐛 FIX: same subject do baar aane par pehle chup-chaap 2 blocks ban jate the
      if (seen.has(subjectKey(subjectName))) {
        return res.status(400).json({
          success: false,
          message: `'${subjectName}' subject do baar aa gaya hai — ek subject sirf ek hi baar dein.`,
        });
      }
      seen.add(subjectKey(subjectName));

      const finalQuestions = [];
      let qNum = 1;

      for (const q of subj.questions) {
        if (!q.question || !q.option1 || !q.option2 || !q.option3 || !q.option4 || !q.correctOption) {
          return res.status(400).json({
            success: false,
            message: `'${subjectName}' subject ke ek question mein question/options/correctOption missing hai!`,
          });
        }
        const correctOpt = Number(q.correctOption);
        if (!correctOpt || correctOpt < 1 || correctOpt > 4) {
          return res.status(400).json({
            success: false,
            message: `'${subjectName}' subject ke ek question ka correctOption 1 se 4 ke beech hona chahiye!`,
          });
        }

        finalQuestions.push({
          question: q.question,
          questionPhoto: q.questionPhoto || null,
          option1: q.option1,
          option2: q.option2,
          option3: q.option3,
          option4: q.option4,
          correctOption: correctOpt,
          answerExplain: q.answerExplain || "",
          answerExplainWithPhoto: q.answerExplainWithPhoto || null,
          topicName: normalizeSubject(q.topicName) || "General",
          // 🐛 BUG FIX: PreviousYearTest model mein har question ka `subjectName`
          // REQUIRED hai. Pehle ye sirf tab set hota tha jab admin har question
          // ke andar khud subjectName likhta tha — bhool jaane par poora request
          // 500 error de deta tha ("Subject ka naam zaroori hai").
          // Ab parent subject block se apne aap bhar jata hai.
          subjectName,
          questionNumber: q.questionNumber ?? qNum,
        });
        qNum++;
      }

      finalSubjects.push({ subjectName, questions: finalQuestions });
    }

    // 3. Save — totalQuestions pre-save hook se auto-calculate hoga
    const newTest = new PreviousYearTest({
      examName: String(examName).trim(),
      testName: String(testName).trim(),
      year,
      description: description || "",
      marksPerQuestion: marksPerQuestion ?? 1,
      negativeMarking: negativeMarking ?? 0,
      durationMinutes,
      subjects: finalSubjects,
    });

    await newTest.save();

    return res.status(201).json({
      success: true,
      message: `'${newTest.testName}' successfully add ho gaya! (${newTest.totalQuestions} questions)`,
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
