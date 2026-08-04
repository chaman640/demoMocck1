// middlewares/rateLimiters.js
// ─────────────────────────────────────────────
// KYUN ZAROORI HAI:
//
// Pehle koi bhi banda ek chhota sa script chala kar:
//   • /send-signup-otp ko 10,000 baar maar sakta tha → aapka 2Factor ka
//     BALANCE (asli paisa) minton me khatam ho jata
//   • /user-Login par lakhon password try kar sakta tha (brute force)
//   • /signup se hazaaro fake account bana sakta tha
//   • poore server ko request se bhar kar down kar sakta tha
//
// ─────────────────────────────────────────────
// ⚠️ SABSE ZAROORI DESIGN FAISLA — "ek IP = ek banda" GALAT hai
//
// India me Jio/Airtel jaise carrier CGNAT use karte hain: SAINKDON alag-alag
// mobile users ek hi public IP se dikhte hain. Isi tarah ek coaching center ke
// 50 students ek hi wifi se aate hain.
//
// Iska matlab: agar limit sirf IP par lagayein, to ek hi Jio tower ke doosre
// students ki wajah se AAPKE asli student ko "bahut zyada requests" ka error
// mil sakta hai — aur uska test beech me atak jayega.
//
// Isliye yahan har limit jaan-boojh kar aise banayi hai:
//   • Login → DO alag limiter: ek IP+phone par, ek IP+email par
//     (isse attacker ek field random karke limit se bach nahi sakta)
//   • Test submit / question add → key = LOGGED-IN USER KI ID
//     (in routes par auth middleware pehle chalta hai, isliye id mil jati hai)
//   • Signup/OTP → key = IP + phone/email, aur uske UPAR ek udaar (generous)
//     pure-IP chhat, taaki ek building ke saare students na atkein
//   • Sirf global wali limit hi bilkul pure-IP hai — aur wo jaan-boojh kar
//     bahut badi (3000 / 15 min) rakhi gayi hai.
//
// Har limit .env se badli ja sakti hai (neeche ENV column dekhein). Agar kabhi
// kisi asli user ko galti se block hote dekhein, to number badha kar restart
// kar dein — code chhune ki zaroorat nahi.
// ─────────────────────────────────────────────
//
// NOTE 1: server.js me `app.set("trust proxy", 1)` hona zaroori hai, warna
//         Render ke peeche saare users ki IP ek jaisi dikhegi.
// NOTE 2: Ginti server ki memory me rehti hai. Ek hi Render instance hai to
//         bilkul theek hai. Kabhi 2+ instance chalayein to Redis store lagana
//         padega (tab bataiyega, 10 minute ka kaam hai).
// ─────────────────────────────────────────────
import { rateLimit, ipKeyGenerator } from "express-rate-limit";

const num = (key, fallback) => {
  const v = Number(process.env[key]);
  return Number.isFinite(v) && v > 0 ? v : fallback;
};

const MIN = 60 * 1000;

// IP + koi doosri cheez (phone/email) — dono milakar key banate hain.
// ipKeyGenerator IPv6 ko sahi tarike se handle karta hai (warna ek IPv6 user
// apne aap ko lakhon "alag" IP dikha sakta hai).
const ipPlus = (extraFn) => (req) => {
  const ip = ipKeyGenerator(req.ip || "");
  const extra = String(extraFn(req) || "").trim().toLowerCase();
  return extra ? `${ip}|${extra}` : ip;
};

// Logged-in user ki id se key banao; login na ho to IP par gir jao.
// (Isse ek hi wifi/CGNAT ke alag-alag students ek doosre ko block nahi karte.)
const userOrIp = (req) => {
  const id = req.user?._id || req.teacher?._id;
  return id ? `u:${String(id)}` : ipKeyGenerator(req.ip || "");
};

// 429 hamesha JSON ho (HTML nahi), aur usme ye bhi ho ki kitni der baad
// try karna hai — frontend seedha wahi dikha sakta hai.
const jsonMessage = (msg) => (req, res) => {
  const resetAt = req.rateLimit?.resetTime;
  const retryAfterSeconds = resetAt
    ? Math.max(1, Math.ceil((new Date(resetAt).getTime() - Date.now()) / 1000))
    : undefined;
  res.status(429).json({
    success: false,
    message: msg,
    retryAfterSeconds,
    code: "RATE_LIMITED",
  });
};

const base = { standardHeaders: "draft-7", legacyHeaders: false };

