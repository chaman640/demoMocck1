// controllers/inviteSubTeacher.js
// Sirf MAIN TEACHER hi naya sub-teacher invite kar sakta hai.
// Teacher sirf PHONE NUMBER aur ASSIGNMENTS (Array of coupon & subject) dalta hai.
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
    // STEP 1: Validation — Phone aur Assignments Array
    // ─────────────────────────────────────────────
    const { phone, assignments } = req.body; 
    // assignments format expect kar rahe hain: [{ couponId: "...", subject: "..." }, ...]

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

    if (assignments && !Array.isArray(assignments)) {
      return res.status(400).json({
        success: false,
        message: "Assignments ek array (list) hona chahiye!",
      });
    }

    // ─────────────────────────────────────────────
    // STEP 2: Saare Coupons Verify karo ki wo is Main Teacher ke hi hain
    // ─────────────────────────────────────────────
    if (assignments && assignments.length > 0) {
      const uniqueCouponIds = new Set();

      for (const item of assignments) {
        if (!item.couponId || !item.subject) {
          return res.status(400).json({
            success: false,
            message: "Har assignment mein couponId aur subject dono zaroori hain!",
          });
        }
        if (!mongoose.Types.ObjectId.isValid(item.couponId)) {
          return res.status(400).json({
            success: false,
            message: `Invalid Coupon ID format: ${item.couponId}`,
          });
        }
        uniqueCouponIds.add(item.couponId);
      }

      // Main Teacher ke database mein in IDs ko verify karna
      const couponIdsArray = Array.from(uniqueCouponIds);
      const validCouponsCount = await Coupon.countDocuments({
        _id: { $in: couponIdsArray },
        mainTeacher: req.teacher._id,
      });

      if (validCouponsCount !== couponIdsArray.length) {
        return res.status(404).json({
          success: false,
          message: "Ek ya usse zyada coupons invalid hain ya aapke nahi hain!",
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

    // Extract all unique subjects from assignments to update 'assignedSubjects'
    const subjectsToAssign = assignments ? [...new Set(assignments.map(a => a.subject.trim()))] : [];

    if (teacher) {
      // ── Pehle se "pending" ya "removed" teacher hai — invite refresh karo ──
      teacher.status = "pending";
      teacher.inviteToken = inviteToken;
      teacher.inviteTokenExpiry = inviteTokenExpiry;
      teacher.parentTeacher = req.teacher._id;

      // Update assigned subjects directly in Teacher Document
      subjectsToAssign.forEach(sub => {
        if (!teacher.assignedSubjects.includes(sub)) {
          teacher.assignedSubjects.push(sub);
        }
      });

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
        examName: req.teacher.examName, // Main teacher ka examName assign kiya
        assignedSubjects: subjectsToAssign, // Direct array save kiya
        inviteToken,
        inviteTokenExpiry,
      });
      await teacher.save();
    }

    // ─────────────────────────────────────────────
    // STEP 4: Har assignment ke liye CouponAccess record banao
    // ─────────────────────────────────────────────
    let totalAssignmentsDone = 0;
    if (assignments && assignments.length > 0) {
      // Loop chala kar sabhi coupon + subject combinations ko insert karenge
      for (const item of assignments) {
        await CouponAccess.findOneAndUpdate(
          { coupon: item.couponId, subTeacher: teacher._id, subject: item.subject.trim() },
          { $setOnInsert: { coupon: item.couponId, subTeacher: teacher._id, subject: item.subject.trim() } },
          { upsert: true, new: true }
        );
      }
      totalAssignmentsDone = assignments.length;
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
        assignmentsAdded: totalAssignmentsDone,
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