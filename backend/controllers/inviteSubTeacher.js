// controllers/inviteSubTeacher.js
// Sirf MAIN TEACHER hi naya sub-teacher invite kar sakta hai.
// Teacher phone number ke saath-saath ek ya zyada coupons/subjects bhi
// yahin decide kar sakta hai — sub-teacher ka access invite ke waqt hi
// tay ho jaata hai. Exam alag se nahi chunna padta, kyunki har coupon
// khud apne exam se bound hota hai — coupon assign karte hi exam bhi
// automatically saath aa jata hai.
import crypto from "crypto";
import Teacher from "../models/Teacher.js";
import Coupon from "../models/Coupon.js";
import CouponAccess from "../models/CouponAccess.js";

const INVITE_VALID_DAYS = 3;

export const inviteSubTeacher = async (req, res) => {
  try {
    // ─────────────────────────────────────────────
    // STEP 0: Sirf Main Teacher hi invite bhej sakta hai
    // ─────────────────────────────────────────────
    if (req.teacher.role !== "main") {
      return res.status(403).json({
        success: false,
        message: "Sirf Main Teacher hi naya sub-teacher invite kar sakta hai!",
      });
    }

    // ─────────────────────────────────────────────
    // STEP 1: Validation — sirf phone zaroori hai
    // ─────────────────────────────────────────────
    const { phone, assignments } = req.body;

    if (!phone) {
      return res.status(400).json({
        success: false,
        message: "Phone number zaroori hai!",
      });
    }
    if (!/^\d{10}$/.test(phone)) {
      return res.status(400).json({
        success: false,
        message: "Phone number bilkul 10 anko ka hona chahiye!",
      });
    }

    // ─────────────────────────────────────────────
    // STEP 2: assignments validate + normalize karo
    // Format: [{ couponId, subjects: ["Hindi", "Maths"] }, ...]
    // Optional hai — bina assignments ke bhi invite bhej sakte hain
    // ─────────────────────────────────────────────
    const normalizedAssignments = [];

    if (assignments !== undefined) {
      if (!Array.isArray(assignments)) {
        return res.status(400).json({
          success: false,
          message: "assignments ek array hona chahiye!",
        });
      }

      for (const a of assignments) {
        if (!a || !a.couponId || !Array.isArray(a.subjects) || a.subjects.length === 0) {
          return res.status(400).json({
            success: false,
            message: "Har assignment mein couponId aur kam se kam ek subject hona zaroori hai!",
          });
        }

        const cleanSubjects = a.subjects
          .map((s) => (typeof s === "string" ? s.trim() : ""))
          .filter(Boolean);

        if (cleanSubjects.length === 0) {
          return res.status(400).json({
            success: false,
            message: "Subject naam khali nahi ho sakta!",
          });
        }

        normalizedAssignments.push({ couponId: a.couponId, subjects: cleanSubjects });
      }
    }

    // ─────────────────────────────────────────────
    // STEP 3: Diye gaye sabhi coupons is Main Teacher ke hi hain, verify karo
    // (ek hi query mein — teacher kisi doosre teacher ka coupon assign na kar sake)
    // ─────────────────────────────────────────────
    let validCoupons = [];
    if (normalizedAssignments.length > 0) {
      const couponIds = [...new Set(normalizedAssignments.map((a) => a.couponId))];

      validCoupons = await Coupon.find({
        _id: { $in: couponIds },
        mainTeacher: req.teacher._id,
      });

      if (validCoupons.length !== couponIds.length) {
        return res.status(404).json({
          success: false,
          message: "Ek ya zyada coupons nahi mile ya aapke nahi hain!",
        });
      }
    }

    // ─────────────────────────────────────────────
    // STEP 4: Is phone number ka teacher pehle se hai kya, check karo
    // ─────────────────────────────────────────────
    let teacher = await Teacher.findOne({ phone });

    if (teacher && teacher.status === "active") {
      return res.status(400).json({
        success: false,
        message: "Is phone number se ek active teacher account pehle se maujood hai!",
      });
    }

    const inviteToken = crypto.randomBytes(32).toString("hex");
    const inviteTokenExpiry = new Date(Date.now() + INVITE_VALID_DAYS * 24 * 60 * 60 * 1000);

    if (teacher) {
      // ── Pehle se "pending" ya "removed" teacher hai — invite refresh karo ──
      teacher.status = "pending";
      teacher.inviteToken = inviteToken;
      teacher.inviteTokenExpiry = inviteTokenExpiry;
      teacher.parentTeacher = req.teacher._id;
      await teacher.save();
    } else {
      // ── Bilkul naya sub-teacher — placeholder name/email ke sath banao ──
      teacher = new Teacher({
        name: "Pending Teacher",
        email: `pending_${phone}@invite.mocktest.in`,
        phone,
        role: "sub",
        status: "pending",
        parentTeacher: req.teacher._id,
        inviteToken,
        inviteTokenExpiry,
      });
      await teacher.save();
    }

    // ─────────────────────────────────────────────
    // STEP 5: Har assignment ke har subject ke liye CouponAccess bana do
    // (upsert — dobara invite karne par duplicate na bane)
    // ─────────────────────────────────────────────
    const assignedSummary = [];

    for (const { couponId, subjects } of normalizedAssignments) {
      for (const subject of subjects) {
        await CouponAccess.findOneAndUpdate(
          { coupon: couponId, subTeacher: teacher._id, subject },
          { $setOnInsert: { coupon: couponId, subTeacher: teacher._id, subject } },
          { upsert: true, new: true }
        );
      }

      const couponDoc = validCoupons.find((c) => c._id.toString() === couponId);
      assignedSummary.push({
        couponId,
        couponName: couponDoc?.name,
        exam: couponDoc?.exam, // 👈 exam yahin se aa gaya, coupon ke through
        subjects,
      });
    }

    // ─────────────────────────────────────────────
    // STEP 6: Response — sirf token bhejte hain, poora link FRONTEND banayega
    // ─────────────────────────────────────────────
    return res.status(201).json({
      success: true,
      message: "Invite ready hai! Link copy karke sub-teacher ko bhej dijiye.",
      data: {
        teacherId: teacher._id,
        phone: teacher.phone,
        inviteToken,
        inviteTokenExpiry,
        assignedCoupons: assignedSummary,
      },
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "Is phone/email se pehle se koi account maujood hai.",
      });
    }
    console.error("inviteSubTeacher error:", error);
    return res.status(500).json({
      success: false,
      message: "Server mein error aa gaya invite bhejte waqt.",
      error: error.message,
    });
  }
};