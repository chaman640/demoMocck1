// controllers/getTeacherPYQPaperById.js
// Single paper ka progress — fill-page reload/refresh-safe rakhne ke liye
import mongoose from "mongoose";
import PreviousYearTest from "../models/PreviousYearTest.js";
import { checkCouponAccess } from "../utils/checkCouponAccess.js";

export const getTeacherPYQPaperById = async (req, res) => {
  try {
    const { paperId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(paperId)) {
      return res.status(400).json({ success: false, message: "Invalid paperId." });
    }

    const paper = await PreviousYearTest.findById(paperId);
    if (!paper || !paper.couponId) {
      return res.status(404).json({ success: false, message: "Paper nahi mila." });
    }

    const { allowed, reason } = await checkCouponAccess(req.teacher, paper.couponId, null);
    if (!allowed) {
      return res.status(403).json({ success: false, message: reason || "Access denied." });
    }

    const subjectProgress = paper.blueprint.map((b) => {
      const subjBlock = paper.subjects.find((s) => s.subjectName === b.subjectName);
      return {
        subjectName: b.subjectName,
        required: b.questionCount,
        current: subjBlock ? subjBlock.questions.length : 0,
        filled: subjBlock ? subjBlock.filled : false,
      };
    });

    return res.status(200).json({
      success: true,
      data: {
        paperId: paper._id,
        testName: paper.testName,
        year: paper.year,
        status: paper.status,
        subjectProgress,
      },
    });
  } catch (error) {
    console.error("getTeacherPYQPaperById error:", error);
    return res.status(500).json({
      success: false,
      message: "Paper fetch karte waqt error aaya.",
      error: error.message,
    });
  }
};