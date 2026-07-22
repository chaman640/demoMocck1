// controllers/acceptInvite.js
// PUBLIC route — sub-teacher ke paas abhi tak koi account/session nahi hai,
// isliye ye teacherInfo middleware ke BINA chalega.
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import Teacher from "../models/Teacher.js";

export const acceptInvite = async (req, res) => {
  try {
    const { token, name, email, password } = req.body;

    // ─────────────────────────────────────────────
    // STEP 1: Validation
    // ─────────────────────────────────────────────
    if (!token) {
      return res.status(400).json({
        success: false,
        message: "Invite token zaroori hai!",
      });
    }
    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        message: "Naam, email aur password bharna zaroori hai!",
      });
    }
    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: "Password kam se kam 6 characters ka hona chahiye!",
      });
    }

    // ─────────────────────────────────────────────
    // STEP 2: Token se teacher dhundo
    // ─────────────────────────────────────────────
    const teacher = await Teacher.findOne({ inviteToken: token });

    if (!teacher) {
      return res.status(400).json({
        success: false,
        message: "Ye invite link invalid hai.",
      });
    }

    if (teacher.status !== "pending") {
      return res.status(400).json({
        success: false,
        message: "Ye invite link already use ho chuka hai.",
      });
    }

    if (!teacher.inviteTokenExpiry || teacher.inviteTokenExpiry < new Date()) {
      return res.status(410).json({
        success: false,
        message: "Ye invite link expire ho chuka hai. Apne Main Teacher se naya link mangwayein.",
      });
    }

    // ─────────────────────────────────────────────
    // STEP 3: Email kisi aur teacher ke paas to nahi hai, check karo
    // (khud ka placeholder email chhodkar)
    // ─────────────────────────────────────────────
    const emailTaken = await Teacher.findOne({
      email: email.toLowerCase().trim(),
      _id: { $ne: teacher._id },
    });
    if (emailTaken) {
      return res.status(400).json({
        success: false,
        message: "Ye email pehle se kisi aur teacher account se juda hai!",
      });
    }

    // ─────────────────────────────────────────────
    // STEP 4: Password hash karke teacher ko activate karo
    // ─────────────────────────────────────────────
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    teacher.name = name.trim();
    teacher.email = email.toLowerCase().trim();
    teacher.password = hashedPassword;
    teacher.status = "active";
    teacher.inviteToken = null;
    teacher.inviteTokenExpiry = null; // 👈 link ab dobara kabhi use nahi ho sakta

    await teacher.save();

    // ─────────────────────────────────────────────
    // STEP 5: Auto-login — JWT + cookie (addTeacher.js jaisa hi pattern)
    // ─────────────────────────────────────────────
    const jwtToken = jwt.sign(
      { teacherId: teacher._id },
      process.env.JWT_SECRET || "mera_super_secret_key",
      { expiresIn: "7d" }
    );

    const cookieOptions = {
      httpOnly: true,
      secure: true,
      sameSite: "lax",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    };

    return res.status(200)
      .cookie("teacherToken", jwtToken, cookieOptions)
      .json({
        success: true,
        message: "Account activate ho gaya! Aap login ho chuke hain.",
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
        message: "Ye email pehle se registered hai.",
      });
    }
    console.error("acceptInvite error:", error);
    return res.status(500).json({
      success: false,
      message: "Server mein error aa gaya account activate karte waqt.",
      error: error.message,
    });
  }
};