// backend/utils/mailer.js
//
// 🆕 NAYA — Free email bhejne ka utility, nodemailer + SMTP se.
//
// SETUP (Gmail — bilkul free, koi paid service nahi chahiye):
//   1. Apna Gmail account kholo → Google Account → Security
//   2. "2-Step Verification" ON karo (agar pehle se nahi hai)
//   3. "App Passwords" search karo → naya app password banao (naam kuch bhi)
//   4. Wo 16-character password backend/.env mein SMTP_PASS mein daalo
//
// backend/.env mein:
//   SMTP_HOST=smtp.gmail.com
//   SMTP_PORT=465
//   SMTP_SECURE=true
//   SMTP_USER=youraddress@gmail.com
//   SMTP_PASS=<16-char app password>
//   SMTP_FROM="mockTest.in <youraddress@gmail.com>"
//
// Gmail free tier ~500 emails/din tak allow karta hai — ek chhote app ke
// liye (OTP + admin magic-link + teacher invites) kaafi zyada hai.
// Koi bhi doosra free/paid SMTP (Brevo, Zoho, SES) bhi isi tarah kaam karega,
// bas SMTP_HOST/PORT badal dena.
import nodemailer from "nodemailer";

let cachedTransporter = null;

const getTransporter = () => {
  if (cachedTransporter) return cachedTransporter;

  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT) || 465;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (!host || !user || !pass) {
    return null; // caller isko handle karega — clear error dega
  }

  cachedTransporter = nodemailer.createTransport({
    host,
    port,
    secure: String(process.env.SMTP_SECURE || "true") === "true", // 465 = true, 587 = false
    auth: { user, pass },
  });

  return cachedTransporter;
};

// ─────────────────────────────────────────────
// Generic sender — har jagah (OTP, admin link, teacher invite) isi se jaata hai
// ─────────────────────────────────────────────
export const sendEmail = async ({ to, subject, html, text }) => {
  const transporter = getTransporter();

  if (!transporter) {
    const err = new Error(
      "Email service configure nahi hai (backend/.env mein SMTP_HOST, SMTP_USER, SMTP_PASS set karein)."
    );
    err.statusCode = 500;
    throw err;
  }

  const from = process.env.SMTP_FROM || process.env.SMTP_USER;

  try {
    await transporter.sendMail({ from, to, subject, html, text });
  } catch (e) {
    console.error("Email bhejne mein error:", e.message);
    const err = new Error("Email bhejne mein error aaya. Thodi der baad try karein.");
    err.statusCode = 502;
    throw err;
  }
};

// ─────────────────────────────────────────────
// Chhota shared wrapper — sabhi emails ek jaisa, saaf template use karein
// ─────────────────────────────────────────────
const wrapTemplate = (title, bodyHtml) => `
  <div style="font-family: -apple-system, sans-serif; max-width: 480px; margin: 0 auto; padding: 24px; background: #0A0D14; color: #ffffff; border-radius: 16px;">
    <div style="font-weight: 700; font-size: 18px; margin-bottom: 20px;">mockTest.in</div>
    <h2 style="font-size: 18px; margin: 0 0 12px;">${title}</h2>
    ${bodyHtml}
    <p style="font-size: 11px; color: #6B7280; margin-top: 24px;">Agar ye request aapne nahi ki, to is email ko ignore karein.</p>
  </div>
`;

export const sendOtpEmail = async (toEmail, otpCode, purpose) => {
  const purposeText =
    purpose === "signup" ? "Signup verify karne ke liye" : purpose === "teacher_reset" ? "Teacher password reset ke liye" : "Password reset ke liye";
  await sendEmail({
    to: toEmail,
    subject: `${otpCode} — aapka mockTest.in OTP`,
    html: wrapTemplate(
      purposeText,
      `<p style="font-size: 14px; color: #D1D5DB;">Aapka OTP:</p>
       <div style="font-size: 32px; font-weight: 700; letter-spacing: 8px; background: #111827; padding: 16px; border-radius: 12px; text-align: center; margin: 12px 0;">${otpCode}</div>
       <p style="font-size: 12px; color: #6B7280;">Ye OTP 5 minute mein expire ho jayega.</p>`
    ),
    text: `Aapka mockTest.in OTP: ${otpCode} (5 minute mein expire hoga)`,
  });
};

export const sendAdminMagicLinkEmail = async (toEmail, link) => {
  await sendEmail({
    to: toEmail,
    subject: "mockTest.in Admin Login Link",
    html: wrapTemplate(
      "Admin login karne ke liye click karein",
      `<a href="${link}" style="display: inline-block; background: #7C3AED; color: #fff; padding: 12px 24px; border-radius: 10px; text-decoration: none; font-weight: 600; margin: 12px 0;">Admin Panel Kholein</a>
       <p style="font-size: 12px; color: #6B7280;">Ye link 15 minute mein expire ho jayega aur sirf ek baar use ho sakta hai.</p>
       <p style="font-size: 11px; color: #4B5563; word-break: break-all;">${link}</p>`
    ),
    text: `Admin login link (15 min valid): ${link}`,
  });
};

export const sendTeacherInviteEmail = async (toEmail, link, { role, teacherName }) => {
  const roleText = role === "main" ? "Main Teacher" : "Sub-Teacher";
  await sendEmail({
    to: toEmail,
    subject: `mockTest.in par ${roleText} ke roop mein invite`,
    html: wrapTemplate(
      `Aapko ${roleText} banaya gaya hai`,
      `<p style="font-size: 14px; color: #D1D5DB;">${teacherName ? `Namaste ${teacherName},` : "Namaste,"} apna account activate karne ke liye niche click karein aur apna password set karein.</p>
       <a href="${link}" style="display: inline-block; background: #7C3AED; color: #fff; padding: 12px 24px; border-radius: 10px; text-decoration: none; font-weight: 600; margin: 12px 0;">Account Activate Karein</a>
       <p style="font-size: 12px; color: #6B7280;">Ye link 3 din tak valid hai.</p>`
    ),
    text: `Aapko ${roleText} invite kiya gaya hai. Account activate karein: ${link}`,
  });
};
