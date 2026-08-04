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
// Do tarah ke variables hain:
//   • REQUIRED  — inke bina server production mein start hi nahi hoga
//   • OPTIONAL  — inke bina server chalega, bas wo feature band rahega
//                 (aur startup pe warning aayegi)
// ─────────────────────────────────────────────

const REQUIRED = [
  ["ROWQUESTION_URI", "MongoDB ka connection string — iske bina kuch nahi chalega"],
  ["JWT_SECRET", "Login token banane ka secret (utils/jwtSecret.js dekhein)"],
];

const OPTIONAL = [
  ["CLOUDINARY_CLOUD_NAME", "image wale questions upload nahi honge"],
  ["CLOUDINARY_API_KEY", "image wale questions upload nahi honge"],
  ["CLOUDINARY_API_SECRET", "image wale questions upload nahi honge"],
  ["FAST2SMS_API_KEY", "signup/forgot-password ka OTP SMS nahi jayega"],
  ["ADMIN_SECRET", "admin seeding/scripts (x-admin-secret header) band rahenge"],
  ["ADMIN_EMAIL", "browser se admin panel access band rahega"],
  ["FRONTEND_URL", "CORS mein sirf hardcoded origins allowed rahenge"],
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
    console.warn("\n⚠️  Ye env variables set nahi hain (server chalega, feature band rahega):");
    for (const [key, why] of missingOptional) console.warn(`   • ${key.padEnd(24)} → ${why}`);
    console.warn("");
  }

  if (missingRequired.length) {
    console.error("\n" + "═".repeat(62));
    console.error("❌ ZAROORI ENV VARIABLES MISSING HAIN:");
    for (const [key, why] of missingRequired) console.error(`   • ${key.padEnd(24)} → ${why}`);
    console.error("═".repeat(62));
    if (isProduction) {
      console.error("Production mein inke bina start nahi kar sakte. Render → Environment mein add karein.\n");
      process.exit(1);
    }
    console.error("(Development hai isliye chalne de rahe hain, lekin ye theek karna zaroori hai.)\n");
  }

  // NODE_ENV ki chetavni — Render pe ise set karna sabse zyada bhoola jaata hai
  if (!process.env.NODE_ENV) {
    console.warn(
      "⚠️  NODE_ENV set nahi hai. Live server pe ise 'production' rakhein —\n" +
        "    warna secure cookies, HSTS aur error-hiding sab band rahenge.\n"
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
