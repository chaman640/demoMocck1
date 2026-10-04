// controllers/fillPreviousYearPaperSubject.js
// Sub-Teacher (ya Main Teacher) apne assigned subject ka quota is
// paper-shell mein fill karta hai. "Sab ya koi nahi" — koi bhi question
// invalid ho ya quota se zyada ho to poora batch reject.
import mongoose from "mongoose";
import PreviousYearTest from "../models/PreviousYearTest.js";
import { checkCouponAccess } from "../utils/checkCouponAccess.js";
import { normalizeSubject, sameSubject } from "../utils/subjectName.js";

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
    if (!normalizeSubject(subjectName)) {
      return res.status(400).json({ success: false, message: "subjectName is required!" });
    }
    if (!Array.isArray(questions) || questions.length === 0) {
      return res.status(400).json({ success: false, message: "Add at least one question." });
    }

    // ─────────────────────────────────────────────
    // STEP 1: Paper dhundo
    // ─────────────────────────────────────────────
    const paper = await PreviousYearTest.findById(paperId);
    if (!paper) {
      return res.status(404).json({ success: false, message: "Paper not found." });
    }
    if (!paper.couponId) {
      return res.status(400).json({
        success: false,
        message: "This is a global paper, it cannot be filled this way.",
      });
    }

    // ─────────────────────────────────────────────
    // STEP 2: Access control (ab case/space-safe)
    // ─────────────────────────────────────────────
    const { allowed, reason } = await checkCouponAccess(req.teacher, paper.couponId, subjectName);
    if (!allowed) {
      return res.status(403).json({ success: false, message: reason || "You do not have access to this subject." });
    }

    // ─────────────────────────────────────────────
    // STEP 3: Blueprint + subject block dhundo
    //
    // 🐛 FIX: pehle `b.subjectName === subjectName` se exact match hota tha.
    // URL me subject ka naam encode hokar aata hai; agar kahin bhi capital/small
    // ya extra space ka farak ho jata to "Ye subject is paper ke blueprint mein
    // hai hi nahi" wala error aata tha, jabki subject saamne dikh raha hota tha.
    // ─────────────────────────────────────────────
    const blueprintEntry = paper.blueprint.find((b) => sameSubject(b.subjectName, subjectName));
    if (!blueprintEntry) {
      return res.status(400).json({
        success: false,
        message: `'${normalizeSubject(subjectName)}' is not in this paper's blueprint at all.`,
      });
    }

    const subjectBlock = paper.subjects.find((s) => sameSubject(s.subjectName, subjectName));
    if (!subjectBlock) {
      return res.status(404).json({
        success: false,
        message: "Subject block not found in the paper (data inconsistency).",
      });
    }

    if (subjectBlock.filled) {
      return res.status(400).json({
        success: false,
        message: `The quota for '${subjectBlock.subjectName}' is already full.`,
      });
    }

    // ─────────────────────────────────────────────
    // STEP 4: Har question validate karo save() se PEHLE
    // ─────────────────────────────────────────────
    const validationErrors = [];
    questions.forEach((q, idx) => {
      if (!q.question || !q.option1 || !q.option2 || !q.option3 || !q.option4) {
        validationErrors.push(`Question ${idx + 1}: all options and the question text are required.`);
        return;
      }
      const correctOpt = Number(q.correctOption);
      if (!correctOpt || correctOpt < 1 || correctOpt > 4) {
        validationErrors.push(`Question ${idx + 1}: correctOption must be between 1 and 4.`);
      }
    });

    if (validationErrors.length > 0) {
      return res.status(400).json({
        success: false,
        message: "Some questions have validation errors, nothing was saved:",
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
        message: `You can add only ${remainingSlots} more question(s) for '${subjectBlock.subjectName}' (quota: ${blueprintEntry.questionCount}, already filled: ${subjectBlock.questions.length}).`,
      });
    }

    // ─────────────────────────────────────────────
    // STEP 6: questionNumber auto-numbering (subject block ke andar)
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
      topicName: normalizeSubject(q.topicName) || "General",
      // 🐛 FIX: subjectName model me required hai — pehle yahan set hi nahi hota tha,
      // jo mongoose validation error de sakta tha
      subjectName: subjectBlock.subjectName,
      questionNumber: nextNumber++,
    }));

    subjectBlock.questions.push(...newQuestions);

    await paper.save();

    return res.status(200).json({
      success: true,
      message: `${newQuestions.length} question(s) added to '${subjectBlock.subjectName}'! (${subjectBlock.questions.length}/${blueprintEntry.questionCount})`,
      data: {
        paperId: paper._id,
        subjectName: subjectBlock.subjectName,
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
      message: "Server error while filling the subject.",
      error: error.message,
    });
  }
};