// ─────────────────────────────────────────────
// 1. GLOBAL — poore /api par ek moti si chhat
//
//    Ye per-user fairness ke liye NAHI hai — sirf "koi script pagal ho gaya"
//    wali situation rokne ke liye hai. Isliye number jaan-boojh kar bada hai:
//    ek asli banda kabhi 200 request/minute nahi karta, lekin ek attack script
//    hazaaron karti hai aur turant ruk jati hai.
//
//    ENV: GLOBAL_RATE_LIMIT (default 3000 / 15 min = 200 per minute)
// ─────────────────────────────────────────────
export const globalLimiter = rateLimit({
  ...base,
  windowMs: 15 * MIN,
  limit: num("GLOBAL_RATE_LIMIT", 3000),
  handler: jsonMessage("Bahut zyada requests aa rahi hain. Thodi der baad try karein."),
  skip: (req) => req.path === "/health", // uptime monitor kabhi block na ho
});

// ─────────────────────────────────────────────
// 2. OTP — sabse sakht (yahan asli paisa lagta hai)
//    Ek phone number par 1 ghante me max 5 OTP.
//    (otpService me pehle se 60-second cooldown bhi hai — ye uske upar hai.)
//
//    ENV: OTP_PHONE_LIMIT (default 5 / ghanta)
// ─────────────────────────────────────────────
export const otpLimiter = rateLimit({
  ...base,
  windowMs: 60 * MIN,
  limit: num("OTP_PHONE_LIMIT", 5),
  keyGenerator: ipPlus((req) => req.body?.phone),
  handler: jsonMessage(
    "Is number par bahut zyada OTP maange ja chuke hain. Kripya 1 ghante baad try karein."
  ),
});

// Ek hi IP se alag-alag numbers par OTP spam — iske liye alag limit.
// CGNAT ki wajah se ise 20 se badha kar 60 kiya hai: ek attacker phir bhi
// sirf 60 SMS/ghanta jala sakta hai, lekin ek coaching centre ke 40 students
// ek hi wifi se aaram se signup kar lenge.
//
// ENV: OTP_IP_LIMIT (default 60 / ghanta)
export const otpIpLimiter = rateLimit({
  ...base,
  windowMs: 60 * MIN,
  limit: num("OTP_IP_LIMIT", 60),
  handler: jsonMessage("Bahut zyada OTP requests. Kripya thodi der baad try karein."),
});

// ─────────────────────────────────────────────
// 3. LOGIN — brute force rokne ke liye
//
//    Do baatein iske asli users ko bachati hain:
//      • key = IP + phone/email → doosre user ki galtiyan aap par nahi girti
//      • skipSuccessfulRequests → SAHI password wale login ginti me aate hi
//        nahi. Aap 100 baar sahi login karein, kabhi block nahi honge.
//        Sirf GALAT password ginte hain.
//
//    ENV: LOGIN_LIMIT (default 10 / 15 min)
// ─────────────────────────────────────────────
export const loginLimiter = rateLimit({
  ...base,
  windowMs: 15 * MIN,
  limit: num("LOGIN_LIMIT", 10),
  skipSuccessfulRequests: true,
  keyGenerator: ipPlus((req) => req.body?.phone),
  // phone nahi bheja to ye limiter chhod do (warna key sirf IP ban jati aur
  // ek hi CGNAT IP ke doosre users ki galtiyan aap par gir jatin)
  skip: (req) => !String(req.body?.phone || "").trim(),
  handler: jsonMessage(
    "Bahut baar galat password daala gaya hai. Kripya 15 minute baad try karein."
  ),
});

// Wahi limit, lekin EMAIL par — teacher-login email se bhi hota hai.
//
// ⚠️ DONO alag-alag kyun (ek hi key me jodkar kyun nahi)?
//    Pehle key `phone || email` thi. Attacker asli email ke saath har baar ek
//    RANDOM phone bhej deta — key har baar nayi ban jati, limit lagti hi nahi,
//    aur controller phir bhi email se victim ko dhundh leta. Dono ko ek key me
//    jodne se bhi wahi problem rehti (random phone key badal deta).
//    Ab dono ALAG limiter hain: chahe attacker email fix rakhe ya phone,
//    us wali limit par 10 me hi ruk jata hai.
//
// ENV: LOGIN_LIMIT (dono ke liye ek hi)
export const loginEmailLimiter = rateLimit({
  ...base,
  windowMs: 15 * MIN,
  limit: num("LOGIN_LIMIT", 10),
  skipSuccessfulRequests: true,
  keyGenerator: ipPlus((req) => req.body?.email),
  skip: (req) => !String(req.body?.email || "").trim(),
  handler: jsonMessage(
    "Bahut baar galat password daala gaya hai. Kripya 15 minute baad try karein."
  ),
});

