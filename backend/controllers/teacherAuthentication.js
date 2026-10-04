// controllers/teacherAuthentication.js
import Teacher from "../models/Teacher.js";
import { errorDetail } from "../utils/safeError.js"; // 🔒 NAYA (Round 1)
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
// 🔒 Round 1: leaked fallback secret ("mera_super_secret_key") hataya —
// poori wajah utils/jwtSecret.js mein likhi hai.
import { JWT_SECRET } from "../utils/jwtSecret.js";
import { authCookieOptions } from "../utils/cookieOptions.js"; // 👈 NAYA

export const loginTeacher = async (req, res) => {
  try {
    const { email, phone, password } = req.body;

    if ((!email && !phone) || !password) {
      return res.status(400).json({
        success: false,
        message: "Email or phone, and password are required to log in!",
      });
    }

    // Query banana + normalization
    const query = [];
    if (email) query.push({ email: String(email).toLowerCase().trim() });
    if (phone) query.push({ phone: String(phone).trim() });

    const teacher = await Teacher.findOne({ $or: query });

    if (!teacher) {
      return res.status(404).json({
        success: false,
        message: "No account found with this email or phone.",
      });
    }

    // Status check — sirf "active" teacher login kar sakta hai
    if (teacher.status !== "active") {
      // 🐛 FIX: pehle raw status ("pending") dikhta tha jo user ko samajh nahi
      // aata tha. Ab har status ka apna clear message hai.
      const message =
        teacher.status === "pending"
          ? "Your account is not activated yet. Open the invite link from your Main Teacher and set your name/email/password."
          : teacher.status === "removed"
          ? "Your account has been removed by the Main Teacher. Ask them for a new invite."
          : "Your account is not active yet.";
      return res.status(403).json({ success: false, message });
    }

    // 🐛 FIX: agar password set hi nahi hai (adhoora invite flow) to
    // bcrypt.compare crash karke 500 deta tha. Ab clean message.
    if (!teacher.password) {
      return res.status(403).json({
        success: false,
        message: "This account has no password set. Activate your account using the invite link.",
      });
    }

    const isPasswordCorrect = await bcrypt.compare(password, teacher.password);
    if (!isPasswordCorrect) {
      // 🐛 FIX: galat password pe 400 ke bajaye standard 401
      return res.status(401).json({ success: false, message: "Wrong password!" });
    }

    const token = jwt.sign(
      { teacherId: teacher._id },
      JWT_SECRET,
      { expiresIn: "7d" }
    );

    return res
      .status(200)
      .cookie("teacherToken", token, authCookieOptions())
      .json({
        success: true,
        message: "Login successful!",
        data: {
          _id: teacher._id,
          name: teacher.name,
          email: teacher.email,
          phone: teacher.phone,
          role: teacher.role,
          examName: teacher.examName,
        },
      });
  } catch (error) {
    console.error("Teacher Login Error:", error);
    return res.status(500).json({
      success: false,
      message: "Server error while logging in.",
      ...errorDetail(error), // 🔒 production me andar ka detail bahar nahi jata
    });
  }
};
