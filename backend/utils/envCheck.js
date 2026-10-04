// utils/envCheck.js
// ─────────────────────────────────────────────
// Server chalne se PEHLE ye check karta hai ki saari zaroori env
// variables maujood hain ya nahi.
//
// KYUN: pehle agar Render pe CLOUDINARY_API_KEY daalna bhool jaate,
// to server theek se start ho jata — aur teacher ko pata chalta tab,
// jab wo image wala question add karke "Cloudinary upload failed"
// dekhta. Ab ye galti deploy hote hi console mein saaf dikhegi.
//
// 🆕 CHANGE — purana "FAST2SMS_API_KEY" check hata diya (ab SMS use
// nahi hota) aur "BREVO_API_KEY" / "BREVO_SENDER_EMAIL" add kiya —
// ye email OTP, admin magic-link, teacher invite — sabke liye zaroori
// hain. Ab har deploy ke Render Logs mein turant pata chal jayega
// agar ye missing hain, "Email service configure nahi hai" error
// dekh kar guess nahi karna padega.
//
// Do tarah ke variables hain:
//   • REQUIRED  — inke bina server production mein start hi nahi hoga
//   • OPTIONAL  — inke bina server chalega, bas wo feature band rahega
//                 (aur startup pe warning aayegi)
// ─────────────────────────────────────────────

const REQUIRED = [
  ["ROWQUESTION_URI", "MongoDB connection string — nothing works without it"],
  ["JWT_SECRET", "Secret for creating login tokens (see utils/jwtSecret.js)"],
];

const OPTIONAL = [
  ["CLOUDINARY_CLOUD_NAME", "questions with images will not upload"],
  ["CLOUDINARY_API_KEY", "questions with images will not upload"],
  ["CLOUDINARY_API_SECRET", "questions with images will not upload"],
  ["BREVO_API_KEY", "🚨 OTP / admin login link / teacher invite — NO EMAILS WILL BE SENT"],
  ["BREVO_SENDER_EMAIL", "🚨 OTP / admin login link / teacher invite — NO EMAILS WILL BE SENT"],
  ["ADMIN_SECRET", "admin seeding/scripts (x-admin-secret header) will stay disabled"],
  ["ADMIN_EMAIL", "admin panel access from the browser will stay disabled"],
  ["FRONTEND_URL", "CORS will only allow hardcoded origins, email links may point to the wrong domain"],
];

export const checkEnv = () => {
  const isProduction = process.env.NODE_ENV === "production";
  const missingRequired = [];
  const missingOptional = [];

  for (const [key, why] of REQUIRED) {
    if (!String(process.env[key] || "").trim()) missingRequired.push([key, why]);
  }
  for (const [key, why] of OPTIONAL) {
    if (!String(process.env[key] || "").trim()) missingOptional.push([key, why]);
  }

  if (missingOptional.length) {
    console.warn("\n⚠️  These env variables are not set (the server will run, the feature stays off):");
    for (const [key, why] of missingOptional) console.warn(`   • ${key.padEnd(24)} → ${why}`);
    console.warn("");
  } else {
    // 🆕 Positive confirmation bhi print karo — taaki "sab sahi hai" bhi
    // saaf dikhe, sirf missing hone par hi warning na aaye
    console.log("✅ All optional env variables (Cloudinary, Brevo, Admin, Frontend URL) are set.\n");
  }

  if (missingRequired.length) {
    console.error("\n" + "═".repeat(62));
    console.error("❌ REQUIRED ENV VARIABLES ARE MISSING:");
    for (const [key, why] of missingRequired) console.error(`   • ${key.padEnd(24)} → ${why}`);
    console.error("═".repeat(62));
    if (isProduction) {
      console.error("Cannot start in production without them. Add them in Render → Environment.\n");
      process.exit(1);
    }
    console.error("(Allowing it to run because this is development, but this must be fixed.)\n");
  }

  // NODE_ENV ki chetavni — Render pe ise set karna sabse zyada bhoola jaata hai
  if (!process.env.NODE_ENV) {
    console.warn(
      "⚠️  NODE_ENV is not set. On the live server set it to 'production' —\n" +
        "    otherwise secure cookies, HSTS and error hiding will all stay off.\n"
    );
  }

  return { ok: missingRequired.length === 0, missingRequired, missingOptional };
};

// ─────────────────────────────────────────────
// Import hote hi khud chal jata hai.
//
// KYUN: ESM me saare imports file ke code se PEHLE chalte hain. Agar server.js
// me `checkEnv()` ek normal function call hoti, to wo config/rowQuestion.js aur
// utils/jwtSecret.js ke BAAD chalti — aur wo dono missing env par khud hi ruk
// jate hain. Natija: user ko ye dostana checklist kabhi dikhti hi nahi, sirf
// ek raw stack trace milta.
//
// Isliye server.js me sirf `import "./utils/envCheck.js";` likha hai (sabse
// upar), aur asli check yahin ho jata hai.
// ─────────────────────────────────────────────
checkEnv();

export default checkEnv;
