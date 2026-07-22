// controllers/addTeacher.js
// Sirf MAIN TEACHER signup ke liye — sub-teacher yahan se kabhi nahi banega,
// wo invite-flow (agla step) se banega.
import Teacher from "../models/Teacher.js";
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";

// ... existing imports ...

export const addTeacher = async (req, res) => {
  try {
    // 1. Frontend se data nikalna + NORMALIZATION
    const { name, email, phone, password, examName } = req.body;

    // ... validation logic waisa hi rahega ...

    // 3. Duplicate check mein normalized values use karein
    const normalizedEmail = email.toLowerCase().trim();
    const normalizedPhone = phone.trim();

    const existingTeacher = await Teacher.findOne({ 
      $or: [{ email: normalizedEmail }, { phone: normalizedPhone }] 
    });

    // ... password hash logic waisa hi rahega ...

    // 5. Naya Teacher document save karna (normalized data ke sath)
    const newTeacher = new Teacher({
      name: name.trim(),
      email: normalizedEmail,
      phone: normalizedPhone,
      password: hashedPassword,
      examName: [examName], 
      role: "main",
      status: "active",
    });
    
    // ... baaki logic (token, cookie, response) waisa hi rahega ...

  } catch (error) {
    // 👇 NAYA: Duplicate key error handling
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