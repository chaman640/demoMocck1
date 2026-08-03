// controllers/createCustomTest.js
// Main ya Sub Teacher — dono custom test bana sakte hain (spec point 4).
// MVP: koi shell/fill split nahi — poora test (sab subjects + questions)
// ek hi call mein banta hai. Access control PYQ-fill jaisa hi hai:
// har subject ke liye checkCouponAccess verify hota hai, "sab ya koi nahi".
import CustomTest from "../models/CustomTest.js";
import { checkCouponAccess } from "../utils/checkCouponAccess.js";

export const createCustomTest = async (req, res) => {
  try {
    const {
      couponId,
      testName,
      subjects,
      marksPerQuestion,
      negativeMarking,
      durationMinutes,
    } = req.body;

    // ─────────────────────────────────────────────
    // STEP 0: Validation
    // ─────────────────────────────────────────────
    if (!couponId || !testName || !Array.isArray(subjects) || subjects.length === 0) {
      return res.status(400).json({
        success: false,
        message: "couponId, testName aur kam se kam ek subject ka data zaroori hai!",
      });
    }
    if (!durationMinutes) {
      return res.status(400).json({
        success: false,
        message: "durationMinutes zaroori hai!",
      });
    }

    for (const subj of subjects) {
      if (!subj.subjectName || !Array.isArray(subj.questions) || subj.questions.length === 0) {
        return res.status(400).json({
          success: false,
          message: `'${subj.subjectName || "Unknown"}' subject mein subjectName aur kam se kam ek question hona zaroori hai!`,
        });
      }
    }

    // ─────────────────────────────────────────────
    // STEP 1: Access control — har subject ke liye alag-alag verify
    // karo. Main Teacher automatically pass (agar coupon uska hai),
    // Sub Teacher sirf apne authorized subjects ke liye.
    // ─────────────────────────────────────────────
    const uniqueSubjects = [...new Set(subjects.map((s) => s.subjectName))];
    let coupon = null;

    for (const subjectName of uniqueSubjects) {
      const { allowed, coupon: c, reason } = await checkCouponAccess(req.teacher, couponId, subjectName);
      if (!allowed) {
        return res.status(403).json({
          success: false,
          message: reason || `Aapko '${subjectName}' subject ka access nahi hai.`,
        });
      }
      coupon = c; // sabse aakhri call se coupon mil jayega, examName ke liye kaafi hai
    }

    // ─────────────────────────────────────────────
    // STEP 2: Har question validate karo save() se PEHLE — "sab ya koi nahi"
    // ─────────────────────────────────────────────
    const validationErrors = [];
    subjects.forEach((subj) => {
      subj.questions.forEach((q, idx) => {
        if (!q.question || !q.option1 || !q.option2 || !q.option3 || !q.option4) {
          validationErrors.push(
            `'${subj.subjectName}' Question ${idx + 1}: sabhi options aur question text zaroori hain.`
          );
          return;
        }
        const correctOpt = Number(q.correctOption);
        if (!correctOpt || correctOpt < 1 || correctOpt > 4) {
          validationErrors.push(
            `'${subj.subjectName}' Question ${idx + 1}: correctOption 1 se 4 ke beech hona chahiye.`
          );
        }
      });
    });

    if (validationErrors.length > 0) {
      return res.status(400).json({
        success: false,
        message: "Kuch questions mein validation errors hain, test save nahi hua:",
        errors: validationErrors,
      });
    }

    // ─────────────────────────────────────────────
    // STEP 3: subjects array ko model-shape mein normalize karo
    // ─────────────────────────────────────────────
    const finalSubjects = subjects.map((subj) => ({
      subjectName: subj.subjectName,
      questions: subj.questions.map((q) => ({
        question: q.question,
        questionPhoto: q.questionPhoto || null,
        option1: q.option1,
        option2: q.option2,
        option3: q.option3,
        option4: q.option4,
        correctOption: Number(q.correctOption),
        answerExplain: q.answerExplain || "",
        topicName: q.topicName || "General",
        subjectName: subj.subjectName,
      })),
    }));

    // ─────────────────────────────────────────────
    // STEP 4: Save — examName coupon se derive (client se nahi lete,
    // taaki galat exam ka test galat coupon mein kabhi na ja sake)
    // ─────────────────────────────────────────────
    const newTest = new CustomTest({
      testName: testName.trim(),
      examName: coupon.exam,
      couponId: coupon._id,
      createdBy: req.teacher._id,
      subjects: finalSubjects,
      marksPerQuestion: marksPerQuestion ?? 1,
      negativeMarking: negativeMarking ?? 0,
      durationMinutes,
    });

    await newTest.save();

    return res.status(201).json({
      success: true,
      message: `'${testName}' successfully ban gaya! (${newTest.totalQuestions} questions)`,
      data: newTest,
    });
  } catch (error) {
    console.error("createCustomTest error:", error);
    return res.status(500).json({
      success: false,
      message: "Server mein error aa gaya custom test banate waqt.",
      error: error.message,
    });
  }
};