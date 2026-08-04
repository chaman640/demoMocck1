// config/rowQuestion.js
// ─────────────────────────────────────────────
// 🔒 SECURITY FIX (Round 1)
//
// PEHLE ye likha tha:
//     const connectionOptions = {
//       tls: true,
//       tlsAllowInvalidCertificates: true,   // ❌
//       tlsAllowInvalidHostnames: true,      // ❌
//     };
//
// Comment mein likha tha "SSL error ko bypass karenge" — aur haan, bypass
// to ho jata tha, lekin iska asli matlab ye hai:
//
//   "Jo bhi server apne aap ko MongoDB bata de, uspe bharosa kar lo —
//    certificate check mat karo."
//
// Yaani beech mein baitha koi banda (public wifi, compromised DNS, ya
// hosting provider ka koi bhi network hop) apna fake "MongoDB" khada karke
// aapka poora database traffic padh sakta tha — students ke phone number,
// hashed passwords, saara content. Isko MITM (man-in-the-middle) attack
// kehte hain, aur ye do line usko poori tarah se allow kar deti thi.
//
// AB:
//   • Default: proper, secure TLS (MongoDB Atlas ke saath ye seedha chalta hai)
//   • mongodb:// (local, bina srv) pe TLS force nahi hota
//   • Agar sach mein kabhi zaroorat pade to env se on kar sakte hain:
//         MONGO_ALLOW_INSECURE_TLS=true
//     ...lekin tab har startup pe badi warning aayegi, aur production mein
//     to ye chalega hi nahi.
//
// ⚠️ AGAR IS BADLAV KE BAAD CONNECTION FAIL HO JAYE:
//    Ghabrayein nahi, aur turant insecure flag mat lagayein. 90% cases mein
//    asli wajah in mein se ek hoti hai:
//      1. Atlas → Network Access mein aapka IP / 0.0.0.0/0 whitelist nahi hai
//      2. Node ka version bahut purana hai (Node 18+ rakhein)
//      3. URI mein password ke special characters URL-encode nahi hue
//         (@ → %40, # → %23, / → %2F)
//    In teenon ko check karne ke baad hi temporary raste ka socho.
// ─────────────────────────────────────────────
import mongoose from "mongoose";
import "dotenv/config";

const ROWQUESTION_URI = process.env.ROWQUESTION_URI;

if (!ROWQUESTION_URI) {
  throw new Error("ROWQUESTION_URI is not defined in .env file");
}

const isProduction = process.env.NODE_ENV === "production";
const isSrv = /^mongodb\+srv:\/\//i.test(ROWQUESTION_URI);
const uriAsksForTls = /[?&](tls|ssl)=true/i.test(ROWQUESTION_URI);

// Atlas (mongodb+srv://) hamesha TLS use karta hai. Local mongodb:// nahi.
const useTls = isSrv || uriAsksForTls;

const allowInsecure = String(process.env.MONGO_ALLOW_INSECURE_TLS || "").toLowerCase() === "true";

if (allowInsecure && isProduction) {
  console.error("\n" + "═".repeat(62));
  console.error("❌ MONGO_ALLOW_INSECURE_TLS=true production mein allowed nahi hai.");
  console.error("   Ye database traffic ko MITM attack ke liye khol deta hai.");
  console.error("   Render ke Environment se ye variable hata dein.");
  console.error("═".repeat(62) + "\n");
  process.exit(1);
}

const connectionOptions = {
  // ── Reliability / production tuning ──
  // Render free plan sota-jagta rehta hai, isliye timeouts thode udaar rakhe hain.
  serverSelectionTimeoutMS: 15000, // DB dhoondhne ka waqt (default 30s — bahut lamba)
  socketTimeoutMS: 45000,
  connectTimeoutMS: 15000,
  maxPoolSize: Number(process.env.MONGO_MAX_POOL || 10), // free tier pe 10 kaafi hai
  minPoolSize: 0, // idle hone par connections chhod do (RAM bachta hai)
  maxIdleTimeMS: 60000,
  retryWrites: true,
  // NOTE: bufferCommands ko jaan-boojh kar default (true) hi rakha hai.
  // Render free plan pe DB se connection ek-do second ke liye toot sakta hai;
  // buffering on rehne se wo blip user ko dikhta hi nahi — query apne aap
  // reconnect hone ka intezaar kar leti hai.
};

if (useTls) {
  connectionOptions.tls = true;

  if (allowInsecure) {
    connectionOptions.tlsAllowInvalidCertificates = true;
    connectionOptions.tlsAllowInvalidHostnames = true;
    console.warn("\n" + "⚠".repeat(31));
    console.warn("⚠️  MONGO_ALLOW_INSECURE_TLS=true — TLS certificate check BAND hai.");
    console.warn("    Ye sirf temporary debugging ke liye hai. Database traffic");
    console.warn("    is waqt MITM attack se surakshit NAHI hai.");
    console.warn("⚠".repeat(31) + "\n");
  }
}

export const rowQuestionConnection = mongoose.createConnection(ROWQUESTION_URI, connectionOptions);

rowQuestionConnection.on("connected", () => {
  console.log(`✅ Database connected (TLS: ${useTls ? (allowInsecure ? "INSECURE ⚠️" : "secure") : "off"})`);
});

rowQuestionConnection.on("error", (err) => {
  console.error("❌ Database connection error:", err.message);

  // Sabse common galtiyon ke liye seedha ishara
  const m = String(err.message || "");
  if (/certificate|SSL|TLS/i.test(m)) {
    console.error("   → Ye TLS certificate ki problem lag rahi hai. Check karein:");
    console.error("     1. Node version 18+ hai? (node -v)");
    console.error("     2. Atlas → Network Access mein IP whitelist hai?");
  } else if (/ENOTFOUND|querySrv|getaddrinfo/i.test(m)) {
    console.error("   → Connection string ka hostname galat lag raha hai (ROWQUESTION_URI check karein).");
  } else if (/Authentication failed|bad auth/i.test(m)) {
    console.error("   → Username/password galat hai, ya password ke special characters");
    console.error("     URL-encode nahi hue (@ → %40, # → %23, / → %2F).");
  } else if (/IP|whitelist|not allowed/i.test(m)) {
    console.error("   → Atlas → Network Access mein current IP allow karein.");
  }
});

rowQuestionConnection.on("disconnected", () => {
  console.warn("⚠️  Database disconnected — mongoose apne aap reconnect karne ki koshish karega.");
});

rowQuestionConnection.on("reconnected", () => {
  console.log("✅ Database reconnected");
});
