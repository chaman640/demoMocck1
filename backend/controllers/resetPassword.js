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
            return res.status(400).json({ success: false, message: "Sabhi fields zaroori hain!" });
        }
        if (newPassword.length < 6) {
            return res.status(400).json({ success: false, message: "Password kam se kam 6 characters ka hona chahiye!" });
        }

        const normalizedEmail = String(email).toLowerCase().trim();

        const user = await User.findOne({ email: normalizedEmail });
        if (!user) {
            return res.status(404).json({ success: false, message: "Is email se koi account nahi mila." });
        }

        // OTP verify — galat/expired/missing OTP par password reset NAHI hoga
        await verifyOtpCode(normalizedEmail, "reset", otp);

        const salt = await bcrypt.genSalt(10);
        user.password = await bcrypt.hash(newPassword, salt);
        await user.save();

        return res.status(200).json({ success: true, message: "Password successfully reset ho gaya! Ab login karein." });
    } catch (error) {
        console.error("resetPassword error:", error);
        return res.status(error.statusCode || 500).json({
            success: false,
            message: error.statusCode ? error.message : "Password reset karte waqt error aaya.",
        });
    }
};
