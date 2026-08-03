// controllers/sendSignupOtp.js
import User from "../models/User.js";
import { createAndSendOtp } from "../utils/otpService.js";

export const sendSignupOtp = async (req, res) => {
    try {
        const { phone } = req.body;

        if (!phone || phone.length !== 10) {
            return res.status(400).json({ success: false, message: "Sahi 10-digit phone number dalein!" });
        }

        const existingUser = await User.findOne({ phone });
        if (existingUser) {
            return res.status(400).json({
                success: false,
                message: "Is phone number se account pehle hi bana hua hai!",
            });
        }

        await createAndSendOtp(phone, "signup");

        return res.status(200).json({ success: true, message: "OTP bhej diya gaya hai!" });
    } catch (error) {
        console.error("sendSignupOtp error:", error);
        return res.status(error.statusCode || 500).json({
            success: false,
            message: error.statusCode ? error.message : "OTP bhejte waqt error aaya.",
        });
    }
};