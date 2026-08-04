// middlewares/userInfo.js — student ka login check
import jwt from "jsonwebtoken";
import User from "../models/User.js";
// 🔒 Round 1: pehle yahan `process.env.JWT_SECRET || "mera_super_secret_key"`
// likha tha. Us fallback ki wajah se, agar kabhi JWT_SECRET set na ho, koi bhi
// banda apne aap ko kisi bhi user ke roop mein "login" kara sakta tha.
// Poori kahani utils/jwtSecret.js mein likhi hai.
import { JWT_SECRET } from "../utils/jwtSecret.js";

export const userInfo = async (req, res, next) => {
  try {
    // 1. Browser ki cookie se token nikalna (cookie-parser server.js mein laga hai)
    const token = req.cookies?.token;

    if (!token) {
      return res.status(401).json({
        success: false,
        message: "Aap logged in nahi hain. Kripya pehle login karein!",
      });
    }

    // 2. Token verify karna
    const decoded = jwt.verify(token, JWT_SECRET);

    // 3. Database se user ka data (password chhod kar)
    const user = await User.findById(decoded.userId).select("-password");

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "Account nahi mila ya delete ho chuka hai!",
      });
    }

    // 4. Aage ke controllers ke liye attach
    req.user = user;
    next();
  } catch (error) {
    // 🔧 Round 1: expire hona aur token galat hona — dono alag messages,
    // taaki frontend/user ko samajh aaye ki dobara login kyun karna pad raha hai.
    if (error?.name === "TokenExpiredError") {
      return res.status(401).json({
        success: false,
        message: "Session khatam ho gaya hai. Kripya phir se login karein.",
        code: "TOKEN_EXPIRED",
      });
    }
    if (error?.name === "JsonWebTokenError") {
      return res.status(401).json({
        success: false,
        message: "Login token galat hai. Kripya phir se login karein.",
        code: "TOKEN_INVALID",
      });
    }
    // Ye asli server-side gadbad hai (DB down waqera) — 401 dena galat hoga,
    // warna user baar-baar login karta rahega aur samajh nahi aayega.
    console.error("Auth middleware error:", error?.message);
    return res.status(500).json({
      success: false,
      message: "Login check karne mein dikkat aa gayi. Thodi der baad try karein.",
    });
  }
};
