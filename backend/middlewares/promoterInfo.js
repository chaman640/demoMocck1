import jwt from "jsonwebtoken";
import Promoter from "../models/Promoter.js";
import { JWT_SECRET } from "../utils/jwtSecret.js";

export const promoterInfo = async (req, res, next) => {
  try {
    const token = req.cookies?.promoterToken;

    if (!token) {
      return res.status(401).json({
        success: false,
        message: "Aap logged in nahi hain. Kripya pehle login karein!",
      });
    }

    const decoded = jwt.verify(token, JWT_SECRET);

    const promoter = await Promoter.findById(decoded.promoterId).select("-password");

    if (!promoter) {
      return res.status(404).json({
        success: false,
        message: "Account nahi mila ya delete ho chuka hai!",
      });
    }

    if (promoter.status !== "active") {
      return res.status(403).json({
        success: false,
        message: "Ye account abhi active nahi hai. Admin se sampark karein.",
      });
    }

    req.promoter = promoter;
    next();
  } catch (error) {
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
    console.error("Promoter auth middleware error:", error?.message);
    return res.status(500).json({
      success: false,
      message: "Login check karne mein dikkat aa gayi. Thodi der baad try karein.",
    });
  }
};
