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
      return res.status(400).json({ success: false, message: "Enter a valid email address!" });
    }

    const normalizedEmail = String(email).toLowerCase().trim();

    const teacher = await Teacher.findOne({ email: normalizedEmail, status: "active" });
    if (!teacher) {
      return res.status(404).json({
        success: false,
        message: "No active teacher account found with this email.",
      });
    }

    await createAndSendOtp(normalizedEmail, "teacher_reset");

    return res.status(200).json({ success: true, message: "OTP sent to your email!" });
  } catch (error) {
    console.error("requestTeacherResetOtp error:", error);
    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.statusCode ? error.message : "Error while sending the OTP.",
    });
  }
};

// POST /teacher/reset-password
export const resetTeacherPassword = async (req, res) => {
  try {
    const { email, otp, newPassword } = req.body;

    if (!email || !otp || !newPassword) {
      return res.status(400).json({ success: false, message: "All fields are required!" });
    }
    if (String(newPassword).length < 6) {
      return res.status(400).json({ success: false, message: "Password must be at least 6 characters!" });
    }

    const normalizedEmail = String(email).toLowerCase().trim();

    const teacher = await Teacher.findOne({ email: normalizedEmail, status: "active" });
    if (!teacher) {
      return res.status(404).json({ success: false, message: "No active teacher account found with this email." });
    }

    await verifyOtpCode(normalizedEmail, "teacher_reset", otp);

    const salt = await bcrypt.genSalt(10);
    teacher.password = await bcrypt.hash(String(newPassword), salt);
    teacher.passwordChangedAt = new Date(); // purane sabhi login sessions band
    await teacher.save();

    return res.status(200).json({ success: true, message: "Password reset successfully! Please log in now." });
  } catch (error) {
    console.error("resetTeacherPassword error:", error);
    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.statusCode ? error.message : "Error while resetting the password.",
    });
  }
};
