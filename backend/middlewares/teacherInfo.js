// middlewares/teacherInfo.js
import jwt from "jsonwebtoken";
import Teacher from "../models/Teacher.js";

export const teacherInfo = async (req, res, next) => {
  try {
    // 1. Cookie se token nikalna — ⚠️ naam "teacherToken" hai, "token" NAHI
    const token = req.cookies.teacherToken;

    if (!token) {
      return res.status(401).json({
        success: false,
        message: "Aap logged in nahi hain. Kripya pehle login karein!",
      });
    }

    // 2. Token verify karna
    const decoded = jwt.verify(token, process.env.JWT_SECRET || "mera_super_secret_key");
    // ⚠️ decoded ke andar key "teacherId" hai, "userId" NAHI

    // 3. Database se teacher ka data nikalna
    const teacher = await Teacher.findById(decoded.teacherId).select("-password");

    if (!teacher) {
      return res.status(404).json({
        success: false,
        message: "Account nahi mila ya delete ho chuka hai!",
      });
    }

    // 4. Extra safety — beech mein hi remove ho gaya teacher ka token
    //    abhi bhi valid ho sakta hai, isliye yahan bhi check
    if (teacher.status !== "active") {
  return res.status(403).json({
    success: false,
    message: "Ye account abhi active nahi hai.",
  });
}
    // 5. Teacher data ko 'req' object mein attach karna
    //    ⚠️ req.user mein NAHI daalna — student aur teacher context alag rehne chahiye
    req.teacher = teacher;

    // 6. Aage badho
    next();
  } catch (error) {
    console.error("Teacher Auth Error:", error.message);
    return res.status(401).json({
      success: false,
      message: "Session expire ho gaya hai ya token galat hai. Phir se login karein.",
    });
  }
};