// Sabse upar ek moti chhat — sirf automated abuse ke liye.
//
// ⚠️ Ye number jaan-boojh kar BADA hai (200, na ki 50). Kyun? CGNAT ki wajah se
// sainkdon asli users ek hi IP se aate hain. Agar ye chhota hota, to ek attacker
// jaan-boojh kar 50 galat login karke us poore IP ke SAARE asli users ko 15
// minute ke liye lock kar sakta tha — yaani limit khud hi ek hathiyar ban jati.
// Asli bachav upar wali do per-identifier limits karti hain; ye sirf backstop hai.
//
// ENV: LOGIN_IP_LIMIT (default 200 / 15 min)
export const loginIpLimiter = rateLimit({
  ...base,
  windowMs: 15 * MIN,
  limit: num("LOGIN_IP_LIMIT", 200),
  skipSuccessfulRequests: true,
  handler: jsonMessage("Bahut zyada login koshishein. Kripya thodi der baad try karein."),
});

// ─────────────────────────────────────────────
// 4. SIGNUP / password reset / invite accept — fake account rokne ke liye
//
//    Do parat hain:
//      • signupLimiter   → 10/ghanta per IP+phone/email  (ek banda, sakht)
//      • signupIpLimiter → 120/ghanta per IP             (poora building, udaar)
//    Isse ek coaching centre ke 40 students ek hi wifi se aaram se signup kar
//    lete hain, lekin ek script hazaaron fake account nahi bana sakti.
//
//    ENV: SIGNUP_LIMIT (10), SIGNUP_IP_LIMIT (120)
// ─────────────────────────────────────────────
export const signupLimiter = rateLimit({
  ...base,
  windowMs: 60 * MIN,
  limit: num("SIGNUP_LIMIT", 10),
  // Key me phone/email bhi hai — warna ek coaching centre ke 40 students
  // ek hi wifi se signup karte waqt ek doosre ko block kar dete.
  // Key me phone/email bhi hai — warna ek coaching centre ke 40 students
  // ek hi wifi se signup karte waqt ek doosre ko block kar dete.
  // (Yahan attacker ka identifier badalna "naya account banana" hi hai, isliye
  //  asli bachav neeche wali per-IP chhat karti hai — login jaisa bypass nahi hai.)
  keyGenerator: ipPlus((req) =>
    `${String(req.body?.phone || "").trim()}|${String(req.body?.email || "").trim().toLowerCase()}`
  ),
  handler: jsonMessage("Bahut zyada koshishein. Kripya 1 ghante baad try karein."),
});

// Aur ye poore IP par ek moti chhat — mass fake-account banane wale script ke
// liye. 40-50 students wala batch iske aas-paas bhi nahi pahunchta.
//
// ENV: SIGNUP_IP_LIMIT (default 120 / ghanta)
export const signupIpLimiter = rateLimit({
  ...base,
  windowMs: 60 * MIN,
  limit: num("SIGNUP_IP_LIMIT", 120),
  handler: jsonMessage("Bahut zyada koshishein. Kripya 1 ghante baad try karein."),
});

// ─────────────────────────────────────────────
// 5. ADMIN routes — secret leak ho bhi jaye to nuksan seemit rahe
//    (seed script ~7 request karti hai, to 60 me aaram se aa jata hai)
//
//    ENV: ADMIN_LIMIT (default 60 / 15 min)
// ─────────────────────────────────────────────
export const adminLimiter = rateLimit({
  ...base,
  windowMs: 15 * MIN,
  limit: num("ADMIN_LIMIT", 60),
  handler: jsonMessage("Admin requests ki limit paar ho gayi. Thodi der baad try karein."),
});

// ─────────────────────────────────────────────
// 6. Bhaari WRITE routes (test submit, question add, mock generate)
//
//    ⚠️ Ye per-USER hai, per-IP NAHI. Warna ek coaching center ke 50 students
//    jab ek saath apna test submit karte, to 30 ke baad sabko error milta aur
//    unke attempt gum ho jate. Ab har student ki apni alag ginti hai.
//
//    Ek insaan 60 second me 60 test submit nahi karta — ye sirf double-click,
//    stuck loop, ya kisi script se DB bharne se bachata hai.
//
//    ENV: WRITE_LIMIT (default 60 / minute per user)
// ─────────────────────────────────────────────
export const writeLimiter = rateLimit({
  ...base,
  windowMs: 1 * MIN,
  limit: num("WRITE_LIMIT", 60),
  keyGenerator: userOrIp,
  handler: jsonMessage("Thoda dheere! Ek minute me itni requests allowed nahi hain."),
});
