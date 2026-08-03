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
      return res.status(403).json({ success: false, message: "Sirf Main Teacher hi access assign kar sakta hai!" });
    }

    const { subTeacherId, couponId, subjects } = req.body;

    if (!subTeacherId || !couponId || !Array.isArray(subjects) || subjects.length === 0) {
      return res.status(400).json({
        success: false,
        message: "subTeacherId, couponId aur kam se kam ek subject zaroori hai!",
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
      return res.status(404).json({ success: false, message: "Ye sub-teacher nahi mila ya aapka nahi hai!" });
    }
    if (subTeacher.status === "removed") {
      return res.status(400).json({
        success: false,
        message: "Ye sub-teacher remove ho chuka hai, pehle use dobara invite karein.",
      });
    }

    const coupon = await Coupon.findOne({ _id: couponId, mainTeacher: req.teacher._id });
    if (!coupon) {
      return res.status(404).json({ success: false, message: "Ye coupon nahi mila ya aapka nahi hai!" });
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
      return res.status(400).json({ success: false, message: "Subject naam khali nahi ho sakta!" });
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
        ? `⚠️ ${notInBlueprint.join(", ")} — ye subject '${coupon.exam}' ke Mock Test blueprint mein nahi hai. ` +
          `Is subject ke sawaal auto-generate hone wale Mock Test mein nahi aayenge.`
        : null;

    return res.status(200).json({
      success: true,
      message: `${subTeacher.name} ko '${coupon.name}' ke liye ${cleanSubjects.join(", ")} access mil gaya.`,
      warning,
      subjects: cleanSubjects,
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(200).json({ success: true, message: "Access pehle se maujood hai." });
    }
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
// ─────────────────────────────────────────────
export const revokeCouponAccess = async (req, res) => {
  try {
    if (req.teacher.role !== "main") {
      return res.status(403).json({ success: false, message: "Sirf Main Teacher hi access revoke kar sakta hai!" });
    }

    const { subTeacherId, couponId, subject } = req.body;

    if (!subTeacherId || !couponId || !normalizeSubject(subject)) {
      return res.status(400).json({
        success: false,
        message: "subTeacherId, couponId aur subject zaroori hain!",
      });
    }

    if (!mongoose.Types.ObjectId.isValid(subTeacherId) || !mongoose.Types.ObjectId.isValid(couponId)) {
      return res.status(400).json({ success: false, message: "Invalid ID format." });
    }

    const coupon = await Coupon.findOne({ _id: couponId, mainTeacher: req.teacher._id });
    if (!coupon) {
      return res.status(404).json({ success: false, message: "Ye coupon nahi mila ya aapka nahi hai!" });
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
      return res.status(404).json({ success: false, message: "Ye access record nahi mila." });
    }

    return res.status(200).json({
      success: true,
      message: `'${deleted.subject}' ka access revoke ho gaya.`,
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
