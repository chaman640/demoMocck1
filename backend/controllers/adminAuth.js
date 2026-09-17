// backend/controllers/adminAuth.js
//
// 🆕 NAYA — Admin login ab password se nahi, ek email magic-link se hota hai:
//   1. Admin "Send Login Link" dabata hai → ADMIN_EMAIL par ek link jaata hai
//   2. Link par click karte hi ek chhoti admin-session (12 ghante) ban jaati hai
//   3. Session khatam (logout ya 12 ghante baad expiry) hone par phir se
//      naya link mangwana padega — koi permanent password kahin nahi hai
import crypto from "crypto";
import jwt from "jsonwebtoken";
import { JWT_SECRET } from "../utils/jwtSecret.js";
import AdminLoginToken from "../models/AdminLoginToken.js";
import { sendAdminMagicLinkEmail } from "../utils/mailer.js";

const TOKEN_VALID_MINUTES = 15;
const RESEND_COOLDOWN_SECONDS = 60;
const ADMIN_SESSION_HOURS = 12;

const hashToken = (raw) => crypto.createHash("sha256").update(raw).digest("hex");

const adminCookieOptions = () => ({
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax",
  maxAge: ADMIN_SESSION_HOURS * 60 * 60 * 1000,
});

const adminClearCookieOptions = () => ({
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax",
});

// ─────────────────────────────────────────────
// POST /admin/request-login — ADMIN_EMAIL par magic link bhejta hai
// ─────────────────────────────────────────────
export const requestAdminLogin = async (req, res) => {
  try {
    const configuredEmail = String(process.env.ADMIN_EMAIL || "").toLowerCase().trim();

    if (!configuredEmail) {
      return res.status(503).json({
        success: false,
        message: "Admin login configure nahi hai. backend/.env mein ADMIN_EMAIL set karein.",
      });
    }

    // Cooldown — spam se bachne ke liye
    const recent = await AdminLoginToken.findOne({ email: configuredEmail }).sort({ createdAt: -1 });
    if (recent) {
      const secondsSince = (Date.now() - recent.createdAt.getTime()) / 1000;
      if (secondsSince < RESEND_COOLDOWN_SECONDS) {
        const waitMore = Math.ceil(RESEND_COOLDOWN_SECONDS - secondsSince);
        return res.status(429).json({ success: false, message: `Kripya ${waitMore} second baad dobara try karein.` });
      }
    }

    const rawToken = crypto.randomBytes(32).toString("hex");
    const tokenHash = hashToken(rawToken);

    await AdminLoginToken.deleteMany({ email: configuredEmail }); // purane links invalidate
    await AdminLoginToken.create({
      tokenHash,
      email: configuredEmail,
      expiresAt: new Date(Date.now() + TOKEN_VALID_MINUTES * 60 * 1000),
    });

    const frontendUrl = process.env.FRONTEND_URL || "http://localhost:5173";
    const link = `${frontendUrl}/#/AdminVerify?token=${rawToken}`;

    await sendAdminMagicLinkEmail(configuredEmail, link);

    return res.status(200).json({ success: true, message: "Login link email par bhej diya gaya hai!" });
  } catch (error) {
    console.error("requestAdminLogin error:", error);
    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.statusCode ? error.message : "Login link bhejte waqt error aaya.",
    });
  }
};

// ─────────────────────────────────────────────
// POST /admin/verify-login — token verify karke admin session cookie set karta hai
// ─────────────────────────────────────────────
export const verifyAdminLogin = async (req, res) => {
  try {
    const { token } = req.body;
    if (!token) {
      return res.status(400).json({ success: false, message: "Token zaroori hai." });
    }

    const tokenHash = hashToken(String(token));
    const record = await AdminLoginToken.findOne({ tokenHash });

    if (!record) {
      return res.status(400).json({ success: false, message: "Ye login link invalid hai ya pehle hi use ho chuka hai." });
    }
    if (record.expiresAt < new Date()) {
      await AdminLoginToken.deleteOne({ _id: record._id });
      return res.status(410).json({ success: false, message: "Ye login link expire ho chuka hai. Naya link mangwayein." });
    }

    await AdminLoginToken.deleteOne({ _id: record._id }); // ek baar hi chalega

    const adminSessionToken = jwt.sign(
      { isAdmin: true, email: record.email },
      JWT_SECRET,
      { expiresIn: `${ADMIN_SESSION_HOURS}h` }
    );

    return res
      .status(200)
      .cookie("adminToken", adminSessionToken, adminCookieOptions())
      .json({ success: true, message: "Admin login ho gaya!", data: { email: record.email } });
  } catch (error) {
    console.error("verifyAdminLogin error:", error);
    return res.status(500).json({ success: false, message: "Login verify karte waqt error aaya." });
  }
};

// ─────────────────────────────────────────────
// GET /admin/session — frontend ye check karta hai ki admin abhi logged-in hai ya nahi
// ─────────────────────────────────────────────
export const getAdminSession = async (req, res) => {
  try {
    const token = req.cookies?.adminToken;
    if (!token) {
      return res.status(200).json({ success: true, loggedIn: false });
    }
    const decoded = jwt.verify(token, JWT_SECRET);
    if (!decoded?.isAdmin) {
      return res.status(200).json({ success: true, loggedIn: false });
    }
    return res.status(200).json({ success: true, loggedIn: true, email: decoded.email });
  } catch {
    return res.status(200).json({ success: true, loggedIn: false });
  }
};

// ─────────────────────────────────────────────
// POST /admin/logout
// ─────────────────────────────────────────────
export const adminLogout = async (req, res) => {
  return res
    .status(200)
    .clearCookie("adminToken", adminClearCookieOptions())
    .json({ success: true, message: "Admin logout ho gaya. Dobara login karne ke liye naya email link mangwana hoga." });
};
