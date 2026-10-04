// backend/utils/mailer.js
//
// 🆕 CHANGE — pehle nodemailer/SMTP (Gmail) use hota tha. Render ka FREE
// TIER September 2025 se saare outbound SMTP ports (25, 465, 587) block
// kar deta hai spam rokne ke liye — koi bhi SMTP config (Gmail ho ya koi
// aur) usse kaam nahi karega, "Connection timeout" hi milega hamesha.
//
// Isliye ab email HTTPS API se bhejta hai (port 443 — kabhi block nahi
// hota), Brevo (pehle "Sendinblue") ke through — free tier: 300 email/din,
// aur (Resend ke ulat) BINA domain verify kiye kisi bhi recipient ko bhej
// sakta hai. Koi naya npm package bhi nahi chahiye — Node 18+ ka built-in
// fetch use kiya hai.
//
// SETUP (5 minute, bilkul free):
//   1. https://app.brevo.com/ par free account banayein (card nahi chahiye)
//   2. Dashboard → Settings → SMTP & API → "API Keys" tab → naya API key banayein
//   3. Dashboard → Senders → "Add a sender" → apna email (jaise Gmail) daalein
//      → us email par ek 6-digit code aayega → wahi code Brevo mein daal ke
//      verify kar dein (koi domain/DNS nahi chahiye)
//   4. backend/.env mein:
//        BREVO_API_KEY=<step 2 ki key>
//        BREVO_SENDER_EMAIL=<step 3 wala verified email>
//        BREVO_SENDER_NAME=AntimPrayash.in
//   ⚠️ Naye Brevo account par pehla email bhejne se pehle Brevo ki taraf se
//   ek chhota manual approval lagta hai (thodi der lag sakti hai, kabhi-kabhi
//   kuch ghante) — agar pehla try fail ho to thodi der baad dobara try karein.

const BREVO_API_URL = "https://api.brevo.com/v3/smtp/email";

// ─────────────────────────────────────────────
// Generic sender — har jagah (OTP, admin link, teacher invite) isi se jaata hai
// ─────────────────────────────────────────────
export const sendEmail = async ({ to, subject, html, text }) => {
  const apiKey = process.env.BREVO_API_KEY;
  const senderEmail = process.env.BREVO_SENDER_EMAIL;

  if (!apiKey || !senderEmail) {
    const err = new Error(
      "Email service is not configured (set BREVO_API_KEY and BREVO_SENDER_EMAIL in backend/.env)."
    );
    err.statusCode = 500;
    throw err;
  }

  const senderName = process.env.BREVO_SENDER_NAME || "AntimPrayash.in";

  let response;
  try {
    response = await fetch(BREVO_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        "api-key": apiKey,
      },
      body: JSON.stringify({
        sender: { name: senderName, email: senderEmail },
        to: [{ email: to }],
        subject,
        htmlContent: html,
        textContent: text,
      }),
    });
  } catch (e) {
    console.error("Network error while sending email:", e.message);
    const err = new Error("Network error while sending email. Try again in a little while.");
    err.statusCode = 502;
    throw err;
  }

  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    console.error("Brevo error:", response.status, body);
    const err = new Error(
      body?.message
        ? `Error while sending email: ${body.message}`
        : "Error while sending email. Try again in a little while."
    );
    err.statusCode = 502;
    throw err;
  }
};

// ─────────────────────────────────────────────
// Chhota shared wrapper — sabhi emails ek jaisa, saaf template use karein
// ─────────────────────────────────────────────
const wrapTemplate = (title, bodyHtml) => `
  <div style="font-family: -apple-system, sans-serif; max-width: 480px; margin: 0 auto; padding: 24px; background: #0A0D14; color: #ffffff; border-radius: 16px;">
    <div style="font-weight: 700; font-size: 18px; margin-bottom: 20px;">AntimPrayash.in</div>
    <h2 style="font-size: 18px; margin: 0 0 12px;">${title}</h2>
    ${bodyHtml}
    <p style="font-size: 11px; color: #6B7280; margin-top: 24px;">If you did not make this request, please ignore this email.</p>
  </div>
`;

