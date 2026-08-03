export const logoutTeacher = (req, res) => {
  try {
    res.clearCookie("teacherToken", { httpOnly: true, secure: true, sameSite: "lax" });
    return res.status(200).json({ success: true, message: "Logout ho gaya!" });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Logout mein error aaya." });
  }
};