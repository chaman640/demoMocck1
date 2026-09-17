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
//        BREVO_SENDER_NAME=mockTest.in
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
      "Email service configure nahi hai (backend/.env mein BREVO_API_KEY aur BREVO_SENDER_EMAIL set karein)."
    );
    err.statusCode = 500;
    throw err;
  }

  const senderName = process.env.BREVO_SENDER_NAME || "mockTest.in";

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
    console.error("Email bhejne mein network error:", e.message);
    const err = new Error("Email bhejne mein network error aaya. Thodi der baad try karein.");
    err.statusCode = 502;
    throw err;
  }

  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    console.error("Brevo error:", response.status, body);
    const err = new Error(
      body?.message
        ? `Email bhejne mein error: ${body.message}`
        : "Email bhejne mein error aaya. Thodi der baad try karein."
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
