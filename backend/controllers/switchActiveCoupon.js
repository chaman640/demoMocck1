// controllers/switchActiveCoupon.js
// Main ya Sub Teacher apna "active group" (coupon) switch karta hai —
// jis coupon ke context mein wo abhi kaam karna chahta hai. Switch
// karne se purana koi data delete nahi hota, sirf working-context badalta hai.
import mongoose from "mongoose";
import Teacher from "../models/Teacher.js";
import { checkCouponAccess } from "../utils/checkCouponAccess.js";

export const switchActiveCoupon = async (req, res) => {
  try {
    const { couponId } = req.body;

    if (!couponId) {
      return res.status(400).json({ success: false, message: "couponId zaroori hai!" });
    }
    if (!mongoose.Types.ObjectId.isValid(couponId)) {
      return res.status(400).json({ success: false, message: "Invalid couponId." });
    }

    // subject = null — yahan sirf coupon-level access chahiye
    const { allowed, coupon, reason } = await checkCouponAccess(req.teacher, couponId, null);

    if (!allowed) {
      return res.status(403).json({ success: false, message: reason || "Access denied." });
    }

    await Teacher.findByIdAndUpdate(req.teacher._id, { activeCoupon: coupon._id });

    return res.status(200).json({
      success: true,
      message: `Active group '${coupon.name}' set ho gaya.`,
      data: { activeCoupon: coupon },
    });
  } catch (error) {
    console.error("switchActiveCoupon error:", error);
    return res.status(500).json({
      success: false,
      message: "Active coupon switch karte waqt error aaya.",
      error: error.message,
    });
  }
};