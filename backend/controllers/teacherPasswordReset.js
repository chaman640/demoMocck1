// backend/controllers/teacherPasswordReset.js
//
// 🆕 NAYA — Teacher ke liye forgot-password flow, student wale jaisa hi,
// email OTP se (otpService reuse kiya hai, purpose: "teacher_reset").
import Teacher from "../models/Teacher.js";
import bcrypt from "bcrypt";
import { createAndSendOtp, verifyOtpCode } from "../utils/otpService.js";

// POST /teacher/request-reset-otp
export const requestTeacherResetOtp = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email || !/^\S+@\S+\.\S+$/.test(String(email).trim())) {
      return res.status(400).json({ success: false, message: "Sahi email address dalein!" });
    }

    const normalizedEmail = String(email).toLowerCase().trim();

    const teacher = await Teacher.findOne({ email: normalizedEmail, status: "active" });
    if (!teacher) {
      return res.status(404).json({
        success: false,
        message: "Is email se koi active teacher account nahi mila.",
      });
    }

    await createAndSendOtp(normalizedEmail, "teacher_reset");

    return res.status(200).json({ success: true, message: "OTP email par bhej diya gaya hai!" });
  } catch (error) {
    console.error("requestTeacherResetOtp error:", error);
    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.statusCode ? error.message : "OTP bhejte waqt error aaya.",
    });
  }
};

// POST /teacher/reset-password
export const resetTeacherPassword = async (req, res) => {
  try {
    const { email, otp, newPassword } = req.body;

    if (!email || !otp || !newPassword) {
      return res.status(400).json({ success: false, message: "Sabhi fields zaroori hain!" });
    }
    if (String(newPassword).length < 6) {
      return res.status(400).json({ success: false, message: "Password kam se kam 6 characters ka hona chahiye!" });
    }

    const normalizedEmail = String(email).toLowerCase().trim();

    const teacher = await Teacher.findOne({ email: normalizedEmail, status: "active" });
    if (!teacher) {
      return res.status(404).json({ success: false, message: "Is email se koi active teacher account nahi mila." });
    }

    await verifyOtpCode(normalizedEmail, "teacher_reset", otp);

    const salt = await bcrypt.genSalt(10);
    teacher.password = await bcrypt.hash(newPassword, salt);
    await teacher.save();

    return res.status(200).json({ success: true, message: "Password successfully reset ho gaya! Ab login karein." });
  } catch (error) {
    console.error("resetTeacherPassword error:", error);
    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.statusCode ? error.message : "Password reset karte waqt error aaya.",
    });
  }
};
