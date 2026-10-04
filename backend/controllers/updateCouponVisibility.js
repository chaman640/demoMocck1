// controllers/updateCouponVisibility.js
// Main Teacher apne batch ko baad me bhi Public ya Private kar sakta hai.
// Route: PATCH /teacher/coupon-visibility/:couponId  body: { visibility: "public" | "private" }
import mongoose from "mongoose";
import Coupon from "../models/Coupon.js";
import AllowedStudent from "../models/AllowedStudent.js";

export const updateCouponVisibility = async (req, res) => {
  try {
    const { couponId } = req.params;
    const { visibility } = req.body || {};

    if (!mongoose.Types.ObjectId.isValid(couponId)) {
      return res.status(400).json({ success: false, message: "Invalid batch ID." });
    }
    if (!["public", "private"].includes(visibility)) {
      return res.status(400).json({ success: false, message: "visibility 'public' ya 'private' honi chahiye." });
    }
    if (req.teacher.role !== "main") {
      return res.status(403).json({ success: false, message: "Sirf Main Teacher batch ki setting badal sakta hai." });
    }

    const coupon = await Coupon.findOneAndUpdate(
      { _id: couponId, mainTeacher: req.teacher._id },
      { $set: { visibility } },
      { new: true }
    );
    if (!coupon) {
      return res.status(404).json({ success: false, message: "Ye batch nahi mila ya aapka nahi hai." });
    }

    const studentCount = await AllowedStudent.countDocuments({ coupon: coupon._id });

    return res.status(200).json({
      success: true,
      message: visibility === "public"
        ? "Batch ab Public hai — code wala koi bhi student jud sakta hai."
        : "Batch ab Private hai — sirf aapki list wale students jud payenge.",
      data: { _id: coupon._id, visibility: coupon.visibility, studentCount },
    });
  } catch (error) {
    console.error("updateCouponVisibility error:", error);
    return res.status(500).json({ success: false, message: "Batch ki setting badalte waqt error aaya." });
  }
};
