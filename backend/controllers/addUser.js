// controllers/addUser.js
import User from "../models/User.js";
import Coupon from "../models/Coupon.js"; // 🆕 coupon-based signup ke liye
import jwt from "jsonwebtoken";
import { JWT_SECRET } from "../utils/jwtSecret.js";
import bcrypt from "bcrypt";
import { verifyOtpCode } from "../utils/otpService.js";
import { authCookieOptions } from "../utils/cookieOptions.js";

export const addUser = async (req, res) => {
  try {
    const { name, email, phone, password, address, exam, couponCode, otp } = req.body;

    // 1. Validation — 🆕 ab "exam" ya "couponCode" mein se koi EK hona zaroori hai
    if (!name || !email || !phone || !password || !address || !otp) {
      return res.status(400).json({
        success: false,
        message: "Sabhi fields bharna zaroori hai!",
      });
    }
    if (!exam && !couponCode) {
      return res.status(400).json({
        success: false,
        message: "Exam chunein ya coupon code dalein!",
      });
    }
    if (exam && couponCode) {
      return res.status(400).json({
        success: false,
        message: "Exam aur coupon code dono ek saath nahi — koi ek chunein!",
      });
    }

    if (String(password).length < 6) {
      return res.status(400).json({
        success: false,
        message: "Password kam se kam 6 characters ka hona chahiye!",
      });
    }

    const normalizedEmail = String(email).toLowerCase().trim();
    const normalizedPhone = String(phone).trim();

    if (!/^\d{10}$/.test(normalizedPhone)) {
      return res.status(400).json({
        success: false,
        message: "Phone number bilkul 10 anko ka hona chahiye!",
      });
    }

    // 2. Duplicate check
    const existingUser = await User.findOne({
      $or: [{ email: normalizedEmail }, { phone: normalizedPhone }],
    });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: "Is email ya phone number se account pehle hi bana hua hai!",
      });
    }

    // 3. 🆕 Coupon code diya hai to usse hi exam derive karo (aur account ko
    // seedha us batch mein enroll bhi kar do — alag se "redeem" karne ki
    // zaroorat nahi padegi)
    let resolvedExam = exam;
    let coupon = null;
    if (couponCode) {
      coupon = await Coupon.findOne({ code: String(couponCode).trim().toUpperCase() });
      if (!coupon) {
        return res.status(404).json({
          success: false,
          message: "Ye coupon code nahi mila. Sahi code check karein.",
        });
      }
      resolvedExam = coupon.exam;
    }

    // 4. OTP verify — email ke against verify hota hai
    await verifyOtpCode(normalizedEmail, "signup", otp);

    // 5. Password hash
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // 6. Save — 🆕 coupon wale case mein activeCoupon + couponHistory bhi
    // yahin set ho jaata hai, seedha signup ke sath hi
    const newUser = new User({
      name: String(name).trim(),
      email: normalizedEmail,
      phone: normalizedPhone,
      password: hashedPassword,
      address: String(address).trim(),
      exam: resolvedExam,
      ...(coupon && {
        activeCoupon: coupon._id,
        couponHistory: [{ coupon: coupon._id, examNameAtJoin: resolvedExam, joinedAt: new Date(), leftAt: null }],
      }),
    });
    await newUser.save();

    // 7. JWT + cookie (auto-login)
    const token = jwt.sign(
      { userId: newUser._id },
      JWT_SECRET,
      { expiresIn: "7d" }
    );

    return res
      .status(201)
      .cookie("token", token, authCookieOptions())
      .json({
        success: true,
        message: coupon
          ? `Account ban gaya aur '${coupon.name}' batch mein enroll ho gaye!`
          : "User successfully registered & logged in!",
        data: {
          _id: newUser._id,
          name: newUser.name,
          email: newUser.email,
          phone: newUser.phone,
          exam: newUser.exam,
          activeCoupon: newUser.activeCoupon || null,
        },
      });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "Is email ya phone se account pehle hi maujood hai.",
      });
    }
    console.error("Signup Error:", error);
    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.statusCode ? error.message : "Internal Server Error",
    });
  }
};