export const sendOtpEmail = async (toEmail, otpCode, purpose) => {
  const purposeText =
    purpose === "signup" ? "To verify your signup" : purpose === "teacher_reset" ? "For teacher password reset" : "For password reset";
  await sendEmail({
    to: toEmail,
    subject: `${otpCode} — your AntimPrayash.in OTP`,
    html: wrapTemplate(
      purposeText,
      `<p style="font-size: 14px; color: #D1D5DB;">Your OTP:</p>
       <div style="font-size: 32px; font-weight: 700; letter-spacing: 8px; background: #111827; padding: 16px; border-radius: 12px; text-align: center; margin: 12px 0;">${otpCode}</div>
       <p style="font-size: 12px; color: #6B7280;">This OTP will expire in 5 minutes.</p>`
    ),
    text: `Your AntimPrayash.in OTP: ${otpCode} (expires in 5 minutes)`,
  });
};

export const sendAdminMagicLinkEmail = async (toEmail, link) => {
  await sendEmail({
    to: toEmail,
    subject: "AntimPrayash.in Admin Login Link",
    html: wrapTemplate(
      "Click to log in as admin",
      `<a href="${link}" style="display: inline-block; background: #7C3AED; color: #fff; padding: 12px 24px; border-radius: 10px; text-decoration: none; font-weight: 600; margin: 12px 0;">Open Admin Panel</a>
       <p style="font-size: 12px; color: #6B7280;">This link will expire in 15 minutes and can be used only once.</p>
       <p style="font-size: 11px; color: #4B5563; word-break: break-all;">${link}</p>`
    ),
    text: `Admin login link (15 min valid): ${link}`,
  });
};

export const sendTeacherInviteEmail = async (toEmail, link, { role, teacherName }) => {
  const roleText = role === "main" ? "Main Teacher" : "Sub-Teacher";
  await sendEmail({
    to: toEmail,
    subject: `Invitation to join AntimPrayash.in as ${roleText}`,
    html: wrapTemplate(
      `You have been made ${roleText}`,
      `<p style="font-size: 14px; color: #D1D5DB;">${teacherName ? `Hello ${teacherName},` : "Hello,"} click below to activate your account and set your password.</p>
       <a href="${link}" style="display: inline-block; background: #7C3AED; color: #fff; padding: 12px 24px; border-radius: 10px; text-decoration: none; font-weight: 600; margin: 12px 0;">Activate Account</a>
       <p style="font-size: 12px; color: #6B7280;">This link is valid for 3 days.</p>`
    ),
    text: `You have been invited as ${roleText}. Activate your account: ${link}`,
  });
};

export const sendPromoterCredentialsEmail = async (toEmail, { name, email, password, loginLink }) => {
  await sendEmail({
    to: toEmail,
    subject: "Your Promoter account on AntimPrayash.in has been created",
    html: wrapTemplate(
      "Your Promoter account has been created",
      `<p style="font-size: 14px; color: #D1D5DB;">${name ? `Hello ${name},` : "Hello,"} your login details are below.</p>
       <div style="background: #111827; padding: 16px; border-radius: 12px; margin: 12px 0; font-size: 13px; color: #D1D5DB;">
         <div>Email: <strong style="color:#fff;">${email}</strong></div>
         <div>Password: <strong style="color:#fff;">${password}</strong></div>
       </div>
       <a href="${loginLink}" style="display: inline-block; background: #7C3AED; color: #fff; padding: 12px 24px; border-radius: 10px; text-decoration: none; font-weight: 600; margin: 12px 0;">Log In</a>
       <p style="font-size: 12px; color: #6B7280;">You will need to change your password after logging in for the first time.</p>`
    ),
    text: `Your Promoter account has been created. Email: ${email}, Password: ${password}. Log in: ${loginLink}`,
  });
};
