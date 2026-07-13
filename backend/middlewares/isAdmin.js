// middlewares/isAdmin.js
// Question Review jaise routes sirf admin (tumhare) ke liye hain —
// warna koi bhi normal signed-up student correctOption dekh sakta tha
// aur exam ka poora answer-key leak ho jaata!
export const isAdmin = (req, res, next) => {
  const adminEmail = process.env.ADMIN_EMAIL;

  if (!adminEmail) {
    console.error("ADMIN_EMAIL .env mein set nahi hai — admin routes block ho rahe hain.");
    return res.status(500).json({
      success: false,
      message: "Admin access configure nahi hai. Server .env mein ADMIN_EMAIL set karein.",
    });
  }

  if (!req.user || req.user.email !== adminEmail) {
    return res.status(403).json({
      success: false,
      message: "Ye route sirf admin ke liye hai.",
    });
  }

  next();
};