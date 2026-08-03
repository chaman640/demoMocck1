// controllers/getPreviousYearTest.js
// Test lene se pehle yahan se data aayega — correctOption/answerExplain
// yahan se strip kar diya jata hai, warna DevTools se answers dikh jaate!
// 👇 UPDATED: Ab "complete" status bhi check hota hai (draft/incomplete
// teacher-shells kabhi student ko accidentally serve na hon), aur agar
// paper kisi coupon se linked hai to sirf usi batch ka student le sakta hai.
import mongoose from "mongoose";
import PreviousYearTest from "../models/PreviousYearTest.js";

export const getPreviousYearTest = async (req, res) => {
  try {
    const { testId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(testId)) {
      return res.status(400).json({ success: false, message: "Invalid Test ID" });
    }

    const test = await PreviousYearTest.findOne({
      _id: testId,
      isActive: true,
      status: "complete", // 👈 NAYA — draft/incomplete shell kabhi serve nahi hoga
    });

    if (!test) {
      return res.status(404).json({
        success: false,
        message: "Ye Previous Year Test nahi mila.",
      });
    }

    // 👇 NAYA: Agar ye ek batch-exclusive (teacher-created) paper hai,
    // to sirf usi batch ka student isko le sakta hai — koi bhi random
    // testId guess karke doosre batch ka exclusive paper na khol paaye
    if (test.couponId) {
      const studentCouponId = req.user.activeCoupon ? req.user.activeCoupon.toString() : null;
      if (studentCouponId !== test.couponId.toString()) {
        return res.status(403).json({
          success: false,
          message: "Ye paper aapki batch ke liye available nahi hai.",
        });
      }
    }

    const safeSubjects = test.subjects.map((s) => ({
      subjectName: s.subjectName,
      questions: s.questions.map((q) => ({
        _id: q._id,
        question: q.question,
        questionPhoto: q.questionPhoto,
        option1: q.option1,
        option2: q.option2,
        option3: q.option3,
        option4: q.option4,
        topicName: q.topicName,
        subjectName: q.subjectName,
      })),
    }));

    return res.status(200).json({
      success: true,
      data: {
        testId: test._id,
        examName: test.examName,
        testName: test.testName,
        year: test.year,
        description: test.description,
        marksPerQuestion: test.marksPerQuestion,
        negativeMarking: test.negativeMarking,
        durationMinutes: test.durationMinutes,
        totalQuestions: test.totalQuestions,
        subjects: safeSubjects,
      },
    });
  } catch (error) {
    console.error("getPreviousYearTest error:", error);
    return res.status(500).json({
      success: false,
      message: "Previous Year Test fetch karte waqt error aaya.",
      error: error.message,
    });
  }
};