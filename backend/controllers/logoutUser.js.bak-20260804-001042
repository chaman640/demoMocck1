import { clearCookieOptions } from "../utils/cookieOptions.js";

export const logoutUser = (req, res) => {
  try {
    // 🐛 FIX: clearCookie ki options res.cookie ki options se EXACTLY match
    // honi chahiye (httpOnly + secure + sameSite), warna browser cookie
    // delete hi nahi karta aur user "logout" ke baad bhi logged-in rehta hai.
    res.clearCookie("token", clearCookieOptions());
    return res.status(200).json({ success: true, message: "Logout ho gaya!" });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Logout mein error aaya." });
  }
};
