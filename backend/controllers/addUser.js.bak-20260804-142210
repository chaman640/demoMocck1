// controllers/addUser.js
import User from "../models/User.js";
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
import { verifyOtpCode } from "../utils/otpService.js";
import { authCookieOptions } from "../utils/cookieOptions.js"; // 👈 NAYA

export const addUser = async (req, res) => {
  try {
    const { name, email, phone, password, address, exam, otp } = req.body;

    // 1. Validation
    if (!name || !email || !phone || !password || !address || !exam || !otp) {
      return res.status(400).json({
        success: false,
        message: "Sabhi fields bharna zaroori hai!",
      });
    }

    // 🐛 FIX: pehle backend password length check nahi karta tha — sirf frontend
    // pe validation thi, matlab Postman se 1-char password chal jata tha.
    if (String(password).length < 6) {
      return res.status(400).json({
        success: false,
        message: "Password kam se kam 6 characters ka hona chahiye!",
      });
    }

    // 🐛 FIX: phone/email normalize karo, warna " 9876543210" jaise input se
    // duplicate account ban sakte the (unique index bhi bach jata tha)
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

    // 3. OTP verify — galat/expire OTP par account NAHI banega
    await verifyOtpCode(normalizedPhone, "signup", otp);

    // 4. Password hash
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // 5. Save
    const newUser = new User({
      name: String(name).trim(),
      email: normalizedEmail,
      phone: normalizedPhone,
      password: hashedPassword,
      address: String(address).trim(),
      exam,
    });
    await newUser.save();

    // 6. JWT + cookie (auto-login)
    const token = jwt.sign(
      { userId: newUser._id },
      process.env.JWT_SECRET || "mera_super_secret_key",
      { expiresIn: "7d" }
    );

    // 🐛 FIX: pehle yahan `secure: true` hardcoded tha — local http dev pe
    // browser cookie set hi nahi karta tha, isliye signup ke turant baad
    // har API call 401 deti thi.
    return res
      .status(201)
      .cookie("token", token, authCookieOptions())
      .json({
        success: true,
        message: "User successfully registered & logged in!",
        data: {
          _id: newUser._id,
          name: newUser.name,
          email: newUser.email,
          phone: newUser.phone,
          exam: newUser.exam,
        },
      });
  } catch (error) {
    // Duplicate-key race condition
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
