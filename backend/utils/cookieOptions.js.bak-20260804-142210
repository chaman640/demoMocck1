// utils/cookieOptions.js
// ─────────────────────────────────────────────
// KYUN BANAYI: pehle har controller apni-apni cookie options likhta tha
// (`secure: true` hardcoded). Do problems thi:
//
// 1. `secure: true` ka matlab hai "cookie sirf HTTPS pe bhejo". Local dev
//    (http://localhost:5173) mein browser ye cookie set hi nahi karta, isliye
//    login/signup "successful" dikhta tha lekin agli request pe 401 aa jata tha.
//
// 2. res.clearCookie() ki options res.cookie() ki options se EXACTLY match
//    karni chahiye, warna browser cookie delete hi nahi karta — logout toota
//    reh jata tha. Ab dono ek hi jagah se aate hain.
//
// NOTE: ye functions hain (constants nahi), taaki process.env dotenv load
// hone ke BAAD padha jaye — ESM mein imports pehle chalte hain.
// ─────────────────────────────────────────────

const isProduction = () => process.env.NODE_ENV === "production";

// res.cookie(name, token, authCookieOptions())
export const authCookieOptions = () => ({
  httpOnly: true,
  secure: isProduction(), // dev: false (http chalega), production: true
  sameSite: "lax",
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 din
});

// res.clearCookie(name, clearCookieOptions())
// maxAge yahan jaanbujh kar nahi hai — clearCookie use nahi karta
export const clearCookieOptions = () => ({
  httpOnly: true,
  secure: isProduction(),
  sameSite: "lax",
});
