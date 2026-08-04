// middlewares/sanitize.js
// ─────────────────────────────────────────────
// 🔒 NoSQL INJECTION + PROTOTYPE POLLUTION SE BACHAV
//
// PROBLEM 1 — MongoDB operator injection (asli example, login route pe):
//
//   Login controller kuch aisa karta hai:
//       const user = await User.findOne({ phone });
//
//   Normally frontend bhejta hai:  { "phone": "9876543210" }
//   Lekin koi attacker Postman se bhej sakta hai:
//
//       { "phone": { "$ne": null }, "password": "kuch bhi" }
//
//   MongoDB ke liye `{ $ne: null }` ka matlab hai "koi bhi phone jo null na ho"
//   → findOne() DATABASE KA PEHLA USER utha lata hai.
//
//   Password abhi bhi bcrypt se check hota hai, isliye ye akela login nahi
//   kara sakta — lekin ye har us jagah kaam karta hai jahan sirf lookup hota
//   hai: OTP request, "student search", coupon redeem, aur sabse khatarnak —
//   `/accept-invite` (jahan `{ "token": { "$ne": null } }` se attacker kisi
//   aur ka pending sub-teacher invite hijack kar sakta tha).
//
// PROBLEM 2 — prototype pollution:
//
//       { "__proto__": { "isAdmin": true } }
//
//   Agar kahin `Object.assign(kuchObject, req.body)` hua, to us object ka
//   prototype badal jata hai aur `kuchObject.isAdmin` chup-chaap `true` ho
//   jata hai. Isliye `__proto__`, `constructor`, `prototype` — teeno naam
//   bhi hata dete hain.
//
// FIX: request body me se `$` se shuru hone wale, dotted ("a.b"), aur upar
// wale teen khatarnak naamon ko nikaal dete hain. Aapka koi bhi genuine
// frontend call aise keys bhejta hi nahi, isliye kuch tootega nahi.
//
// NOTE: express-mongo-sanitize package jaan-boojh kar use NAHI kiya —
// wo Express 5 mein crash karta hai (req.query ab read-only hai).
// ─────────────────────────────────────────────

const DANGEROUS_NAMES = new Set(["__proto__", "constructor", "prototype"]);

const MAX_DEPTH = 12;

const isPlainObject = (v) =>
  v !== null &&
  typeof v === "object" &&
  !Buffer.isBuffer(v) &&
  !(v instanceof Date);

const isBadKey = (key) => key.startsWith("$") || key.includes(".") || DANGEROUS_NAMES.has(key);

const scrub = (value, removed, depth = 0) => {
  if (!isPlainObject(value)) return;

  if (Array.isArray(value)) {
    for (let i = 0; i < value.length; i++) {
      // ⚠️ Bahut gehri nesting = DoS / chhupane ki koshish. Pehle yahan value
      // JAISI KI TAISI aage bhej di jati thi — matlab 13 level neeche chhupa
      // hua `$ne` bach nikalta tha. Ab poora subtree hi hata dete hain.
      if (depth + 1 > MAX_DEPTH) {
        if (isPlainObject(value[i])) {
          removed.push("(too-deep)");
          value[i] = null;
        }
        continue;
      }
      scrub(value[i], removed, depth + 1);
    }
    return;
  }

  for (const key of Object.keys(value)) {
    if (isBadKey(key)) {
      removed.push(key);
      delete value[key];
      continue;
    }
    if (depth + 1 > MAX_DEPTH) {
      if (isPlainObject(value[key])) {
        removed.push("(too-deep)");
        delete value[key];
      }
      continue;
    }
    scrub(value[key], removed, depth + 1);
  }
};

// Log flooding se bachav — Render free plan ka log quota bhar sakta hai
let warnedAt = 0;
let warnedCount = 0;
const throttledWarn = (req, removed) => {
  warnedCount += 1;
  const now = Date.now();
  if (now - warnedAt < 60_000) return; // 1 minute me ek hi line
  warnedAt = now;
  console.warn(
    `🛡️  Suspicious keys hataye gaye — ${req.method} ${req.originalUrl}: ` +
      `${removed.slice(0, 5).join(", ")}` +
      (warnedCount > 1 ? `  (pichhle 1 min me ${warnedCount} aisi requests)` : "")
  );
  warnedCount = 0;
};

/**
 * Sirf req.body saaf karta hai.
 *
 * Ise multer (file upload) ke BAAD dobara lagana zaroori hai: multipart form
 * me req.body multer banata hai, aur multer `subjectName[$ne]` jaise field
 * naam ko `{ subjectName: { $ne: ... } }` me khol deta hai. App-level wala
 * sanitizer us waqt tak chal chuka hota hai (tab req.body khaali tha).
 */
export const sanitizeBody = (req, res, next) => {
  if (req.body) {
    const removed = [];
    scrub(req.body, removed);
    if (removed.length) throttledWarn(req, removed);
  }
  next();
};

/** App-level sanitizer — JSON body + query ki jaanch. */
export const sanitizeRequest = (req, res, next) => {
  const removed = [];

  if (req.body) scrub(req.body, removed);

  // ⚠️ req.query ko Express 5 mein reassign nahi kar sakte (getter hai),
  // isliye usme sirf DEKHTE hain aur shak hone par request reject kar dete hain.
  // (Express 5 ka default query parser "simple" hai, isliye query se operator
  //  injection waise bhi nahi ho sakti — ye bas ek extra parat hai.)
  try {
    for (const key of Object.keys(req.query || {})) {
      if (key.startsWith("$") || DANGEROUS_NAMES.has(key)) {
        return res.status(400).json({
          success: false,
          message: "Request mein galat parameter naam hai.",
        });
      }
    }
  } catch {
    /* query parse na ho paye to ignore */
  }

  if (removed.length) throttledWarn(req, removed);

  next();
};

export default sanitizeRequest;
