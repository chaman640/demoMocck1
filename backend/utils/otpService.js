// backend/utils/otpService.js
// Reusable OTP infrastructure — signup-verification, student forgot-password,
// aur teacher forgot-password — teenon isi service ko use karte hain. OTP
// hamesha hash karke store hota hai (plaintext kabhi DB mein nahi jata), aur
// verify hote hi consume ho jata hai.
//
// 🆕 CHANGE — pehle OTP SMS provider (2Factor/Fast2SMS) se phone par jaata
// tha, jo paisa lagta hai. Ab free email service (nodemailer/SMTP) se email
// par jaata hai — koi paid API key nahi chahiye.
import bcrypt from "bcrypt";
import Otp from "../models/Otp.js";
import { sendOtpEmail } from "./mailer.js";

const OTP_EXPIRY_MINUTES = 5;
const RESEND_COOLDOWN_SECONDS = 60;
const MAX_VERIFY_ATTEMPTS = 5;

const generateOtpCode = () => String(Math.floor(100000 + Math.random() * 900000)); // 6-digit

// ─────────────────────────────────────────────
// OTP generate → hash karke DB mein save → email bhejo
// Resend-cooldown enforce karta hai (spam se bachne ke liye)
// ─────────────────────────────────────────────
export const createAndSendOtp = async (email, purpose) => {
  const identifier = String(email).toLowerCase().trim();

  const recent = await Otp.findOne({ identifier, purpose }).sort({ createdAt: -1 });
  if (recent) {
    const secondsSinceLastSend = (Date.now() - recent.createdAt.getTime()) / 1000;
    if (secondsSinceLastSend < RESEND_COOLDOWN_SECONDS) {
      const waitMore = Math.ceil(RESEND_COOLDOWN_SECONDS - secondsSinceLastSend);
      const err = new Error(`Kripya ${waitMore} second baad dobara try karein.`);
      err.statusCode = 429;
      throw err;
    }
  }

  const otpCode = generateOtpCode();
  const otpHash = await bcrypt.hash(otpCode, 10);

  await Otp.deleteMany({ identifier, purpose }); // purana OTP invalidate

  const created = await Otp.create({
    identifier,
    purpose,
    otpHash,
    expiresAt: new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000),
  });

  try {
    await sendOtpEmail(identifier, otpCode, purpose);
  } catch (err) {
    // Email fail hone par OTP row ko turant hata do, warna 60 second ka
    // resend-cooldown block karega jabki user ko OTP mila hi nahi
    await Otp.deleteOne({ _id: created._id }).catch(() => {});
    throw err;
  }

  return { success: true };
};

// ─────────────────────────────────────────────
// OTP verify. Match hone par record consume (delete) ho jata hai.
// ─────────────────────────────────────────────
export const verifyOtpCode = async (email, purpose, inputOtp) => {
  const identifier = String(email).toLowerCase().trim();
  const record = await Otp.findOne({ identifier, purpose }).sort({ createdAt: -1 });

  if (!record) {
    const err = new Error("Koi OTP request nahi mili. Pehle OTP mangwayein.");
    err.statusCode = 400;
    throw err;
  }
  if (record.expiresAt < new Date()) {
    await Otp.deleteOne({ _id: record._id });
    const err = new Error("OTP expire ho gaya. Naya OTP mangwayein.");
    err.statusCode = 400;
    throw err;
  }
  if (record.attempts >= MAX_VERIFY_ATTEMPTS) {
    await Otp.deleteOne({ _id: record._id });
    const err = new Error("Bahut zyada galat attempts. Naya OTP mangwayein.");
    err.statusCode = 400;
    throw err;
  }

  const isMatch = await bcrypt.compare(String(inputOtp).trim(), record.otpHash);
  if (!isMatch) {
    record.attempts += 1;
    await record.save();
    const remaining = Math.max(0, MAX_VERIFY_ATTEMPTS - record.attempts);
    const err = new Error(`Galat OTP. ${remaining} attempts baaki hain.`);
    err.statusCode = 400;
    throw err;
  }

  await Otp.deleteOne({ _id: record._id }); // verified + consumed
  return true;
};
