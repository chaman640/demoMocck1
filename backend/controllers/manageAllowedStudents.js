// backend/controllers/manageAllowedStudents.js
//
// 🆕 NAYA — Main Teacher apne batch ke liye students pehle se add kar
// sakta hai (naam optional, phone/email mein se ek zaroori). Jaise hi
// pehla student add hota hai, batch "invite-only" ban jaata hai.
import mongoose from "mongoose";
import Coupon from "../models/Coupon.js";
import AllowedStudent from "../models/AllowedStudent.js";

// Sirf Main Teacher, aur sirf apne khud ke coupon ke liye
const verifyCouponOwnership = async (teacher, couponId) => {
  if (!mongoose.Types.ObjectId.isValid(couponId)) {
    return { allowed: false, status: 400, message: "Invalid batch ID." };
  }
  if (teacher.role !== "main") {
    return { allowed: false, status: 403, message: "Sirf Main Teacher students manage kar sakta hai." };
  }
  const coupon = await Coupon.findOne({ _id: couponId, mainTeacher: teacher._id });
  if (!coupon) {
    return { allowed: false, status: 404, message: "Ye batch nahi mila ya aapka nahi hai." };
  }
  return { allowed: true, coupon };
};

// POST /teacher/batch-students  { couponId, name, phone, email }
export const addAllowedStudent = async (req, res) => {
  try {
    const { couponId, name, phone, email } = req.body;

    const check = await verifyCouponOwnership(req.teacher, couponId);
    if (!check.allowed) return res.status(check.status).json({ success: false, message: check.message });

    const normalizedPhone = phone ? String(phone).trim() : null;
    const normalizedEmail = email ? String(email).toLowerCase().trim() : null;

    if (!normalizedPhone && !normalizedEmail) {
      return res.status(400).json({ success: false, message: "Phone ya email mein se ek zaroori hai!" });
    }
    if (normalizedPhone && !/^\d{10}$/.test(normalizedPhone)) {
      return res.status(400).json({ success: false, message: "Phone number bilkul 10 anko ka hona chahiye!" });
    }
    if (normalizedEmail && !/^\S+@\S+\.\S+$/.test(normalizedEmail)) {
      return res.status(400).json({ success: false, message: "Sahi email daalein!" });
    }

    // Isi batch mein ye phone/email pehle se to nahi hai
    const dupConditions = [];
    if (normalizedPhone) dupConditions.push({ phone: normalizedPhone });
    if (normalizedEmail) dupConditions.push({ email: normalizedEmail });
    const existing = await AllowedStudent.findOne({ coupon: couponId, $or: dupConditions });
    if (existing) {
      return res.status(409).json({ success: false, message: "Ye student is batch mein pehle se add hai!" });
    }

    const created = await AllowedStudent.create({
      coupon: couponId,
      name: name ? String(name).trim() : null,
      phone: normalizedPhone,
      email: normalizedEmail,
      addedBy: req.teacher._id,
    });

    return res.status(201).json({ success: true, message: "Student add ho gaya!", data: created });
  } catch (error) {
    console.error("addAllowedStudent error:", error);
    return res.status(500).json({ success: false, message: "Student add karte waqt error aaya." });
  }
};

// GET /teacher/batch-students/:couponId
export const listAllowedStudents = async (req, res) => {
  try {
    const { couponId } = req.params;
    const check = await verifyCouponOwnership(req.teacher, couponId);
    if (!check.allowed) return res.status(check.status).json({ success: false, message: check.message });

    const students = await AllowedStudent.find({ coupon: couponId }).sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      data: students.map((s) => ({
        _id: s._id,
        name: s.name,
        phone: s.phone,
        email: s.email,
        joined: !!s.matchedUser,
        addedAt: s.createdAt,
      })),
    });
  } catch (error) {
    console.error("listAllowedStudents error:", error);
    return res.status(500).json({ success: false, message: "List fetch karte waqt error aaya." });
  }
};

// DELETE /teacher/batch-students/:id
export const deleteAllowedStudent = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: "Invalid ID" });
    }

    const entry = await AllowedStudent.findById(id);
    if (!entry) return res.status(404).json({ success: false, message: "Ye entry nahi mili." });

    const check = await verifyCouponOwnership(req.teacher, entry.coupon);
    if (!check.allowed) return res.status(check.status).json({ success: false, message: check.message });

    await AllowedStudent.deleteOne({ _id: id });
    return res.status(200).json({ success: true, message: "Student hata diya gaya." });
  } catch (error) {
    console.error("deleteAllowedStudent error:", error);
    return res.status(500).json({ success: false, message: "Delete karte waqt error aaya." });
  }
};
