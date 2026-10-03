// controllers/checkCustomTestAnswer.js
//
// POST /custom-test/:testId/check  { questionId, userAnswer }
// Practice mode ka "Check Answer". Pehle frontend q.correctOption padhta tha
// jo server bhejta hi nahi tha — isliye har checked answer "galat" dikhta tha
// aur explanation kabhi nahi aati thi. Ab sahi answer yahin se milta hai.
import mongoose from "mongoose";
import CustomTest from "../models/CustomTest.js";
import CustomTestReveal from "../models/CustomTestReveal.js";

export const checkCustomTestAnswer = async (req, res) => {
  try {
    const { testId } = req.params;
    const questionId = String(req.body?.questionId || "");
    const rawAnswer = req.body?.userAnswer;
    const userAnswer = rawAnswer === undefined || rawAnswer === null || rawAnswer === "" ? null : String(rawAnswer);

    if (!mongoose.Types.ObjectId.isValid(testId) || !mongoose.Types.ObjectId.isValid(questionId)) {
      return res.status(400).json({ success: false, message: "Invalid test ya question." });
    }

    const test = await CustomTest.findOne({ _id: testId, isActive: true });
    if (!test) return res.status(404).json({ success: false, message: "Ye test nahi mila." });

    const studentCouponId = req.user.activeCoupon ? req.user.activeCoupon.toString() : null;
    if (studentCouponId !== test.couponId.toString()) {
      return res.status(403).json({ success: false, message: "Ye test aapki batch ke liye available nahi hai." });
    }

    let question = null;
    for (const subj of test.subjects) {
      question = subj.questions.find((q) => q._id.toString() === questionId);
      if (question) break;
    }
    if (!question) return res.status(404).json({ success: false, message: "Ye sawaal is test ka nahi hai." });

    // Pehli baar check karte waqt ka answer lock — dobara check par wahi rahega
    const reveal = await CustomTestReveal.findOneAndUpdate(
      { userId: req.user._id, testId: test._id, questionId: question._id },
      { $setOnInsert: { lockedAnswer: userAnswer } },
      { upsert: true, new: true }
    );

    return res.status(200).json({
      success: true,
      data: {
        questionId: question._id,
        correctOption: question.correctOption,
        answerExplain: question.answerExplain || "",
        answerExplainWithPhoto: question.answerExplainWithPhoto || null,
        lockedAnswer: reveal.lockedAnswer,
      },
    });
  } catch (error) {
    console.error("checkCustomTestAnswer error:", error);
    return res.status(500).json({ success: false, message: "Answer check nahi ho paya." });
  }
};
