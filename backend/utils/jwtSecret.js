// utils/jwtSecret.js
// ─────────────────────────────────────────────
// 🚨 YE ROUND-1 KA SABSE BADA FIX HAI. Dhyan se padhein.
//
// PEHLE kya likha tha (8 alag-alag files mein):
//
//     jwt.sign({...}, process.env.JWT_SECRET || "mera_super_secret_key")
//     jwt.verify(token, process.env.JWT_SECRET || "mera_super_secret_key")
//
// "|| mera_super_secret_key" ka matlab hai: agar kisi wajah se JWT_SECRET
// set nahi hua (Render pe env variable add karna bhool gaye, typo ho gaya,
// ya .env file deploy mein gayi hi nahi), to server CHUP-CHAAP is public
// string se token banane lagega — koi error nahi, koi warning nahi.
//
// KHATRA KITNA BADA HAI:
//   Ye string aapke GitHub repo mein hai (public/private, farak nahi padta —
//   ye chat mein bhi aa chuki hai). Jise ye pata hai, wo apne laptop pe
//   2 line likh kar KISI BHI user ka valid login token bana sakta hai:
//
//       jwt.sign({ userId: "<kisi ka bhi id>" }, "mera_super_secret_key")
//
//   ...aur usse aapke admin account tak mein ghus sakta hai. Password ki
//   zaroorat hi nahi padegi.
//
// AB KYA HOTA HAI:
//   • production mein JWT_SECRET nahi hai  → server START HI NAHI HOGA
//     (chup-chaap galat chalne se behtar hai ki saaf-saaf ruk jaye)
//   • production mein secret leaked/placeholder ya 16 se chhota hai → start nahi hoga
//   • production mein secret 16-31 characters ka hai → chalega, lekin har
//     startup pe badi warning aayegi (site down karna sahi nahi hoga)
//   • local development mein nahi hai → ek fixed dev-secret use hota hai
//     aur console mein badi warning aati hai (taaki aapka kaam na ruke)
//
// ⚠️ DEPLOY SE PEHLE: Render pe JWT_SECRET pehle set/update karein, PHIR
//    naya code deploy karein. Ulta karenge to ek-do minute site down rahegi.
// ─────────────────────────────────────────────

const isProduction = process.env.NODE_ENV === "production";

// Purana leaked fallback — agar galti se ye hi .env mein daal diya to bhi rokna hai
const LEAKED_DEFAULTS = new Set([
  "mera_super_secret_key",
  "secret",
  "jwt_secret",
  "changeme",
  "koi_bahut_lamba_random_secret_yahan_daalein", // .env.example wali placeholder
]);

const DEV_FALLBACK = "dev-only-insecure-secret-NEVER-use-in-production";

const raw = String(process.env.JWT_SECRET || "").trim();

const die = (why) => {
  console.error("\n" + "═".repeat(62));
  console.error("❌ SERVER CANNOT START — JWT_SECRET problem");
  console.error("═".repeat(62));
  console.error(why);
  console.error("");
  console.error("HOW TO FIX:");
  console.error("  1. Generate a new random secret:");
  console.error('       node -e "console.log(require(\'crypto\').randomBytes(48).toString(\'hex\'))"');
  console.error("  2. Render → your service → Environment → Add Environment Variable");
  console.error("       Key   : JWT_SECRET");
  console.error("       Value : <output of the command above>");
  console.error("  3. Save and redeploy.");
  console.error("");
  console.error("  ⚠️ Changing the secret will log ALL users out once — this is normal.");
  console.error("═".repeat(62) + "\n");
  process.exit(1);
};

let secret;

if (!raw) {
  if (isProduction) {
    die("JWT_SECRET is not set at all (it is required in production).");
  }
  secret = DEV_FALLBACK;
  console.warn(
    "\n⚠️  JWT_SECRET is not set — using a temporary development secret.\n" +
      "    Make sure to set it in .env / Render before going to production.\n"
  );
} else if (LEAKED_DEFAULTS.has(raw.toLowerCase())) {
  if (isProduction) {
    die(
      `The JWT_SECRET value is "${raw}" — this is a well-known (leaked) value.\n` +
        "Anyone can use it to create a login token for any user."
    );
  }
  secret = raw;
  console.warn(`\n⚠️  The JWT_SECRET value "${raw}" is very weak/leaked. Change it before production.\n`);
} else if (isProduction && raw.length < 16) {
  // 16 se chhota secret sach mein brute-force ho sakta hai — yahan rukna hi padega
  die(
    `JWT_SECRET is only ${raw.length} characters long. A secret this short ` +
      "can be brute-forced. Use at least 32 (better 64+)."
  );
} else {
  secret = raw;
  if (raw.length < 32) {
    // Site ko down karna theek nahi — bas har startup pe yaad dilate rahenge
    console.warn("\n" + "⚠".repeat(31));
    console.warn(`⚠️  JWT_SECRET is only ${raw.length} characters long — it is weak.`);
    console.warn("    Generate a new one and replace it in Render's Environment:");
    console.warn('      node -e "console.log(require(\'crypto\').randomBytes(48).toString(\'hex\'))"');
    console.warn("    (After changing it, all users will be logged out once — this is normal.)");
    console.warn("⚠".repeat(31) + "\n");
  }
}

export const JWT_SECRET = secret;

export default JWT_SECRET;
