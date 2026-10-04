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

// 🆕 FIX — pehle sirf process.env.FRONTEND_URL use hota tha, aur wo Render
// (ya kisi bhi production host) par set na ho to hardcoded
// "http://localhost:5173" par gir jaata tha — email mein wahi galat link
// chala jaata tha. Ab agar FRONTEND_URL set nahi hai, to jis domain se
// request aayi hai wahi (browser ka "Origin" header) use hota hai — jo
// hamesha sahi hota hai, kyunki request khud usi frontend se aa rahi hai
// jise admin use kar raha hai.
// Login link ka domain kabhi bhi request ke Origin header se nahi lena —
// warna koi apni site ka Origin bhej kar admin ke email mein apni site ka
// link (token ke saath) bhijwa sakta hai.
const DEV_ORIGINS = ["http://localhost:5173", "http://127.0.0.1:5173", "http://localhost:4173"];
const resolveFrontendUrl = (req) => {
  if (process.env.FRONTEND_URL) return process.env.FRONTEND_URL.replace(/\/+$/, "");
  const origin = req.headers.origin;
  if (process.env.NODE_ENV !== "production" && DEV_ORIGINS.includes(origin)) return origin;
  return "https://mocktest1.onrender.com";
};

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
        message: "Admin login is not configured. Set ADMIN_EMAIL in backend/.env.",
      });
    }

    // Cooldown — spam se bachne ke liye
    const recent = await AdminLoginToken.findOne({ email: configuredEmail }).sort({ createdAt: -1 });
    if (recent) {
      const secondsSince = (Date.now() - recent.createdAt.getTime()) / 1000;
      if (secondsSince < RESEND_COOLDOWN_SECONDS) {
        const waitMore = Math.ceil(RESEND_COOLDOWN_SECONDS - secondsSince);
        return res.status(429).json({ success: false, message: `Please try again after ${waitMore} seconds.` });
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

    const frontendUrl = resolveFrontendUrl(req);
    const link = `${frontendUrl}/#/AdminVerify?token=${rawToken}`;

    await sendAdminMagicLinkEmail(configuredEmail, link);

    return res.status(200).json({ success: true, message: "Login link sent to your email!" });
  } catch (error) {
    console.error("requestAdminLogin error:", error);
    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.statusCode ? error.message : "Error while sending the login link.",
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
      return res.status(400).json({ success: false, message: "Token is required." });
    }

    const tokenHash = hashToken(String(token));
    const record = await AdminLoginToken.findOne({ tokenHash });

    if (!record) {
      return res.status(400).json({ success: false, message: "This login link is invalid or has already been used." });
    }
    if (record.expiresAt < new Date()) {
      await AdminLoginToken.deleteOne({ _id: record._id });
      return res.status(410).json({ success: false, message: "This login link has expired. Request a new link." });
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
      .json({ success: true, message: "Admin logged in!", data: { email: record.email } });
  } catch (error) {
    console.error("verifyAdminLogin error:", error);
    return res.status(500).json({ success: false, message: "Error while verifying login." });
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
    .json({ success: true, message: "Admin logged out. Request a new email link to log in again." });
};
