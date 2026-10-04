// controllers/addTeacher.js  — Main Teacher signup
import Teacher from "../models/Teacher.js";
import jwt from "jsonwebtoken";
// 🔒 Round 1: leaked fallback secret ("mera_super_secret_key") hataya —
// poori wajah utils/jwtSecret.js mein likhi hai.
import { JWT_SECRET } from "../utils/jwtSecret.js";
import bcrypt from "bcrypt";
import { authCookieOptions } from "../utils/cookieOptions.js"; // 👈 NAYA

export const addTeacher = async (req, res) => {
  try {
    const { name, email, phone, password, examName } = req.body;

    // 1. Basic validation
    if (!name || !email || !phone || !password) {
      return res.status(400).json({
        success: false,
        message: "All fields are required!",
      });
    }

    // 🐛 FIX: password length backend pe bhi check — pehle sirf frontend pe tha
    if (String(password).length < 6) {
      return res.status(400).json({
        success: false,
        message: "Password must be at least 6 characters!",
      });
    }

    const normalizedEmail = String(email).toLowerCase().trim();
    const normalizedPhone = String(phone).trim();

    if (!/^\S+@\S+\.\S+$/.test(normalizedEmail)) {
      return res.status(400).json({ success: false, message: "Please enter a valid email!" });
    }
    // 🐛 FIX: phone format check — pehle koi bhi string chalti thi, aur baad mein
    // sub-teacher invite (jo 10-digit maangta hai) match hi nahi hota tha
    if (!/^\d{10}$/.test(normalizedPhone)) {
      return res.status(400).json({
        success: false,
        message: "Phone number must be exactly 10 digits!",
      });
    }

    // 2. examName ko hamesha clean array mein normalize karo
    const examNames = Array.isArray(examName)
      ? examName.map((e) => (typeof e === "string" ? e.trim() : "")).filter(Boolean)
      : typeof examName === "string" && examName.trim()
      ? [examName.trim()]
      : [];

    const uniqueExamNames = [...new Set(examNames)];

    if (uniqueExamNames.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Select at least one exam!",
      });
    }

    // 3. Duplicate check
    const existingTeacher = await Teacher.findOne({
      $or: [{ email: normalizedEmail }, { phone: normalizedPhone }],
    });

    if (existingTeacher) {
      // 🐛 FIX: pehle sabko ek hi generic message milta tha. Ab agar ye number
      // kisi Main Teacher ke PENDING invite ka hai to sahi guidance milti hai —
      // warna log confuse hote the ("maine to kabhi signup kiya hi nahi").
      if (existingTeacher.status === "pending") {
        return res.status(400).json({
          success: false,
          message:
            "There is a pending sub-teacher invite for this number/email. " +
            "Open the invite link from your Main Teacher to activate your account.",
        });
      }
      return res.status(400).json({
        success: false,
        message: "An account with this email or phone number already exists!",
      });
    }

    // 4. Password hash
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // 5. Save
    const newTeacher = new Teacher({
      name: String(name).trim(),
      email: normalizedEmail,
      phone: normalizedPhone,
      password: hashedPassword,
      examName: uniqueExamNames,
      role: "main",
      status: "active",
    });

    await newTeacher.save();

    // 6. JWT + cookie
    const token = jwt.sign(
      { teacherId: newTeacher._id },
      JWT_SECRET,
      { expiresIn: "7d" }
    );

    // 🐛 FIX: `secure: true` hardcoded tha → local dev pe teacher signup ke baad
    // dashboard turant "Aap logged in nahi hain" pe phenk deta tha.
    return res
      .status(201)
      .cookie("teacherToken", token, authCookieOptions())
      .json({
        success: true,
        message: "Teacher successfully registered & logged in!",
        data: {
          _id: newTeacher._id,
          name: newTeacher.name,
          email: newTeacher.email,
          phone: newTeacher.phone,
          role: newTeacher.role,
          examName: newTeacher.examName,
        },
      });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "An account with this email or phone already exists.",
      });
    }
    console.error("Teacher Signup Error:", error);
    return res.status(500).json({ success: false, message: "Internal Server Error" });
  }
};
