// backend/controllers/getCouponSubjects.js
//
// 🆕 NAYA — Main Teacher jab sub-teacher ko subjects assign karta hai,
// ab free-text type karne ke bajaye us coupon ke EXAM mein jo bhi
// Blueprints bane hain, unke subjects ki list se CHUNTA hai. Isse
// spelling mismatch (jo pehle "Maths"/"maths"/"Math" ki wajah se
// sub-teacher ko sawaal dikhna band kar deta tha) hamesha ke liye khatam.
import mongoose from "mongoose";
import Coupon from "../models/Coupon.js";
import Blueprint from "../models/bluePrint.js";

export const getCouponSubjects = async (req, res) => {
  try {
    const { couponId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(couponId)) {
      return res.status(400).json({ success: false, message: "Invalid coupon ID" });
    }
    if (req.teacher.role !== "main") {
      return res.status(403).json({ success: false, message: "Sirf Main Teacher ye dekh sakta hai." });
    }

    const coupon = await Coupon.findOne({ _id: couponId, mainTeacher: req.teacher._id });
    if (!coupon) {
      return res.status(404).json({ success: false, message: "Ye coupon nahi mila ya aapka nahi hai." });
    }

    const blueprints = await Blueprint.find({ examName: coupon.exam }).select("subjects.subjectName");

    const subjectSet = new Set();
    for (const bp of blueprints) {
      for (const s of bp.subjects || []) {
        if (s.subjectName) subjectSet.add(s.subjectName);
      }
    }

    return res.status(200).json({
      success: true,
      examName: coupon.exam,
      data: Array.from(subjectSet).sort(),
    });
  } catch (error) {
    console.error("getCouponSubjects error:", error);
    return res.status(500).json({ success: false, message: "Subjects fetch karte waqt error aaya." });
  }
};
