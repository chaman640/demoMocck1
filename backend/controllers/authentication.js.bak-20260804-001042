// controllers/authentication.js
import User from "../models/User.js";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { authCookieOptions } from "../utils/cookieOptions.js"; // 👈 NAYA

export const loginUser = async (req, res) => {
  try {
    const { phone, password } = req.body;

    if (!phone || !password) {
      return res.status(400).json({
        success: false,
        message: "Phone number aur password dono bharna zaroori hai!",
      });
    }

    // 🐛 FIX: trim() — signup mein number trim hoke save hota hai, lekin login
    // mein nahi hota tha; extra space wale input pe "account nahi mila" aata tha.
    const normalizedPhone = String(phone).trim();

    const user = await User.findOne({ phone: normalizedPhone });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "Is number se koi account nahi mila. Kripya pehle signup karein.",
      });
    }

    // 🐛 FIX: safety guard — agar kisi purane doc mein password missing ho
    // to bcrypt.compare throw karke 500 de deta tha
    if (!user.password) {
      return res.status(400).json({
        success: false,
        message: "Is account ka password set nahi hai. 'Password bhool gaye?' se reset karein.",
      });
    }

    const isPasswordCorrect = await bcrypt.compare(password, user.password);
    if (!isPasswordCorrect) {
      return res.status(401).json({
        success: false,
        message: "Galat password! Kripya sahi password darj karein.",
      });
    }

    const token = jwt.sign(
      { userId: user._id },
      process.env.JWT_SECRET || "mera_super_secret_key",
      { expiresIn: "7d" }
    );

    return res
      .status(200)
      .cookie("token", token, authCookieOptions())
      .json({
        success: true,
        message: "Login successful!",
        data: {
          _id: user._id,
          name: user.name,
          email: user.email,
          phone: user.phone,
          exam: user.exam,
        },
      });
  } catch (error) {
    console.error("Login Error:", error);
    return res.status(500).json({ success: false, message: "Internal Server Error" });
  }
};
