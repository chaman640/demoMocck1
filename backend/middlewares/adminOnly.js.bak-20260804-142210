// middlewares/adminOnly.js
// ─────────────────────────────────────────────
// KYUN BANAYI: pehle ye routes BILKUL KHULE the (koi auth nahi) —
//   /add-question, /add-bluePrint, /add-previous-year-test,
//   /add-rank-predictor-data, /add-current-affair, /add-current-affair-quiz, /add-user
// Matlab internet pe koi bhi banda aapke database mein questions, blueprints,
// papers daal sakta tha ya spam kar sakta tha. Ab in par ye middleware laga hai.
//
// ADMIN BANNE KE 2 TARIKE (.env mein set karein):
//
//  A) Postman / script se kaam karne ke liye  →  ADMIN_SECRET=koi_lamba_random_string
//     Request mein header bhejein:  x-admin-secret: koi_lamba_random_string
//
//  B) Apne normal student account se           →  ADMIN_EMAIL=aapka@email.com
//     Bas us account se website pe login rahein, cookie se verify ho jayega.
//
// Dono mein se kam se kam EK set karna zaroori hai, warna admin routes band rahenge.
// ─────────────────────────────────────────────
import jwt from "jsonwebtoken";
import User from "../models/User.js";

export const adminOnly = async (req, res, next) => {
  try {
    const configuredSecret = process.env.ADMIN_SECRET;
    const configuredEmail = process.env.ADMIN_EMAIL;

    // Agar dono hi configure nahi hain to saaf batao — silently open mat chhodo
    if (!configuredSecret && !configuredEmail) {
      return res.status(503).json({
        success: false,
        message:
          "Admin routes band hain. Kripya backend/.env mein ADMIN_SECRET ya ADMIN_EMAIL set karein.",
      });
    }

    // ── Tarika A: header secret (Postman/scripts) ──
    const headerSecret = req.headers["x-admin-secret"];
    if (configuredSecret && headerSecret && headerSecret === configuredSecret) {
      req.isAdmin = true;
      return next();
    }

    // ── Tarika B: logged-in user ka email ADMIN_EMAIL se match kare ──
    const token = req.cookies?.token;
    if (!token) {
      return res.status(401).json({
        success: false,
        message: "Admin access chahiye. Login karein ya x-admin-secret header bhejein.",
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || "mera_super_secret_key");
    const user = await User.findById(decoded.userId).select("email");

    if (
      !user ||
      !configuredEmail ||
      user.email !== configuredEmail.toLowerCase().trim()
    ) {
      return res.status(403).json({
        success: false,
        message: "Ye route sirf admin ke liye hai.",
      });
    }

    req.isAdmin = true;
    req.adminUser = user;
    return next();
  } catch (error) {
    console.error("adminOnly error:", error.message);
    return res.status(401).json({
      success: false,
      message: "Admin verification fail ho gaya.",
    });
  }
};
