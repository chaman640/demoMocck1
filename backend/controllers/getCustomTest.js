// controllers/getCustomTest.js
// Test lene se pehle yahan se data aayega — correctOption yahan se
// strip hota hai. Batch-exclusive check bhi hai (PYQ jaisa).
import mongoose from "mongoose";
import CustomTest from "../models/CustomTest.js";

export const getCustomTest = async (req, res) => {
  try {
    const { testId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(testId)) {
      return res.status(400).json({ success: false, message: "Invalid Test ID" });
    }

    const test = await CustomTest.findOne({ _id: testId, isActive: true });

    if (!test) {
      return res.status(404).json({ success: false, message: "Ye test nahi mila." });
    }

    // Sirf usi batch ka student le sakta hai jiske liye ye test bana hai
    const studentCouponId = req.user.activeCoupon ? req.user.activeCoupon.toString() : null;
    if (studentCouponId !== test.couponId.toString()) {
      return res.status(403).json({
        success: false,
        message: "Ye test aapki batch ke liye available nahi hai.",
      });
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
        marksPerQuestion: test.marksPerQuestion,
        negativeMarking: test.negativeMarking,
        durationMinutes: test.durationMinutes,
        totalQuestions: test.totalQuestions,
        subjects: safeSubjects,
      },
    });
  } catch (error) {
    console.error("getCustomTest error:", error);
    return res.status(500).json({
      success: false,
      message: "Custom Test fetch karte waqt error aaya.",
      error: error.message,
    });
  }
};