// controllers/resetPassword.js
//
// 🆕 CHANGE — pehle phone se lookup hota tha, ab email se.
import User from "../models/User.js";
import bcrypt from "bcrypt";
import { verifyOtpCode } from "../utils/otpService.js";

export const resetPassword = async (req, res) => {
    try {
        const { email, otp, newPassword } = req.body;

        if (!email || !otp || !newPassword) {
            return res.status(400).json({ success: false, message: "All fields are required!" });
        }
        if (String(newPassword).length < 6) {
            return res.status(400).json({ success: false, message: "Password must be at least 6 characters!" });
        }

        const normalizedEmail = String(email).toLowerCase().trim();

        const user = await User.findOne({ email: normalizedEmail });
        if (!user) {
            return res.status(404).json({ success: false, message: "No account found with this email." });
        }

        // OTP verify — galat/expired/missing OTP par password reset NAHI hoga
        await verifyOtpCode(normalizedEmail, "reset", otp);

        const salt = await bcrypt.genSalt(10);
        user.password = await bcrypt.hash(String(newPassword), salt);
        user.passwordChangedAt = new Date(); // purane sabhi login sessions band
        await user.save();

        return res.status(200).json({ success: true, message: "Password reset successfully! Please log in now." });
    } catch (error) {
        console.error("resetPassword error:", error);
        return res.status(error.statusCode || 500).json({
            success: false,
            message: error.statusCode ? error.message : "Error while resetting the password.",
        });
    }
};
