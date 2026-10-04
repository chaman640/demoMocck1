import { clearCookieOptions } from "../utils/cookieOptions.js";

export const logoutTeacher = (req, res) => {
  try {
    // 🐛 FIX: set aur clear dono ek hi options se — warna cookie delete nahi hoti
    res.clearCookie("teacherToken", clearCookieOptions());
    return res.status(200).json({ success: true, message: "Logged out!" });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Error while logging out." });
  }
};
