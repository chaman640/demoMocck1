// controllers/acceptInvite.js
// PUBLIC route — teacher (main ya sub) ke paas abhi tak koi account/session
// nahi hai, isliye ye teacherInfo middleware ke BINA chalega.
import bcrypt from "bcrypt";
import { errorDetail } from "../utils/safeError.js";
import jwt from "jsonwebtoken";
import { JWT_SECRET } from "../utils/jwtSecret.js";
import Teacher from "../models/Teacher.js";
import { authCookieOptions } from "../utils/cookieOptions.js";

export const acceptInvite = async (req, res) => {
  try {
    const { token, name, email, password } = req.body;

    // ─────────────────────────────────────────────
    // STEP 1: Validation
    // ─────────────────────────────────────────────
    if (!token) {
      return res.status(400).json({
        success: false,
        message: "Invite token is required!",
      });
    }
    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        message: "Name, email and password are required!",
      });
    }
    if (String(password).length < 6) {
      return res.status(400).json({
        success: false,
        message: "Password must be at least 6 characters!",
      });
    }

    const normalizedEmail = String(email).toLowerCase().trim();
    if (!/^\S+@\S+\.\S+$/.test(normalizedEmail)) {
      return res.status(400).json({ success: false, message: "Please enter a valid email!" });
    }

    // ─────────────────────────────────────────────
    // STEP 2: Token se teacher dhundo
    // ─────────────────────────────────────────────
    const teacher = await Teacher.findOne({ inviteToken: token });

    if (!teacher) {
      return res.status(400).json({
        success: false,
        message: "This invite link is invalid.",
      });
    }

    if (teacher.status !== "pending") {
      return res.status(400).json({
        success: false,
        message: "This invite link has already been used.",
      });
    }

    if (!teacher.inviteTokenExpiry || teacher.inviteTokenExpiry < new Date()) {
      return res.status(410).json({
        success: false,
        message:
          teacher.role === "main"
            ? "This invite link has expired. Ask the admin for a new link."
            : "This invite link has expired. Ask your Main Teacher for a new link.",
      });
    }

    // ─────────────────────────────────────────────
    // STEP 3: Email kisi aur teacher ke paas to nahi hai
    // 🆕 Main Teacher invite mein email pehle se hi asli hota hai (admin ne
    // wahi diya tha), isliye check bas dusre kisi doosre teacher account se
    // clash na ho ye dekhta hai — apna khud ka email bhi allow hai.
    // ─────────────────────────────────────────────
    const emailTaken = await Teacher.findOne({
      email: normalizedEmail,
      _id: { $ne: teacher._id },
    });
    if (emailTaken) {
      return res.status(400).json({
        success: false,
        message: "This email is already linked to another teacher account!",
      });
    }

    // ─────────────────────────────────────────────
    // STEP 4: Password hash karke teacher ko activate karo
    // ─────────────────────────────────────────────
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    teacher.name = String(name).trim();
    teacher.email = normalizedEmail;
    teacher.password = hashedPassword;
    teacher.status = "active";
    teacher.inviteToken = null;
    teacher.inviteTokenExpiry = null;

    // 🐛 FIX: pehle ye line role ko HAMESHA "sub" kar deti thi, chahe invite
    // Main Teacher ka hi kyun na ho ("teacher.role !== 'sub' → 'sub'"). Isse
    // Admin ke banaye Main Teacher invite bhi accept hote hi sub-teacher ban
    // jaate — sirf tab default lagao jab role vaaki dono valid values mein
    // se koi na ho (corrupted/missing data ka fallback).
    if (teacher.role !== "sub" && teacher.role !== "main") teacher.role = "sub";

    await teacher.save();

    // ─────────────────────────────────────────────
    // STEP 5: Auto-login — JWT + cookie
    // ─────────────────────────────────────────────
    const jwtToken = jwt.sign(
      { teacherId: teacher._id },
      JWT_SECRET,
      { expiresIn: "7d" }
    );

    return res
      .status(200)
      .cookie("teacherToken", jwtToken, authCookieOptions())
      .json({
        success: true,
        message: "Account activated! You are now logged in.",
        data: {
          _id: teacher._id,
          name: teacher.name,
          email: teacher.email,
          phone: teacher.phone,
          role: teacher.role,
          parentTeacher: teacher.parentTeacher,
        },
      });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "This email is already registered.",
      });
    }
    console.error("acceptInvite error:", error);
    return res.status(500).json({
      success: false,
      message: "Server error while activating the account.",
      ...errorDetail(error),
    });
  }
};
