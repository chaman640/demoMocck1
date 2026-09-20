// backend/controllers/deleteCoupon.js
//
// 🆕 NAYA — Batch delete karta hai. Sirf Main Teacher, apne khud ke
// batch ke liye. Jo bhi is batch se juda hai (Custom Tests, allowed
// students list, batch-exclusive questions) sab saaf ho jaata hai —
// taaki koi orphaned/dead data DB mein na reh jaaye.
import mongoose from "mongoose";
import Coupon from "../models/Coupon.js";
import Teacher from "../models/Teacher.js";
import User from "../models/User.js";
import CustomTest from "../models/CustomTest.js";
import AllowedStudent from "../models/AllowedStudent.js";
import { Question } from "../models/rowQuestionSchema.js";

export const deleteCoupon = async (req, res) => {
  try {
    const { couponId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(couponId)) {
      return res.status(400).json({ success: false, message: "Invalid batch ID." });
    }
    if (req.teacher.role !== "main") {
      return res.status(403).json({ success: false, message: "Sirf Main Teacher batch delete kar sakta hai." });
    }

    const coupon = await Coupon.findOne({ _id: couponId, mainTeacher: req.teacher._id });
    if (!coupon) {
      return res.status(404).json({ success: false, message: "Ye batch nahi mila ya aapka nahi hai." });
    }

    // ── Cascade cleanup ──
    const [deletedTests, deletedAllowed, deletedQuestions] = await Promise.all([
      CustomTest.deleteMany({ couponId }),
      AllowedStudent.deleteMany({ coupon: couponId }),
      Question.deleteMany({ coupon: couponId }), // batch-exclusive questions — bina batch ke kaam ke nahi rehte
    ]);

    // Jin students ka activeCoupon isi batch pe tha, unhe clear karo
    // (unka account/history nahi delete hota, sirf batch-link hatta hai)
    await User.updateMany({ activeCoupon: couponId }, { $set: { activeCoupon: null } });

    // Teacher (main + jitne sub-teachers ho) ke "coupons" array se bhi hataao
    await Teacher.updateMany({ coupons: couponId }, { $pull: { coupons: couponId } });
    // Agar kisi teacher ka activeCoupon isi batch pe tha, use bhi clear karo
    await Teacher.updateMany({ activeCoupon: couponId }, { $set: { activeCoupon: null } });

    await Coupon.deleteOne({ _id: couponId });

    return res.status(200).json({
      success: true,
      message: `'${coupon.name}' batch delete ho gaya.`,
      cleanup: {
        customTestsDeleted: deletedTests.deletedCount,
        allowedStudentsDeleted: deletedAllowed.deletedCount,
        questionsDeleted: deletedQuestions.deletedCount,
      },
    });
  } catch (error) {
    console.error("deleteCoupon error:", error);
    return res.status(500).json({ success: false, message: "Batch delete karte waqt error aaya." });
  }
};
