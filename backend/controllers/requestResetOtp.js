// controllers/requestResetOtp.js
import User from "../models/User.js";
import { createAndSendOtp } from "../utils/otpService.js";

export const requestResetOtp = async (req, res) => {
    try {
        const { phone } = req.body;

        if (!phone || phone.length !== 10) {
            return res.status(400).json({ success: false, message: "Sahi 10-digit phone number dalein!" });
        }

        const user = await User.findOne({ phone });
        if (!user) {
            return res.status(404).json({
                success: false,
                message: "Is phone number se koi account nahi mila.",
            });
        }

        await createAndSendOtp(phone, "reset");

        return res.status(200).json({ success: true, message: "OTP bhej diya gaya hai!" });
    } catch (error) {
        console.error("requestResetOtp error:", error);
        return res.status(error.statusCode || 500).json({
            success: false,
            message: error.statusCode ? error.message : "OTP bhejte waqt error aaya.",
        });
    }
};