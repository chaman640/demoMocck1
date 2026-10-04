// controllers/manageCouponAccess.js
// Existing sub-teacher ko baad mein additional coupons/subjects assign karna,
// ya unka access revoke karna.
import mongoose from "mongoose";
import Teacher from "../models/Teacher.js";
import Coupon from "../models/Coupon.js";
import CouponAccess from "../models/CouponAccess.js";
import {
  normalizeSubject,
  subjectKey,
  ciExact,
  getKnownSubjects,
  canonicalizeSubject,
} from "../utils/subjectName.js";

// ─────────────────────────────────────────────
// POST /manage-coupon-access/assign
// Body: { subTeacherId, couponId, subjects: ["Hindi", "Maths"] }
// ─────────────────────────────────────────────
export const assignCouponAccess = async (req, res) => {
  try {
    if (req.teacher.role !== "main") {
      return res.status(403).json({ success: false, message: "Only a Main Teacher can assign access!" });
    }

    const { subTeacherId, couponId, subjects } = req.body;

    if (!subTeacherId || !couponId || !Array.isArray(subjects) || subjects.length === 0) {
      return res.status(400).json({
        success: false,
        message: "subTeacherId, couponId and at least one subject are required!",
      });
    }

    if (!mongoose.Types.ObjectId.isValid(subTeacherId) || !mongoose.Types.ObjectId.isValid(couponId)) {
      return res.status(400).json({ success: false, message: "Invalid ID format." });
    }

    const subTeacher = await Teacher.findOne({
      _id: subTeacherId,
      parentTeacher: req.teacher._id,
      role: "sub",
    });
    if (!subTeacher) {
      return res.status(404).json({ success: false, message: "This sub-teacher was not found or is not yours!" });
    }
    if (subTeacher.status === "removed") {
      return res.status(400).json({
        success: false,
        message: "This sub-teacher has been removed, invite them again first.",
      });
    }

    const coupon = await Coupon.findOne({ _id: couponId, mainTeacher: req.teacher._id });
    if (!coupon) {
      return res.status(404).json({ success: false, message: "This coupon was not found or is not yours!" });
    }

    // ─────────────────────────────────────────────
    // 🐛 SUBJECT SPELLING FIX
    // Pehle sirf .trim() hota tha. Agar Main Teacher yahan "maths" likh de
    // lekin PYQ blueprint mein "Maths" ho, to sub-teacher us paper ko kabhi
    // fill nahi kar pata tha ("authorized nahi hain"), aur paper hamesha
    // draft mein atka reh jata tha. Ab batch/blueprint ki "sahi" spelling
    // apne aap lag jati hai.
    // ─────────────────────────────────────────────
    const known = await getKnownSubjects(coupon._id, coupon.exam);

    const cleanSubjects = [];
    const notInBlueprint = [];
    for (const s of subjects) {
      if (typeof s !== "string" || !normalizeSubject(s)) continue;
      const { canonical, inBlueprint } = canonicalizeSubject(s, known);
      if (!cleanSubjects.some((x) => subjectKey(x) === subjectKey(canonical))) {
        cleanSubjects.push(canonical);
        if (!inBlueprint) notInBlueprint.push(canonical);
      }
    }

    if (cleanSubjects.length === 0) {
      return res.status(400).json({ success: false, message: "Subject name cannot be empty!" });
    }

    for (const subject of cleanSubjects) {
      // 🐛 FIX: pehle findOneAndUpdate exact `subject` par tha — "Maths" aur
      // "maths" ke DO alag access records ban jate the (unique index bhi
      // case-sensitive hai). Ab pehle case-insensitive dhundhte hain.
      const existing = await CouponAccess.findOne({
        coupon: coupon._id,
        subTeacher: subTeacher._id,
        subject: ciExact(subject),
      });
      if (existing) continue;

      await CouponAccess.create({
        coupon: coupon._id,
        subTeacher: subTeacher._id,
        subject,
      });
    }

    const warning =
      notInBlueprint.length > 0
        ? `⚠️ ${notInBlueprint.join(", ")} — this subject is not in the '${coupon.exam}' Mock Test blueprint. ` +
          `Questions from this subject will not appear in auto-generated Mock Tests.`
        : null;

    return res.status(200).json({
      success: true,
      message: `${subTeacher.name} now has ${cleanSubjects.join(", ")} access for '${coupon.name}'.`,
      warning,
      subjects: cleanSubjects,
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(200).json({ success: true, message: "Access already exists." });
    }
    console.error("assignCouponAccess error:", error);
    return res.status(500).json({
      success: false,
      message: "Error while assigning access.",
      error: error.message,
    });
  }
};

// ─────────────────────────────────────────────
// POST /manage-coupon-access/revoke
// Body: { subTeacherId, couponId, subject }
// ─────────────────────────────────────────────
export const revokeCouponAccess = async (req, res) => {
  try {
    if (req.teacher.role !== "main") {
      return res.status(403).json({ success: false, message: "Only a Main Teacher can revoke access!" });
    }

    const { subTeacherId, couponId, subject } = req.body;

    if (!subTeacherId || !couponId || !normalizeSubject(subject)) {
      return res.status(400).json({
        success: false,
        message: "subTeacherId, couponId and subject are required!",
      });
    }

    if (!mongoose.Types.ObjectId.isValid(subTeacherId) || !mongoose.Types.ObjectId.isValid(couponId)) {
      return res.status(400).json({ success: false, message: "Invalid ID format." });
    }

    const coupon = await Coupon.findOne({ _id: couponId, mainTeacher: req.teacher._id });
    if (!coupon) {
      return res.status(404).json({ success: false, message: "This coupon was not found or is not yours!" });
    }

    // 🐛 FIX: pehle exact `subject.trim()` par delete hota tha — agar record
    // "Maths" tha aur UI se "maths" aa jata to "Ye access record nahi mila"
    // milta tha aur access hataya hi nahi ja pata tha.
    const deleted = await CouponAccess.findOneAndDelete({
      coupon: couponId,
      subTeacher: subTeacherId,
      subject: ciExact(subject),
    });

    if (!deleted) {
      return res.status(404).json({ success: false, message: "Access record not found." });
    }

    return res.status(200).json({
      success: true,
      message: `Access to '${deleted.subject}' revoked.`,
    });
  } catch (error) {
    console.error("revokeCouponAccess error:", error);
    return res.status(500).json({
      success: false,
      message: "Error while revoking access.",
      error: error.message,
    });
  }
};
