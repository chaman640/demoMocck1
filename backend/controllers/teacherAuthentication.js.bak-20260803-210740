// controllers/teacherAuthentication.js
import Teacher from "../models/Teacher.js";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";

export const loginTeacher = async (req, res) => {
  try {
    // 1. Frontend se email ya phone, aur password nikalna
    const { email, phone, password } = req.body;

    if ((!email && !phone) || !password) {
      return res.status(400).json({
        success: false,
        message: "Login karne ke liye Email ya Phone, aur Password dena zaroori hai!",
      });
    }

    // 2. Query banana aur Normalization karna (taaki capital/small letter ka issue na ho)
    let query = [];
    if (email) query.push({ email: email.toLowerCase().trim() });
    if (phone) query.push({ phone: phone.trim() });

    // 3. Database mein Teacher ko dhundna
    const teacher = await Teacher.findOne({ $or: query });

    if (!teacher) {
      return res.status(404).json({
        success: false,
        message: "Is email ya phone se koi account nahi mila.",
      });
    }

    // 4. Status Check — Sirf "active" teachers hi login kar sakte hain
    if (teacher.status !== "active") {
      return res.status(403).json({
        success: false,
        message: `Aapka account abhi '${teacher.status}' status mein hai. Sirf active accounts login kar sakte hain.`,
      });
    }

    // 5. Password Verify karna
    const isPasswordCorrect = await bcrypt.compare(password, teacher.password);
    if (!isPasswordCorrect) {
      return res.status(400).json({
        success: false,
        message: "Galat password!",
      });
    }

    // 6. JWT Token Generate karna
    const token = jwt.sign(
      { teacherId: teacher._id },
      process.env.JWT_SECRET || "mera_super_secret_key",
      { expiresIn: "7d" }
    );

    // 7. Cookie Options set karna
    const cookieOptions = {
      httpOnly: true,
      secure: true, // Humesha true rakhein agar frontend aur backend alag URL par hain ya production mein hain
      sameSite: "lax",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    };

    // 8. Response bhejna
    return res.status(200)
      .cookie("teacherToken", token, cookieOptions)
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
      message: "Server mein error aa gaya login karte waqt.",
      error: error.message,
    });
  }
};