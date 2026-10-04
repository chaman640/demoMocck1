// controllers/addUser.js
import User from "../models/User.js";
import Coupon from "../models/Coupon.js";
import Promoter from "../models/Promoter.js";
import jwt from "jsonwebtoken";
import { JWT_SECRET } from "../utils/jwtSecret.js";
import bcrypt from "bcrypt";
import { verifyOtpCode } from "../utils/otpService.js";
import { authCookieOptions } from "../utils/cookieOptions.js";
import { checkAndMatchAllowedStudent } from "../utils/batchAccess.js";

export const addUser = async (req, res) => {
  try {
    const { name, email, phone, password, address, exam, code, couponCode, otp } = req.body;
    const rawCode = code || couponCode;

    if (!name || !email || !phone || !password || !address || !otp) {
      return res.status(400).json({
        success: false,
        message: "All fields are required!",
      });
    }
    if (!exam && !rawCode) {
      return res.status(400).json({
        success: false,
        message: "Choose an exam or enter a code!",
      });
    }

    if (String(password).length < 6) {
      return res.status(400).json({
        success: false,
        message: "Password must be at least 6 characters!",
      });
    }

    const normalizedEmail = String(email).toLowerCase().trim();
    const normalizedPhone = String(phone).trim();

    if (!/^\d{10}$/.test(normalizedPhone)) {
      return res.status(400).json({
        success: false,
        message: "Phone number must be exactly 10 digits!",
      });
    }

    const existingUser = await User.findOne({
      $or: [{ email: normalizedEmail }, { phone: normalizedPhone }],
    });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: "An account with this email or phone number already exists!",
      });
    }

    let resolvedExam = exam;
    let coupon = null;
    let promoterDoc = null;
    let referrerDoc = null;

    if (rawCode) {
      const trimmedCode = String(rawCode).trim().toUpperCase();
      coupon = await Coupon.findOne({ code: trimmedCode });

      if (coupon) {
        resolvedExam = coupon.exam;

        const accessCheck = await checkAndMatchAllowedStudent(coupon._id, {
          phone: normalizedPhone,
          email: normalizedEmail,
        });
        if (!accessCheck.allowed) {
          return res.status(403).json({
            success: false,
            message: "You are not in this batch. Contact your teacher.",
          });
        }
      } else {
        promoterDoc = await Promoter.findOne({ code: trimmedCode, status: "active" });
        // Na batch, na promoter → kisi student ka referral code ho sakta hai
        if (!promoterDoc) {
          referrerDoc = await User.findOne({ referralCode: trimmedCode }).select("_id");
        }
        if (!promoterDoc && !referrerDoc) {
          return res.status(404).json({
            success: false,
            message: "This code is not valid. Check the teacher, promoter or friend's referral code.",
          });
        }
        if (!exam) {
          return res.status(400).json({
            success: false,
            message: "Exam name is required!",
          });
        }
        resolvedExam = exam;
      }
    }

    await verifyOtpCode(normalizedEmail, "signup", otp);

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

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
      ...(promoterDoc && { promoter: promoterDoc._id }),
      ...(referrerDoc && { referredBy: referrerDoc._id }),
    });
    await newUser.save();

    if (coupon) {
      await checkAndMatchAllowedStudent(coupon._id, { phone: normalizedPhone, email: normalizedEmail }, newUser._id);
    }
    if (promoterDoc) {
      await Promoter.updateOne({ _id: promoterDoc._id }, { $inc: { totalStudents: 1 } });
    }

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
          ? `Account created and enrolled in batch '${coupon.name}'!`
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
        message: "An account with this email or phone already exists.",
      });
    }
    console.error("Signup Error:", error);
    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.statusCode ? error.message : "Internal Server Error",
    });
  }
};