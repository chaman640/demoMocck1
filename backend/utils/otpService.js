// utils/otpService.js
// Reusable OTP infrastructure — signup-verification aur forgot-password
// dono isi service ko use karenge. OTP hamesha hash karke store hota hai
// (plaintext kabhi DB mein nahi jata), aur verify hote hi consume (delete)
// ho jata hai — dobara wahi OTP use nahi ho sakta.
import bcrypt from "bcrypt"; // 👈 agar project mein "bcryptjs" use ho raha hai to import yahan match kar lena
import Otp from "../models/Otp.js";

const OTP_EXPIRY_MINUTES = 5;
const RESEND_COOLDOWN_SECONDS = 60;
const MAX_VERIFY_ATTEMPTS = 5;

const generateOtpCode = () => String(Math.floor(100000 + Math.random() * 900000)); // 6-digit

const sendOtpViaFast2Sms = async (phone, otpCode) => {
  const apiKey = process.env.FAST2SMS_API_KEY; // naam wahi rehne do, sirf value 2Factor ki key hai
  const url = `https://2factor.in/API/V1/${apiKey}/SMS/${phone}/${otpCode}`;

  const response = await fetch(url);
  const data = await response.json();

  if (data.Status !== "Success") {
    console.error("2Factor error:", data);
    const err = new Error("SMS bhejne mein error aaya. Thodi der baad try karein.");
    err.statusCode = 502;
    throw err;
  }
  return data;
};

// ─────────────────────────────────────────────
// OTP generate karo, DB mein hash karke store karo, SMS bhejo.
// Resend-cooldown enforce karta hai (spam/cost-abuse se bachne ke liye).
// ─────────────────────────────────────────────
export const createAndSendOtp = async (phone, purpose) => {
  const recent = await Otp.findOne({ phone, purpose }).sort({ createdAt: -1 });
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

  await Otp.deleteMany({ phone, purpose }); // purana OTP invalidate

  await Otp.create({
    phone,
    purpose,
    otpHash,
    expiresAt: new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000),
  });

  await sendOtpViaFast2Sms(phone, otpCode);

  return { success: true };
};

// ─────────────────────────────────────────────
// OTP verify karo. Match hone par record consume (delete) ho jata hai —
// isliye is function ko sirf tabhi call karna jab OTP ke saath-saath
// asli action (account-create / password-reset) bhi isi request mein ho raha ho.
// ─────────────────────────────────────────────
export const verifyOtpCode = async (phone, purpose, inputOtp) => {
  const record = await Otp.findOne({ phone, purpose }).sort({ createdAt: -1 });

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

  const isMatch = await bcrypt.compare(String(inputOtp), record.otpHash);
  if (!isMatch) {
    record.attempts += 1;
    await record.save();
    const err = new Error(`Galat OTP. ${MAX_VERIFY_ATTEMPTS - record.attempts} attempts baaki hain.`);
    err.statusCode = 400;
    throw err;
  }

  await Otp.deleteOne({ _id: record._id }); // verified + consumed, ek hi baar use hoga
  return true;
};