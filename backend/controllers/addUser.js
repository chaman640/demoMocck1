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
        message: "Sabhi fields bharna zaroori hai!",
      });
    }
    if (!exam && !rawCode) {
      return res.status(400).json({
        success: false,
        message: "Exam chunein ya code dalein!",
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

    const existingUser = await User.findOne({
      $or: [{ email: normalizedEmail }, { phone: normalizedPhone }],
    });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: "Is email ya phone number se account pehle hi bana hua hai!",
      });
    }

    let resolvedExam = exam;
    let coupon = null;
    let promoterDoc = null;

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
            message: "Aap is batch mein nahi hain. Apne teacher se sampark karein.",
          });
        }
      } else {
        promoterDoc = await Promoter.findOne({ code: trimmedCode, status: "active" });
        if (!promoterDoc) {
          return res.status(404).json({
            success: false,
            message: "Ye code sahi nahi hai. Sahi teacher ya promoter code check karein.",
          });
        }
        if (!exam) {
          return res.status(400).json({
            success: false,
            message: "Exam ka naam dalna zaroori hai!",
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