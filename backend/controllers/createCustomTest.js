// controllers/createCustomTest.js
// Main ya Sub Teacher — dono custom test bana sakte hain.
import CustomTest from "../models/CustomTest.js";
import { checkCouponAccess } from "../utils/checkCouponAccess.js";
import {
  normalizeSubject,
  subjectKey,
  getKnownSubjects,
  canonicalizeSubject,
} from "../utils/subjectName.js";

export const createCustomTest = async (req, res) => {
  try {
    const { couponId, testName, subjects, marksPerQuestion, negativeMarking, durationMinutes } =
      req.body;

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
      return res.status(400).json({ success: false, message: "durationMinutes zaroori hai!" });
    }

    for (const subj of subjects) {
      if (!normalizeSubject(subj.subjectName) || !Array.isArray(subj.questions) || subj.questions.length === 0) {
        return res.status(400).json({
          success: false,
          message: `'${subj.subjectName || "Unknown"}' subject mein subjectName aur kam se kam ek question hona zaroori hai!`,
        });
      }
    }

    // ─────────────────────────────────────────────
    // STEP 1: 🐛 SUBJECT SPELLING FIX — pehle subjectName jaisa likha tha
    // waisa hi save ho jata tha. Ab normalize + batch ki "sahi" spelling.
    //
    // Saath hi: ek hi test me "Maths" aur "maths" do alag subject blocks ban
    // sakte the (student ko do tabs dikhte the). Ab wo merge ho jate hain.
    // ─────────────────────────────────────────────
    let coupon = null;
    const firstCheck = await checkCouponAccess(req.teacher, couponId, null);
    if (!firstCheck.allowed) {
      return res.status(403).json({ success: false, message: firstCheck.reason || "Access denied." });
    }
    coupon = firstCheck.coupon;

    const known = await getKnownSubjects(coupon._id, coupon.exam);

    // Subject blocks ko canonical naam ke hisaab se merge karo
    const mergedBySubject = new Map(); // canonicalName -> questions[]
    const notInBlueprint = [];

    for (const subj of subjects) {
      const { canonical, inBlueprint } = canonicalizeSubject(subj.subjectName, known);
      if (!inBlueprint && !notInBlueprint.includes(canonical)) notInBlueprint.push(canonical);

      if (!mergedBySubject.has(canonical)) mergedBySubject.set(canonical, []);
      mergedBySubject.get(canonical).push(...subj.questions);
    }

    // ─────────────────────────────────────────────
    // STEP 2: Access control — har (canonical) subject ke liye alag verify.
    // Main Teacher automatically pass, Sub Teacher sirf authorized subjects.
    // ─────────────────────────────────────────────
    const canonicalSubjects = [...mergedBySubject.keys()];
    const finalNameBySubject = {};

    for (const subjectName of canonicalSubjects) {
      const { allowed, reason, subject: authorizedSpelling } = await checkCouponAccess(
        req.teacher,
        couponId,
        subjectName
      );
      if (!allowed) {
        return res.status(403).json({
          success: false,
          message: reason || `Aapko '${subjectName}' subject ka access nahi hai.`,
        });
      }
      // Sub-teacher ke access record wali spelling ko priority do
      finalNameBySubject[subjectName] =
        req.teacher.role === "sub" && authorizedSpelling ? authorizedSpelling : subjectName;
    }

    // ─────────────────────────────────────────────
    // STEP 3: Har question validate karo save() se PEHLE — "sab ya koi nahi"
    // ─────────────────────────────────────────────
    const validationErrors = [];
    for (const [subjName, qs] of mergedBySubject.entries()) {
      qs.forEach((q, idx) => {
        if (!q.question || !q.option1 || !q.option2 || !q.option3 || !q.option4) {
          validationErrors.push(`'${subjName}' Question ${idx + 1}: sabhi options aur question text zaroori hain.`);
          return;
        }
        const correctOpt = Number(q.correctOption);
        if (!correctOpt || correctOpt < 1 || correctOpt > 4) {
          validationErrors.push(`'${subjName}' Question ${idx + 1}: correctOption 1 se 4 ke beech hona chahiye.`);
        }
      });
    }

    if (validationErrors.length > 0) {
      return res.status(400).json({
        success: false,
        message: "Kuch questions mein validation errors hain, test save nahi hua:",
        errors: validationErrors,
      });
    }

    // ─────────────────────────────────────────────
    // STEP 4: model-shape mein normalize
    // ─────────────────────────────────────────────
    const finalSubjects = [...mergedBySubject.entries()].map(([subjName, qs]) => {
      const finalName = finalNameBySubject[subjName] || subjName;
      return {
        subjectName: finalName,
        questions: qs.map((q) => ({
          question: q.question,
          questionPhoto: q.questionPhoto || null,
          option1: q.option1,
          option2: q.option2,
          option3: q.option3,
          option4: q.option4,
          correctOption: Number(q.correctOption),
          answerExplain: q.answerExplain || "",
          topicName: normalizeSubject(q.topicName) || "General",
          subjectName: finalName,
        })),
      };
    });

    // ─────────────────────────────────────────────
    // STEP 5: Save — examName coupon se derive
    // ─────────────────────────────────────────────
    const newTest = new CustomTest({
      testName: String(testName).trim(),
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
      message: `'${newTest.testName}' successfully ban gaya! (${newTest.totalQuestions} questions)`,
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
