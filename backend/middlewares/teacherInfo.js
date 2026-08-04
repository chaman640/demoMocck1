// middlewares/teacherInfo.js — teacher ka login check
import jwt from "jsonwebtoken";
import Teacher from "../models/Teacher.js";
// 🔒 Round 1: leaked fallback secret hataya — utils/jwtSecret.js dekhein
import { JWT_SECRET } from "../utils/jwtSecret.js";

export const teacherInfo = async (req, res, next) => {
  try {
    // 1. Cookie se token — ⚠️ naam "teacherToken" hai, "token" NAHI
    const token = req.cookies?.teacherToken;

    if (!token) {
      return res.status(401).json({
        success: false,
        message: "Aap logged in nahi hain. Kripya pehle login karein!",
      });
    }

    // 2. Token verify — ⚠️ decoded ke andar key "teacherId" hai, "userId" NAHI
    const decoded = jwt.verify(token, JWT_SECRET);

    // 3. Database se teacher ka data
    const teacher = await Teacher.findById(decoded.teacherId).select("-password");

    if (!teacher) {
      return res.status(404).json({
        success: false,
        message: "Account nahi mila ya delete ho chuka hai!",
      });
    }

    // 4. Extra safety — beech mein remove kiye gaye teacher ka purana token
    //    abhi bhi valid ho sakta hai, isliye status yahan bhi check karte hain
    if (teacher.status !== "active") {
      return res.status(403).json({
        success: false,
        message: "Ye account abhi active nahi hai.",
      });
    }

    // 5. ⚠️ req.user mein NAHI daalna — student aur teacher context alag rahein
    req.teacher = teacher;
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
    console.error("Teacher auth middleware error:", error?.message);
    return res.status(500).json({
      success: false,
      message: "Login check karne mein dikkat aa gayi. Thodi der baad try karein.",
    });
  }
};
