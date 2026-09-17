// controllers/sendSignupOtp.js
//
// 🆕 CHANGE — pehle phone par SMS OTP jaata tha, ab email par (free).
import User from "../models/User.js";
import { createAndSendOtp } from "../utils/otpService.js";

export const sendSignupOtp = async (req, res) => {
    try {
        const { email } = req.body;

        if (!email || !/^\S+@\S+\.\S+$/.test(String(email).trim())) {
            return res.status(400).json({ success: false, message: "Sahi email address dalein!" });
        }

        const normalizedEmail = String(email).toLowerCase().trim();

        const existingUser = await User.findOne({ email: normalizedEmail });
        if (existingUser) {
            return res.status(400).json({
                success: false,
                message: "Is email se account pehle hi bana hua hai!",
            });
        }

        await createAndSendOtp(normalizedEmail, "signup");

        return res.status(200).json({ success: true, message: "OTP email par bhej diya gaya hai!" });
    } catch (error) {
        console.error("sendSignupOtp error:", error);
        return res.status(error.statusCode || 500).json({
            success: false,
            message: error.statusCode ? error.message : "OTP bhejte waqt error aaya.",
        });
    }
};
