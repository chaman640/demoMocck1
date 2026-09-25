import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import Promoter from "../models/Promoter.js";
import { JWT_SECRET } from "../utils/jwtSecret.js";
import { authCookieOptions, clearCookieOptions } from "../utils/cookieOptions.js";
import { errorDetail } from "../utils/safeError.js";

export const loginPromoter = async (req, res) => {
  try {
    const { email, phone, password } = req.body;

    if ((!email && !phone) || !password) {
      return res.status(400).json({
        success: false,
        message: "Login karne ke liye Email ya Phone, aur Password dena zaroori hai!",
      });
    }

    const query = [];
    if (email) query.push({ email: String(email).toLowerCase().trim() });
    if (phone) query.push({ phone: String(phone).trim() });

    const promoter = await Promoter.findOne({ $or: query });

    if (!promoter) {
      return res.status(404).json({
        success: false,
        message: "Is email ya phone se koi promoter account nahi mila.",
      });
    }

    if (promoter.status !== "active") {
      return res.status(403).json({
        success: false,
        message: "Aapka account active nahi hai. Admin se sampark karein.",
      });
    }

    const isPasswordCorrect = await bcrypt.compare(password, promoter.password);
    if (!isPasswordCorrect) {
      return res.status(401).json({ success: false, message: "Galat password!" });
    }

    const token = jwt.sign({ promoterId: promoter._id }, JWT_SECRET, { expiresIn: "7d" });

    return res
      .status(200)
      .cookie("promoterToken", token, authCookieOptions())
      .json({
        success: true,
        message: "Login successful!",
        data: {
          _id: promoter._id,
          name: promoter.name,
          email: promoter.email,
          phone: promoter.phone,
          code: promoter.code,
          mustChangePassword: promoter.mustChangePassword,
        },
      });
  } catch (error) {
    console.error("Promoter Login Error:", error);
    return res.status(500).json({
      success: false,
      message: "Server mein error aa gaya login karte waqt.",
      ...errorDetail(error),
    });
  }
};

export const logoutPromoter = async (req, res) => {
  res.clearCookie("promoterToken", clearCookieOptions());
  return res.status(200).json({ success: true, message: "Logout ho gaye!" });
};

export const changePromoterPassword = async (req, res) => {
  try {
    const { currentPassword, newPassword, confirmPassword } = req.body;

    if (!currentPassword || !newPassword || !confirmPassword) {
      return res.status(400).json({
        success: false,
        message: "Current password, naya password aur confirm password sabhi zaroori hain!",
      });
    }
    if (String(newPassword).length < 6) {
      return res.status(400).json({
        success: false,
        message: "Naya password kam se kam 6 characters ka hona chahiye!",
      });
    }
    if (newPassword !== confirmPassword) {
      return res.status(400).json({
        success: false,
        message: "Naya password aur confirm password match nahi kar rahe!",
      });
    }

    const promoter = await Promoter.findById(req.promoter._id);
    if (!promoter) {
      return res.status(404).json({ success: false, message: "Account nahi mila!" });
    }

    const isCurrentCorrect = await bcrypt.compare(currentPassword, promoter.password);
    if (!isCurrentCorrect) {
      return res.status(401).json({ success: false, message: "Current password galat hai!" });
    }

    const salt = await bcrypt.genSalt(10);
    promoter.password = await bcrypt.hash(newPassword, salt);
    promoter.mustChangePassword = false;
    await promoter.save();

    return res.status(200).json({
      success: true,
      message: "Password badal diya gaya hai!",
    });
  } catch (error) {
    console.error("changePromoterPassword error:", error);
    return res.status(500).json({
      success: false,
      message: "Server mein error aa gaya password badalte waqt.",
      ...errorDetail(error),
    });
  }
};
