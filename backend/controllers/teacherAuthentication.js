// controllers/inviteSubTeacher.js
// Sirf MAIN TEACHER hi naya sub-teacher invite kar sakta hai.
// Teacher sirf PHONE NUMBER dalta hai — baaki sab (name, email, password)
// sub-teacher khud invite-link kholke bharega (acceptInvite.js mein).

import mongoose from "mongoose";
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
    const { phone, couponId, subject } = req.body;

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

    // Agar coupon assign karna hai, dono (couponId + subject) sath mein aane chahiye
    if ((couponId && !subject) || (!couponId && subject)) {
      return res.status(400).json({
        success: false,
        message: "Coupon assign karne ke liye couponId aur subject dono zaroori hain!",
      });
    }

    // ─────────────────────────────────────────────
    // STEP 2: Agar coupon diya gaya hai, verify karo ki
    // ye is Main Teacher ka hi coupon hai
    // ─────────────────────────────────────────────
    let coupon = null;
    if (couponId) {
      // 1. Pehle ObjectId format validate karein
      if (!mongoose.Types.ObjectId.isValid(couponId)) {
        return res.status(400).json({
          success: false,
          message: "Invalid Coupon ID format!",
        });
      }
      
      // 2. Phir DB se coupon fetch karein
      coupon = await Coupon.findOne({ _id: couponId, mainTeacher: req.teacher._id });
      if (!coupon) {
        return res.status(404).json({
          success: false,
          message: "Ye coupon nahi mila ya aapka nahi hai!",
        });
      }
    }

    // ─────────────────────────────────────────────
    // STEP 3: Is phone number ka teacher pehle se hai kya, check karo
    // ─────────────────────────────────────────────
    let teacher = await Teacher.findOne({ phone });

    if (teacher && teacher.status === "active") {
      return res.status(400).json({
        success: false,
        message: "Is phone number se ek active teacher account pehle se maujood hai!",
      });
    }

    // Naya invite token — 3 din ke liye valid
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
        examName: req.teacher.examName, // 👈 FIX: Main teacher ka examName assign kiya
        inviteToken,
        inviteTokenExpiry,
      });
      await teacher.save();
    }

    // ─────────────────────────────────────────────
    // STEP 4: Agar coupon+subject diya gaya tha, CouponAccess record bana do
    // ─────────────────────────────────────────────
    let couponAssigned = false;
    if (coupon) {
      await CouponAccess.findOneAndUpdate(
        { coupon: coupon._id, subTeacher: teacher._id, subject: subject.trim() },
        { $setOnInsert: { coupon: coupon._id, subTeacher: teacher._id, subject: subject.trim() } },
        { upsert: true, new: true }
      );
      
      // 👇 FIX: Subject ko teacher.assignedSubjects mein bhi add kar do
      if (!teacher.assignedSubjects.includes(subject.trim())) {
        teacher.assignedSubjects.push(subject.trim());
        await teacher.save();
      }

      couponAssigned = true;
    }

    // ─────────────────────────────────────────────
    // STEP 5: Response
    // ─────────────────────────────────────────────
    return res.status(201).json({
      success: true,
      message: "Invite ready hai! Link copy karke sub-teacher ko bhej dijiye.",
      data: {
        teacherId: teacher._id,
        phone: teacher.phone,
        inviteToken,
        inviteTokenExpiry,
        couponAssigned,
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