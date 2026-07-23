// controllers/addTeacher.js
import Teacher from "../models/Teacher.js";
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";

export const addTeacher = async (req, res) => {
  try {
    // 1. Frontend se data nikalna
    const { name, email, phone, password, examName } = req.body;

    // 2. Validation check 
    if (!name || !email || !phone || !password || !examName) {
      return res.status(400).json({
        success: false,
        message: "Sabhi fields bharna zaroori hai!",
      });
    }

    // 3. Normalization
    const normalizedEmail = email.toLowerCase().trim();
    const normalizedPhone = phone.trim();

    // 4. Duplicate Check
    const existingTeacher = await Teacher.findOne({ 
      $or: [{ email: normalizedEmail }, { phone: normalizedPhone }] 
    });
    
    if (existingTeacher) {
      return res.status(400).json({
        success: false,
        message: "Is email ya phone number se account pehle hi bana hua hai!",
      });
    }

    // 5. Password ko hash karna
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // 6. Naya Teacher document save karna
    const newTeacher = new Teacher({
      name: name.trim(),
      email: normalizedEmail,
      phone: normalizedPhone,
      password: hashedPassword,
      examName: [examName], 
      role: "main",
      status: "active",
    });
    
    await newTeacher.save();

    // 7. JWT Token Generate karna
    const token = jwt.sign(
      { teacherId: newTeacher._id },
      process.env.JWT_SECRET || "mera_super_secret_key",
      { expiresIn: "7d" }
    );

    // 8. Cookie Options
    const cookieOptions = {
      httpOnly: true,
      secure: true,
      sameSite: "lax",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    };

    // 9. Response bhejna
    res.status(201)
      .cookie("teacherToken", token, cookieOptions)
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
        }
      });

  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "Is email ya phone se account pehle hi maujood hai.",
      });
    }
    console.error("Teacher Signup Error:", error);
    res.status(500).json({ success: false, message: "Internal Server Error" });
  }
};