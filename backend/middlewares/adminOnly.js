// middlewares/adminOnly.js
// ─────────────────────────────────────────────
// Ye routes admin-only hain:
//   /add-question, /add-bluePrint, /add-previous-year-test,
//   /add-rank-predictor-data, /add-current-affair, /add-current-affair-quiz,
//   /admin/create-main-teacher
//
// ADMIN BANNE KE 2 TARIKE (.env mein set karein):
//
//  A) Postman / script se kaam karne ke liye  →  ADMIN_SECRET=koi_lamba_random_string
//     Request mein header bhejein:  x-admin-secret: koi_lamba_random_string
//
//  B) 🆕 Browser se — Admin Login page (frontend) se "Send Login Link" dabao,
//     ADMIN_EMAIL par ek magic link aata hai, click karte hi 12-ghante ki
//     admin-session cookie (`adminToken`) set ho jaati hai. Purana tarika
//     (student account ka email match) hata diya gaya hai — ab koi password
//     kahin store nahi hota, har baar session khatam hone par naya email
//     link mangwana padta hai.
//
// Dono mein se kam se kam EK set karna zaroori hai, warna admin routes band rahenge.
// ─────────────────────────────────────────────
import crypto from "crypto";
import jwt from "jsonwebtoken";
import { JWT_SECRET } from "../utils/jwtSecret.js";

/** Length bataye bina, constant time me do string compare karta hai. */
const safeEqual = (a, b) => {
  const bufA = Buffer.from(String(a));
  const bufB = Buffer.from(String(b));
  const hashA = crypto.createHash("sha256").update(bufA).digest();
  const hashB = crypto.createHash("sha256").update(bufB).digest();
  return crypto.timingSafeEqual(hashA, hashB);
};

export const adminOnly = async (req, res, next) => {
  try {
    const configuredSecret = process.env.ADMIN_SECRET;
    const configuredEmail = process.env.ADMIN_EMAIL;

    if (!configuredSecret && !configuredEmail) {
      return res.status(503).json({
        success: false,
        message:
          "Admin routes band hain. Kripya backend/.env mein ADMIN_SECRET ya ADMIN_EMAIL set karein.",
      });
    }

    // ── Tarika A: header secret (Postman/scripts) ──
    const headerSecret = String(req.headers["x-admin-secret"] ?? "");
    if (configuredSecret && headerSecret && safeEqual(headerSecret, configuredSecret)) {
      req.isAdmin = true;
      return next();
    }

    // ── Tarika B: 🆕 admin-session cookie (magic-link se mili) ──
    const adminToken = req.cookies?.adminToken;
    if (!adminToken) {
      return res.status(401).json({
        success: false,
        message: "Admin access chahiye. Admin Login page se email link mangwayein, ya x-admin-secret header bhejein.",
      });
    }

    let decoded;
    try {
      decoded = jwt.verify(adminToken, JWT_SECRET);
    } catch {
      return res.status(401).json({
        success: false,
        message: "Admin session expire ho chuki hai. Naya login link mangwayein.",
      });
    }

    const wantEmail = String(configuredEmail || "").toLowerCase().trim();
    const haveEmail = String(decoded?.email || "").toLowerCase().trim();

    if (!decoded?.isAdmin || !wantEmail || haveEmail !== wantEmail) {
      return res.status(403).json({
        success: false,
        message: "Ye route sirf admin ke liye hai.",
      });
    }

    req.isAdmin = true;
    req.adminEmail = decoded.email;
    return next();
  } catch (error) {
    console.error("adminOnly error:", error.message);
    return res.status(401).json({
      success: false,
      message: "Admin verification fail ho gaya.",
    });
  }
};
