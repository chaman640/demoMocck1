// backend/controllers/adminCreateMainTeacher.js
//
// 🆕 NAYA — Main Teacher ab khud signup nahi kar sakta; sirf Admin
// (magic-link se login) naya Main Teacher bana sakta hai. Isi invite-link
// pattern ko reuse kiya hai jo sub-teacher invite ke liye pehle se tha —
// email par link jaata hai, teacher wahan apna password khud set karta hai.
import crypto from "crypto";
import Teacher from "../models/Teacher.js";
import { sendTeacherInviteEmail } from "../utils/mailer.js";

const INVITE_VALID_DAYS = 3;

export const adminCreateMainTeacher = async (req, res) => {
  try {
    const { name, email, phone, examName } = req.body;

    if (!name || !email || !phone) {
      return res.status(400).json({ success: false, message: "Name, email and phone are required!" });
    }

    const normalizedEmail = String(email).toLowerCase().trim();
    const normalizedPhone = String(phone).trim();

    if (!/^\S+@\S+\.\S+$/.test(normalizedEmail)) {
      return res.status(400).json({ success: false, message: "Please enter a valid email!" });
    }
    if (!/^\d{10}$/.test(normalizedPhone)) {
      return res.status(400).json({ success: false, message: "Phone number must be exactly 10 digits!" });
    }

    const examNames = Array.isArray(examName)
      ? examName.map((e) => (typeof e === "string" ? e.trim() : "")).filter(Boolean)
      : typeof examName === "string" && examName.trim()
      ? [examName.trim()]
      : [];

    const existingTeacher = await Teacher.findOne({
      $or: [{ email: normalizedEmail }, { phone: normalizedPhone }],
    });
    if (existingTeacher) {
      return res.status(400).json({
        success: false,
        message: "A teacher account (or pending invite) with this email or phone number already exists!",
      });
    }

    const inviteToken = crypto.randomBytes(32).toString("hex");
    const inviteTokenExpiry = new Date(Date.now() + INVITE_VALID_DAYS * 24 * 60 * 60 * 1000);

    const newTeacher = new Teacher({
      name: String(name).trim(),
      email: normalizedEmail,
      phone: normalizedPhone,
      examName: [...new Set(examNames)],
      role: "main",
      status: "pending",
      inviteToken,
      inviteTokenExpiry,
    });
    await newTeacher.save();

    const frontendUrl = process.env.FRONTEND_URL || req.headers.origin || "http://localhost:5173"; // 🆕 same fix
    const link = `${frontendUrl}/#/AcceptInvite/${inviteToken}`;

    // Email fail ho to bhi teacher ban chuka hai — pehle yahan 500 aata tha,
    // dobara try par "pehle se maujood" aata tha aur invite link kabhi nahi
    // milta tha. Ab link hamesha lautate hain taaki admin khud bhej sake.
    let emailSent = true;
    try {
      await sendTeacherInviteEmail(normalizedEmail, link, { role: "main", teacherName: name });
    } catch (mailError) {
      emailSent = false;
      console.error("adminCreateMainTeacher email failed:", mailError.message);
    }

    return res.status(201).json({
      success: true,
      message: emailSent
        ? "Main Teacher invite email sent!"
        : "Teacher created, but the email could not be sent — send the invite link below to the teacher yourself.",
      data: { teacherId: newTeacher._id, email: normalizedEmail, inviteLink: link, emailSent },
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({ success: false, message: "An account with this email or phone already exists." });
    }
    console.error("adminCreateMainTeacher error:", error);
    return res.status(500).json({ success: false, message: "Error while creating the Main Teacher." });
  }
};
