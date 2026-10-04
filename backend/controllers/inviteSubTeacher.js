// controllers/inviteSubTeacher.js
// Sirf MAIN TEACHER hi naya sub-teacher invite kar sakta hai.
import crypto from "crypto";
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

const INVITE_VALID_DAYS = 3;

export const inviteSubTeacher = async (req, res) => {
  try {
    // ─────────────────────────────────────────────
    // STEP 0: Sirf Main Teacher
    // ─────────────────────────────────────────────
    if (req.teacher.role !== "main") {
      return res.status(403).json({
        success: false,
        message: "Only a Main Teacher can invite a new sub-teacher!",
      });
    }

    // ─────────────────────────────────────────────
    // STEP 1: Validation
    // ─────────────────────────────────────────────
    const { phone, assignments } = req.body;

    if (!phone) {
      return res.status(400).json({ success: false, message: "Phone number is required!" });
    }
    const cleanPhone = String(phone).trim();
    if (!/^\d{10}$/.test(cleanPhone)) {
      return res.status(400).json({ success: false, message: "Phone number must be exactly 10 digits!" });
    }

    // ─────────────────────────────────────────────
    // STEP 2: assignments validate + normalize
    // Format: [{ couponId, subjects: ["Hindi", "Maths"] }, ...]
    // ─────────────────────────────────────────────
    const normalizedAssignments = [];

    if (assignments !== undefined) {
      if (!Array.isArray(assignments)) {
        return res.status(400).json({ success: false, message: "assignments must be an array!" });
      }

      for (const a of assignments) {
        if (!a || !a.couponId || !Array.isArray(a.subjects) || a.subjects.length === 0) {
          return res.status(400).json({
            success: false,
            message: "Every assignment needs a couponId and at least one subject!",
          });
        }

        if (!mongoose.Types.ObjectId.isValid(a.couponId)) {
          return res.status(400).json({ success: false, message: "Invalid couponId format." });
        }

        const cleanSubjects = a.subjects
          .map((s) => (typeof s === "string" ? normalizeSubject(s) : ""))
          .filter(Boolean);

        if (cleanSubjects.length === 0) {
          return res.status(400).json({ success: false, message: "Subject name cannot be empty!" });
        }

        normalizedAssignments.push({ couponId: a.couponId, subjects: cleanSubjects });
      }
    }

    // ─────────────────────────────────────────────
    // STEP 3: Coupons verify — sabhi is Main Teacher ke hi hone chahiye
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
          message: "One or more coupons were not found or are not yours!",
        });
      }
    }

    // ─────────────────────────────────────────────
    // STEP 4: Teacher record banao / refresh karo
    // ─────────────────────────────────────────────
    let teacher = await Teacher.findOne({ phone: cleanPhone });

    if (teacher) {
      // Admin ka banaya Main Teacher (invite accept karne se pehle "pending")
      // kisi aur main teacher ka sub-teacher nahi banaya ja sakta
      if (teacher.role === "main") {
        return res.status(400).json({
          success: false,
          message: "This phone number belongs to a Main Teacher account — it cannot be made a sub-teacher.",
        });
      }
      if (teacher.status === "active") {
        return res.status(400).json({
          success: false,
          message: "An active teacher account with this phone number already exists!",
        });
      }

      // Pending invite kisi AUR Main Teacher ka ho to hijack na hone do
      if (
        teacher.status === "pending" &&
        teacher.parentTeacher &&
        teacher.parentTeacher.toString() !== req.teacher._id.toString()
      ) {
        return res.status(403).json({
          success: false,
          message: "This phone number is already in another Main Teacher's pending invite.",
        });
      }
    }

    const inviteToken = crypto.randomBytes(32).toString("hex");
    const inviteTokenExpiry = new Date(Date.now() + INVITE_VALID_DAYS * 24 * 60 * 60 * 1000);

    if (teacher) {
      teacher.status = "pending";
      teacher.inviteToken = inviteToken;
      teacher.inviteTokenExpiry = inviteTokenExpiry;
      teacher.parentTeacher = req.teacher._id;
      teacher.role = "sub";
      await teacher.save();
    } else {
      teacher = new Teacher({
        name: "Pending Teacher",
        email: `pending_${cleanPhone}@invite.antimprayash.in`, // 🆕 rebrand
        phone: cleanPhone,
        role: "sub",
        status: "pending",
        parentTeacher: req.teacher._id,
        inviteToken,
        inviteTokenExpiry,
      });
      await teacher.save();
    }

    // ─────────────────────────────────────────────
    // STEP 5: CouponAccess records
    //
    // 🐛 SUBJECT SPELLING FIX: pehle sirf trim hota tha aur exact naam save
    // ho jata tha. Agar yahan "maths" likha aur PYQ blueprint mein "Maths"
    // hua, to sub-teacher us subject ko kabhi fill nahi kar pata tha
    // (403 "authorized nahi hain") — aur galti kahin dikhti bhi nahi thi.
    // Ab batch/blueprint ki maujooda spelling apne aap lag jati hai.
    // ─────────────────────────────────────────────
    const assignedSummary = [];
    const notInBlueprintAll = [];

    for (const { couponId, subjects } of normalizedAssignments) {
      const couponDoc = validCoupons.find((c) => c._id.toString() === couponId);
      const known = await getKnownSubjects(couponId, couponDoc?.exam);

      const finalSubjects = [];
      for (const s of subjects) {
        const { canonical, inBlueprint } = canonicalizeSubject(s, known);
        if (finalSubjects.some((x) => subjectKey(x) === subjectKey(canonical))) continue;
        finalSubjects.push(canonical);
        if (!inBlueprint && !notInBlueprintAll.includes(canonical)) notInBlueprintAll.push(canonical);
      }

      for (const subject of finalSubjects) {
        const existing = await CouponAccess.findOne({
          coupon: couponId,
          subTeacher: teacher._id,
          subject: ciExact(subject),
        });
        if (existing) continue;

        await CouponAccess.create({ coupon: couponId, subTeacher: teacher._id, subject });
      }

      assignedSummary.push({
        couponId,
        couponName: couponDoc?.name,
        exam: couponDoc?.exam,
        subjects: finalSubjects,
      });
    }

    // ─────────────────────────────────────────────
    // STEP 6: Response
    // ─────────────────────────────────────────────
    const warning =
      notInBlueprintAll.length > 0
        ? `⚠️ ${notInBlueprintAll.join(", ")} — this subject is not in the Mock Test blueprint. ` +
          `Questions from these subjects will not appear in auto-generated Mock Tests.`
        : null;

    return res.status(201).json({
      success: true,
      message: "Invite ready! Copy the link and send it to the sub-teacher.",
      warning,
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
        message: "An account with this phone/email already exists.",
      });
    }
    console.error("inviteSubTeacher error:", error);
    return res.status(500).json({
      success: false,
      message: "Server error while sending the invite.",
      error: error.message,
    });
  }
};
