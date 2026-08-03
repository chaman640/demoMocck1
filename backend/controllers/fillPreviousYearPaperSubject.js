// controllers/fillPreviousYearPaperSubject.js
// Sub-Teacher (ya Main Teacher) apne assigned subject ka quota is
// paper-shell mein fill karta hai. Ek hi call mein "sab ya koi nahi" —
// agar koi bhi question invalid hai ya quota se zyada hai, poora batch reject.
import mongoose from "mongoose";
import PreviousYearTest from "../models/PreviousYearTest.js";
import { checkCouponAccess } from "../utils/checkCouponAccess.js";

export const fillPreviousYearPaperSubject = async (req, res) => {
  try {
    const { paperId } = req.params;
    const { subjectName, questions } = req.body;

    // ─────────────────────────────────────────────
    // STEP 0: Basic validation
    // ─────────────────────────────────────────────
    if (!mongoose.Types.ObjectId.isValid(paperId)) {
      return res.status(400).json({ success: false, message: "Invalid paperId." });
    }
    if (!subjectName) {
      return res.status(400).json({ success: false, message: "subjectName zaroori hai!" });
    }
    if (!Array.isArray(questions) || questions.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Kam se kam ek question dena zaroori hai.",
      });
    }

    // ─────────────────────────────────────────────
    // STEP 1: Paper dhundo — sirf teacher-created shell papers fill
    // ho sakte hain (couponId null matlab global/admin paper, wo yahan
    // se nahi chhera ja sakta)
    // ─────────────────────────────────────────────
    const paper = await PreviousYearTest.findById(paperId);
    if (!paper) {
      return res.status(404).json({ success: false, message: "Ye paper nahi mila." });
    }
    if (!paper.couponId) {
      return res.status(400).json({
        success: false,
        message: "Ye ek global paper hai, isme is tarah fill nahi kiya ja sakta.",
      });
    }

    // ─────────────────────────────────────────────
    // STEP 2: Access control — is teacher ka is coupon + subject ke
    // liye authorization (Main Teacher automatically pass ho jayega)
    // ─────────────────────────────────────────────
    const { allowed, reason } = await checkCouponAccess(req.teacher, paper.couponId, subjectName);
    if (!allowed) {
      return res.status(403).json({
        success: false,
        message: reason || "Aapko is subject ka access nahi hai.",
      });
    }

    // ─────────────────────────────────────────────
    // STEP 3: Blueprint mein ye subject hona chahiye, aur uska
    // subjects[] block bhi (shell banate waqt pre-populate hota hai)
    // ─────────────────────────────────────────────
    const blueprintEntry = paper.blueprint.find((b) => b.subjectName === subjectName);
    if (!blueprintEntry) {
      return res.status(400).json({
        success: false,
        message: `'${subjectName}' is paper ke blueprint mein hai hi nahi.`,
      });
    }

    const subjectBlock = paper.subjects.find((s) => s.subjectName === subjectName);
    if (!subjectBlock) {
      return res.status(404).json({
        success: false,
        message: "Subject block paper mein nahi mila (data inconsistency).",
      });
    }

    if (subjectBlock.filled) {
      return res.status(400).json({
        success: false,
        message: `'${subjectName}' ka quota pehle hi poora ho chuka hai.`,
      });
    }

    // ─────────────────────────────────────────────
    // STEP 4: Har question validate karo save() se PEHLE
    // ─────────────────────────────────────────────
    const validationErrors = [];
    questions.forEach((q, idx) => {
      if (!q.question || !q.option1 || !q.option2 || !q.option3 || !q.option4) {
        validationErrors.push(`Question ${idx + 1}: sabhi options aur question text zaroori hain.`);
        return;
      }
      const correctOpt = Number(q.correctOption);
      if (!correctOpt || correctOpt < 1 || correctOpt > 4) {
        validationErrors.push(`Question ${idx + 1}: correctOption 1 se 4 ke beech hona chahiye.`);
      }
    });

    if (validationErrors.length > 0) {
      return res.status(400).json({
        success: false,
        message: "Kuch questions mein validation errors hain, koi bhi save nahi hua:",
        errors: validationErrors,
      });
    }

    // ─────────────────────────────────────────────
    // STEP 5: Quota se zyada questions na aane paayein
    // ─────────────────────────────────────────────
    const remainingSlots = blueprintEntry.questionCount - subjectBlock.questions.length;
    if (questions.length > remainingSlots) {
      return res.status(400).json({
        success: false,
        message: `Sirf ${remainingSlots} aur question(s) add kar sakte hain '${subjectName}' ke liye (quota: ${blueprintEntry.questionCount}, already filled: ${subjectBlock.questions.length}).`,
      });
    }

    // ─────────────────────────────────────────────
    // STEP 6: questionNumber auto-numbering — isi subject-block ke
    // andar sequential
    // ─────────────────────────────────────────────
    let nextNumber = subjectBlock.questions.length + 1;

    const newQuestions = questions.map((q) => ({
      question: q.question,
      questionPhoto: q.questionPhoto || null,
      option1: q.option1,
      option2: q.option2,
      option3: q.option3,
      option4: q.option4,
      correctOption: Number(q.correctOption),
      answerExplain: q.answerExplain || "",
      answerExplainWithPhoto: q.answerExplainWithPhoto || null,
      topicName: q.topicName || "General",
      questionNumber: nextNumber++,
    }));

    subjectBlock.questions.push(...newQuestions);

    // Save hote hi pre-save hook khud subjectBlock.filled aur paper.status
    // (draft/complete) calculate kar dega — humein manually kuch set nahi karna
    await paper.save();

    return res.status(200).json({
      success: true,
      message: `'${subjectName}' mein ${newQuestions.length} question(s) add ho gaye! (${subjectBlock.questions.length}/${blueprintEntry.questionCount})`,
      data: {
        paperId: paper._id,
        subjectName,
        filled: subjectBlock.filled,
        paperStatus: paper.status,
        currentCount: subjectBlock.questions.length,
        requiredCount: blueprintEntry.questionCount,
      },
    });
  } catch (error) {
    console.error("fillPreviousYearPaperSubject error:", error);
    return res.status(500).json({
      success: false,
      message: "Server mein error aa gaya subject fill karte waqt.",
      error: error.message,
    });
  }
};