// controllers/addTeacherQuestion.js
import mongoose from "mongoose";
import { Question } from "../models/rowQuestionSchema.js";
import Coupon from "../models/Coupon.js";
import CouponAccess from "../models/CouponAccess.js";

export const addTeacherQuestion = async (req, res) => {
  try {
    // ─────────────────────────────────────────────
    // STEP 0: couponId nikalo, questions ki list banao.
    // Do shapes support: (a) Bulk JSON { couponId, questions: [...] }
    // (b) Single multipart (image ke saath) — fields seedhe req.body mein
    // ─────────────────────────────────────────────
    const { couponId } = req.body;

    if (!couponId || !mongoose.Types.ObjectId.isValid(couponId)) {
      return res.status(400).json({
        success: false,
        message: "Valid couponId zaroori hai!",
      });
    }

    let questionsData;
    if (Array.isArray(req.body.questions)) {
      questionsData = req.body.questions;
    } else {
      const { couponId: _drop, questions: _drop2, ...singleQuestion } = req.body;
      questionsData = [singleQuestion];
    }

    if (!Array.isArray(questionsData) || questionsData.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Kam se kam ek question dena zaroori hai.",
      });
    }

    // ─────────────────────────────────────────────
    // STEP 1: Coupon dhundo — examName YAHIN se derive hoga.
    // Client jo bhi examName bheje wo IGNORE karte hain, taaki galat
    // exam ka question galat coupon mein kabhi na ja sake.
    // ─────────────────────────────────────────────
    const coupon = await Coupon.findById(couponId);
    if (!coupon) {
      return res.status(404).json({ success: false, message: "Ye coupon/group nahi mila." });
    }

    // ─────────────────────────────────────────────
    // STEP 2: Access control
    // ─────────────────────────────────────────────
    const uniqueSubjects = [...new Set(questionsData.map((q) => q.subjectName).filter(Boolean))];

    if (uniqueSubjects.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Har question ka subjectName dena zaroori hai.",
      });
    }

    if (req.teacher.role === "main") {
      if (String(coupon.mainTeacher) !== String(req.teacher._id)) {
        return res.status(403).json({
          success: false,
          message: "Ye coupon aapka nahi hai — aap isme content add nahi kar sakte.",
        });
      }
    } else if (req.teacher.role === "sub") {
      const accessRecords = await CouponAccess.find({
        coupon: couponId,
        subTeacher: req.teacher._id,
        subject: { $in: uniqueSubjects },
      });
      const authorizedSubjects = new Set(accessRecords.map((r) => r.subject));
      const unauthorized = uniqueSubjects.filter((s) => !authorizedSubjects.has(s));

      if (unauthorized.length > 0) {
        return res.status(403).json({
          success: false,
          message: `Aap is coupon mein in subjects ke liye authorized nahi hain: ${unauthorized.join(", ")}`,
        });
      }
    } else {
      return res.status(403).json({ success: false, message: "Aapki teacher role valid nahi hai." });
    }

    // ─────────────────────────────────────────────
    // STEP 3: Har question validate karo save() se PEHLE — taaki batch
    // ka aadha save na ho aur aadha error de ("sab ya koi nahi")
    // ─────────────────────────────────────────────
    const validationErrors = [];
    questionsData.forEach((q, idx) => {
      if (!q.question || !q.option1 || !q.option2 || !q.option3 || !q.option4) {
        validationErrors.push(`Question ${idx + 1}: sabhi options aur question text zaroori hain.`);
        return;
      }
      const correctOpt = Number(q.correctOption);
      if (!correctOpt || correctOpt < 1 || correctOpt > 4) {
        validationErrors.push(`Question ${idx + 1}: correctOption 1 se 4 ke beech hona chahiye.`);
        return;
      }
      if (!q.subjectName || !q.topicName) {
        validationErrors.push(`Question ${idx + 1}: subjectName aur topicName zaroori hain.`);
        return;
      }
      if (!q.answerExplain) {
        validationErrors.push(`Question ${idx + 1}: answerExplain zaroori hai.`);
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
    // STEP 4: questionNumber auto-numbering — coupon + subject + topic
    // ke hisaab se scoped (global pool se alag), taaki har batch ka
    // apna clean sequential numbering rahe. Isi request ke andar agar
    // same subject/topic ke multiple naye questions hain, unko bhi
    // sahi order mein number milega (sirf DB count pe nahi rukte).
    // ─────────────────────────────────────────────
    const counterMap = {};
    const docsToInsert = [];

    for (const q of questionsData) {
      const key = `${q.subjectName}|||${q.topicName}`;

      if (!(key in counterMap)) {
        const existingCount = await Question.countDocuments({
          coupon: couponId,
          subjectName: q.subjectName,
          topicName: q.topicName,
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
        subjectName: q.subjectName,
        topicName: q.topicName,
        questionNumber: counterMap[key],
        examName: [coupon.exam], // 👈 client se aaya examName ignore — coupon se derive
        coupon: coupon._id,
        addedByTeacher: req.teacher._id,
      });
    }

    // ─────────────────────────────────────────────
    // STEP 5: Save
    // ─────────────────────────────────────────────
    const savedQuestions = await Question.insertMany(docsToInsert);

    return res.status(201).json({
      success: true,
      message: `🎉 ${savedQuestions.length} question(s) successfully add ho gaye "${coupon.name}" ke liye!`,
      data: savedQuestions,
    });
  } catch (error) {
    console.error("addTeacherQuestion error:", error);
    return res.status(500).json({
      success: false,
      message: "Server mein error aa gaya question add karte waqt.",
      error: error.message,
    });
  }
};