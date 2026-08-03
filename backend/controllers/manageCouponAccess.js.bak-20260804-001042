// controllers/manageCouponAccess.js
// Existing sub-teacher (already invited/active) ko baad mein additional
// coupons/subjects assign karna, ya unka access revoke karna — invite
// ke baad bhi Main Teacher access manage kar sake.
import mongoose from "mongoose";
import Teacher from "../models/Teacher.js";
import Coupon from "../models/Coupon.js";
import CouponAccess from "../models/CouponAccess.js";

// ─────────────────────────────────────────────
// POST /manage-coupon-access/assign
// Body: { subTeacherId, couponId, subjects: ["Hindi", "Maths"] }
// ─────────────────────────────────────────────
export const assignCouponAccess = async (req, res) => {
  try {
    if (req.teacher.role !== "main") {
      return res.status(403).json({
        success: false,
        message: "Sirf Main Teacher hi access assign kar sakta hai!",
      });
    }

    const { subTeacherId, couponId, subjects } = req.body;

    if (!subTeacherId || !couponId || !Array.isArray(subjects) || subjects.length === 0) {
      return res.status(400).json({
        success: false,
        message: "subTeacherId, couponId aur kam se kam ek subject zaroori hai!",
      });
    }

    if (
      !mongoose.Types.ObjectId.isValid(subTeacherId) ||
      !mongoose.Types.ObjectId.isValid(couponId)
    ) {
      return res.status(400).json({ success: false, message: "Invalid ID format." });
    }

    // Sub-teacher is Main Teacher ka hi ho, verify karo
    const subTeacher = await Teacher.findOne({
      _id: subTeacherId,
      parentTeacher: req.teacher._id,
      role: "sub",
    });
    if (!subTeacher) {
      return res.status(404).json({
        success: false,
        message: "Ye sub-teacher nahi mila ya aapka nahi hai!",
      });
    }
    if (subTeacher.status === "removed") {
      return res.status(400).json({
        success: false,
        message: "Ye sub-teacher remove ho chuka hai, pehle use dobara invite karein.",
      });
    }

    // Coupon is Main Teacher ka hi ho, verify karo
    const coupon = await Coupon.findOne({ _id: couponId, mainTeacher: req.teacher._id });
    if (!coupon) {
      return res.status(404).json({
        success: false,
        message: "Ye coupon nahi mila ya aapka nahi hai!",
      });
    }

    const cleanSubjects = subjects
      .map((s) => (typeof s === "string" ? s.trim() : ""))
      .filter(Boolean);

    if (cleanSubjects.length === 0) {
      return res.status(400).json({ success: false, message: "Subject naam khali nahi ho sakta!" });
    }

    for (const subject of cleanSubjects) {
      await CouponAccess.findOneAndUpdate(
        { coupon: coupon._id, subTeacher: subTeacher._id, subject },
        { $setOnInsert: { coupon: coupon._id, subTeacher: subTeacher._id, subject } },
        { upsert: true, new: true }
      );
    }

    return res.status(200).json({
      success: true,
      message: `${subTeacher.name} ko '${coupon.name}' ke liye ${cleanSubjects.join(", ")} access mil gaya.`,
    });
  } catch (error) {
    console.error("assignCouponAccess error:", error);
    return res.status(500).json({
      success: false,
      message: "Access assign karte waqt error aaya.",
      error: error.message,
    });
  }
};

// ─────────────────────────────────────────────
// POST /manage-coupon-access/revoke
// Body: { subTeacherId, couponId, subject }
// Ek waqt me ek subject ka access hataya jaata hai — sab hatane ho to
// frontend multiple bar call kar sakta hai.
// ─────────────────────────────────────────────
export const revokeCouponAccess = async (req, res) => {
  try {
    if (req.teacher.role !== "main") {
      return res.status(403).json({
        success: false,
        message: "Sirf Main Teacher hi access revoke kar sakta hai!",
      });
    }

    const { subTeacherId, couponId, subject } = req.body;

    if (!subTeacherId || !couponId || !subject) {
      return res.status(400).json({
        success: false,
        message: "subTeacherId, couponId aur subject zaroori hain!",
      });
    }

    if (
      !mongoose.Types.ObjectId.isValid(subTeacherId) ||
      !mongoose.Types.ObjectId.isValid(couponId)
    ) {
      return res.status(400).json({ success: false, message: "Invalid ID format." });
    }

    // Coupon is Main Teacher ka hi ho, verify karo
    const coupon = await Coupon.findOne({ _id: couponId, mainTeacher: req.teacher._id });
    if (!coupon) {
      return res.status(404).json({
        success: false,
        message: "Ye coupon nahi mila ya aapka nahi hai!",
      });
    }

    const deleted = await CouponAccess.findOneAndDelete({
      coupon: couponId,
      subTeacher: subTeacherId,
      subject: subject.trim(),
    });

    if (!deleted) {
      return res.status(404).json({
        success: false,
        message: "Ye access record nahi mila.",
      });
    }

    return res.status(200).json({
      success: true,
      message: `'${subject}' ka access revoke ho gaya.`,
    });
  } catch (error) {
    console.error("revokeCouponAccess error:", error);
    return res.status(500).json({
      success: false,
      message: "Access revoke karte waqt error aaya.",
      error: error.message,
    });
  }
};