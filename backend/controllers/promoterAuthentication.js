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
        message: "Email or phone, and password are required to log in!",
      });
    }

    const query = [];
    if (email) query.push({ email: String(email).toLowerCase().trim() });
    if (phone) query.push({ phone: String(phone).trim() });

    const promoter = await Promoter.findOne({ $or: query });

    if (!promoter) {
      return res.status(404).json({
        success: false,
        message: "No promoter account found with this email or phone.",
      });
    }

    if (promoter.status !== "active") {
      return res.status(403).json({
        success: false,
        message: "Your account is not active. Contact the admin.",
      });
    }

    const isPasswordCorrect = await bcrypt.compare(password, promoter.password);
    if (!isPasswordCorrect) {
      return res.status(401).json({ success: false, message: "Wrong password!" });
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
      message: "Server error while logging in.",
      ...errorDetail(error),
    });
  }
};

export const logoutPromoter = async (req, res) => {
  res.clearCookie("promoterToken", clearCookieOptions());
  return res.status(200).json({ success: true, message: "Logged out!" });
};

export const changePromoterPassword = async (req, res) => {
  try {
    const { currentPassword, newPassword, confirmPassword } = req.body;

    if (!currentPassword || !newPassword || !confirmPassword) {
      return res.status(400).json({
        success: false,
        message: "Current password, new password and confirm password are all required!",
      });
    }
    if (String(newPassword).length < 6) {
      return res.status(400).json({
        success: false,
        message: "New password must be at least 6 characters!",
      });
    }
    if (newPassword !== confirmPassword) {
      return res.status(400).json({
        success: false,
        message: "New password and confirm password do not match!",
      });
    }

    const promoter = await Promoter.findById(req.promoter._id);
    if (!promoter) {
      return res.status(404).json({ success: false, message: "Account not found!" });
    }

    const isCurrentCorrect = await bcrypt.compare(currentPassword, promoter.password);
    if (!isCurrentCorrect) {
      return res.status(401).json({ success: false, message: "Current password is wrong!" });
    }

    const salt = await bcrypt.genSalt(10);
    promoter.password = await bcrypt.hash(String(newPassword), salt);
    promoter.mustChangePassword = false;
    promoter.passwordChangedAt = new Date(Date.now() - 1000);
    await promoter.save();

    // Doosre devices ke sessions band ho gaye; is device ko naya token
    const token = jwt.sign({ promoterId: promoter._id }, JWT_SECRET, { expiresIn: "7d" });
    return res.status(200).cookie("promoterToken", token, authCookieOptions()).json({
      success: true,
      message: "Password changed!",
    });
  } catch (error) {
    console.error("changePromoterPassword error:", error);
    return res.status(500).json({
      success: false,
      message: "Server error while changing the password.",
      ...errorDetail(error),
    });
  }
};
