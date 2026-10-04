import jwt from "jsonwebtoken";
import Promoter from "../models/Promoter.js";
import { JWT_SECRET } from "../utils/jwtSecret.js";

// Password badalne se pehle bana token ab nahi chalega
const issuedBeforePasswordChange = (decoded, account) =>
  Boolean(account?.passwordChangedAt) && decoded.iat * 1000 < account.passwordChangedAt.getTime() - 1000;

export const promoterInfo = async (req, res, next) => {
  try {
    const token = req.cookies?.promoterToken;

    if (!token) {
      return res.status(401).json({
        success: false,
        message: "You are not logged in. Please log in first!",
      });
    }

    const decoded = jwt.verify(token, JWT_SECRET);

    const promoter = await Promoter.findById(decoded.promoterId).select("-password");

    if (!promoter) {
      return res.status(404).json({
        success: false,
        message: "Account not found or has been deleted!",
      });
    }

    if (promoter.status !== "active") {
      return res.status(403).json({
        success: false,
        message: "This account is not active. Contact the admin.",
      });
    }

    if (issuedBeforePasswordChange(decoded, promoter)) {
      return res.status(401).json({
        success: false,
        message: "Your password has been changed. Please log in with the new password.",
        code: "TOKEN_EXPIRED",
      });
    }

    req.promoter = promoter;
    next();
  } catch (error) {
    if (error?.name === "TokenExpiredError") {
      return res.status(401).json({
        success: false,
        message: "Your session has expired. Please log in again.",
        code: "TOKEN_EXPIRED",
      });
    }
    if (error?.name === "JsonWebTokenError") {
      return res.status(401).json({
        success: false,
        message: "Invalid login token. Please log in again.",
        code: "TOKEN_INVALID",
      });
    }
    console.error("Promoter auth middleware error:", error?.message);
    return res.status(500).json({
      success: false,
      message: "Problem checking login. Try again in a little while.",
    });
  }
};
