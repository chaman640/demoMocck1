// controllers/addTeacherQuestion.js
import mongoose from "mongoose";
import { errorDetail } from "../utils/safeError.js"; // 🔒 NAYA (Round 1)
import { Question } from "../models/rowQuestionSchema.js";
import Coupon from "../models/Coupon.js";
import CouponAccess from "../models/CouponAccess.js";
import {
  normalizeSubject,
  subjectKey,
  getKnownSubjects,
  canonicalizeSubject,
} from "../utils/subjectName.js";
import { tooManyItems } from "../utils/limits.js"; // 🔒 NAYA (Round 1)

export const addTeacherQuestion = async (req, res) => {
  try {
    // ─────────────────────────────────────────────
    // STEP 0: couponId nikalo, questions ki list banao.
    // (a) Bulk JSON { couponId, questions: [...] }
    // (b) Single multipart (image ke saath) — fields seedhe req.body mein
    // ─────────────────────────────────────────────
    const { couponId } = req.body;

    if (!couponId || !mongoose.Types.ObjectId.isValid(couponId)) {
      return res.status(400).json({ success: false, message: "A valid couponId is required!" });
    }

    let questionsData;
    if (Array.isArray(req.body.questions)) {
      questionsData = req.body.questions;
    } else {
      const { couponId: _drop, questions: _drop2, ...singleQuestion } = req.body;
      questionsData = [singleQuestion];
    }

    if (!Array.isArray(questionsData) || questionsData.length === 0) {
      return res.status(400).json({ success: false, message: "Add at least one question." });
    }

    // 🔒 Round 1: bulk size ki hadd — wajah utils/limits.js mein likhi hai
    if (tooManyItems(res, questionsData, "questions")) return;

    // ─────────────────────────────────────────────
    // STEP 1: Coupon dhundo — examName YAHIN se derive hoga
    // ─────────────────────────────────────────────
    const coupon = await Coupon.findById(couponId);
    if (!coupon) {
      return res.status(404).json({ success: false, message: "This coupon/group was not found." });
    }

    // ─────────────────────────────────────────────
    // STEP 2: 🐛 SUBJECT SPELLING FIX
    //
    // Pehle subjectName jaise ka waisa DB me chala jata tha. "Maths", "maths",
    // "Maths " — teeno alag subject ban jate the, aur:
    //   • sub-teacher ko 403 milta tha
    //   • analysis me subject do-do baar dikhta tha
    //   • mock test me sawaal aate hi nahi the
    // Ab: normalize karke, batch/blueprint me maujood "sahi" spelling me badal dete hain.
    // ─────────────────────────────────────────────
    const known = await getKnownSubjects(coupon._id, coupon.exam);

    const canonicalBySubmitted = {}; // { "maths": "Maths" }
    const notInBlueprint = [];

    for (const q of questionsData) {
      const raw = normalizeSubject(q.subjectName);
      if (!raw) continue;
      const k = subjectKey(raw);
      if (canonicalBySubmitted[k]) continue;

      const { canonical, inBlueprint } = canonicalizeSubject(raw, known);
      canonicalBySubmitted[k] = canonical;
      if (!inBlueprint && !notInBlueprint.includes(canonical)) notInBlueprint.push(canonical);
    }

    const uniqueSubjects = [...new Set(Object.values(canonicalBySubmitted))];

    if (uniqueSubjects.length === 0) {
      return res.status(400).json({ success: false, message: "Every question needs a subjectName." });
    }

    // ─────────────────────────────────────────────
    // STEP 3: Access control
    // ─────────────────────────────────────────────
    if (req.teacher.role === "main") {
      if (String(coupon.mainTeacher) !== String(req.teacher._id)) {
        return res.status(403).json({
          success: false,
          message: "This coupon is not yours — you cannot add content to it.",
        });
      }
    } else if (req.teacher.role === "sub") {
      // 🐛 FIX: pehle `subject: { $in: uniqueSubjects }` se exact match hota tha.
      // Ab is teacher ke saare access records lete hain aur case/space ignore
      // karke compare karte hain — spelling ki wajah se lockout nahi hoga.
      const accessRecords = await CouponAccess.find({
        coupon: couponId,
        subTeacher: req.teacher._id,
      }).select("subject");

      const authorizedByKey = {};
      accessRecords.forEach((r) => {
        authorizedByKey[subjectKey(r.subject)] = r.subject;
      });

      const unauthorized = uniqueSubjects.filter((s) => !authorizedByKey[subjectKey(s)]);
      if (unauthorized.length > 0) {
        return res.status(403).json({
          success: false,
          message: `You are not authorized for these subjects in this coupon: ${unauthorized.join(", ")}`,
        });
      }

      // Sub-teacher ke liye "sahi" spelling wahi hai jo unke access record me hai
      Object.keys(canonicalBySubmitted).forEach((k) => {
        if (authorizedByKey[k]) canonicalBySubmitted[k] = authorizedByKey[k];
      });
    } else {
      return res.status(403).json({ success: false, message: "Your teacher role is not valid." });
    }

    // ─────────────────────────────────────────────
    // STEP 4: Har question validate karo save() se PEHLE — "sab ya koi nahi"
    // ─────────────────────────────────────────────
    const validationErrors = [];
    questionsData.forEach((q, idx) => {
      if (!q.question || !q.option1 || !q.option2 || !q.option3 || !q.option4) {
        validationErrors.push(`Question ${idx + 1}: all options and the question text are required.`);
        return;
      }
      const correctOpt = Number(q.correctOption);
      if (!correctOpt || correctOpt < 1 || correctOpt > 4) {
        validationErrors.push(`Question ${idx + 1}: correctOption must be between 1 and 4.`);
        return;
      }
      if (!normalizeSubject(q.subjectName) || !normalizeSubject(q.topicName)) {
        validationErrors.push(`Question ${idx + 1}: subjectName and topicName are required.`);
        return;
      }
      if (!q.answerExplain) {
        validationErrors.push(`Question ${idx + 1}: answerExplain is required.`);
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
    // STEP 5: questionNumber auto-numbering (coupon + subject + topic scoped)
    // ─────────────────────────────────────────────
    const counterMap = {};
    const docsToInsert = [];

    for (const q of questionsData) {
      const finalSubject = canonicalBySubmitted[subjectKey(q.subjectName)];
      // topic ko bhi normalize kar rahe hain — "Sandhi " aur "Sandhi" ek hi rahe
      const finalTopic = normalizeSubject(q.topicName);
      const key = `${finalSubject}|||${finalTopic}`;

      if (!(key in counterMap)) {
        const existingCount = await Question.countDocuments({
          coupon: couponId,
          subjectName: finalSubject,
          topicName: finalTopic,
        });
        counterMap[key] = existingCount;
      }
      counterMap[key] += 1;

      docsToInsert.push({
        question: q.question,
        questionPhoto: q.questionPhoto || null,
        option1: q.option1,
        option2: q.option2,
        option3: q.option3,
        option4: q.option4,
        correctOption: Number(q.correctOption),
        answerExplain: q.answerExplain,
        answerExplainWithPhoto: q.answerExplainWithPhoto || null,
        askedIn: q.askedIn ? String(q.askedIn).trim() : null, // 🆕
        subjectName: finalSubject, // 👈 hamesha "sahi" spelling
        topicName: finalTopic,
        questionNumber: counterMap[key],
        examName: [coupon.exam],
        coupon: coupon._id,
        addedByTeacher: req.teacher._id,
      });
    }

    const savedQuestions = await Question.insertMany(docsToInsert);

    // ─────────────────────────────────────────────
    // STEP 6: Response — agar subject mock-test blueprint me nahi hai to
    // teacher ko WARN karo. Pehle ye bilkul chup-chaap hota tha aur teacher
    // ke sawaal kabhi kisi mock test me aate hi nahi the.
    // ─────────────────────────────────────────────
    const warning =
      notInBlueprint.length > 0
        ? `⚠️ Note: ${notInBlueprint.join(", ")} — this subject is not in the '${coupon.exam}' Mock Test blueprint. ` +
          `These questions will be used in Custom Tests / PYQs, but they will not appear in auto-generated Mock Tests.`
        : null;

    return res.status(201).json({
      success: true,
      message: `🎉 ${savedQuestions.length} question(s) added successfully for "${coupon.name}"!`,
      warning,
      savedSubjects: uniqueSubjects,
      data: savedQuestions,
    });
  } catch (error) {
    console.error("addTeacherQuestion error:", error);
    return res.status(500).json({
      success: false,
      message: "Server error while adding questions.",
      ...errorDetail(error), // 🔒 production me andar ka detail bahar nahi jata
    });
  }
};
