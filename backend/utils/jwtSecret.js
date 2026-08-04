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
  console.error("❌ SERVER START NAHI HO SAKTA — JWT_SECRET ki problem");
  console.error("═".repeat(62));
  console.error(why);
  console.error("");
  console.error("THEEK KARNE KA TARIKA:");
  console.error("  1. Ek naya random secret banayein:");
  console.error('       node -e "console.log(require(\'crypto\').randomBytes(48).toString(\'hex\'))"');
  console.error("  2. Render → aapki service → Environment → Add Environment Variable");
  console.error("       Key   : JWT_SECRET");
  console.error("       Value : <upar wali command ka output>");
  console.error("  3. Save karke redeploy karein.");
  console.error("");
  console.error("  ⚠️ Secret badalne par SAARE users ek baar logout ho jayenge — ye normal hai.");
  console.error("═".repeat(62) + "\n");
  process.exit(1);
};

let secret;

if (!raw) {
  if (isProduction) {
    die("JWT_SECRET set hi nahi hai (production mein ye zaroori hai).");
  }
  secret = DEV_FALLBACK;
  console.warn(
    "\n⚠️  JWT_SECRET set nahi hai — development ka temporary secret use ho raha hai.\n" +
      "    Production pe jaane se pehle ise .env / Render me zaroor set karein.\n"
  );
} else if (LEAKED_DEFAULTS.has(raw.toLowerCase())) {
  if (isProduction) {
    die(
      `JWT_SECRET ki value "${raw}" hai — ye ek jaani-pehchaani (leaked) value hai.\n` +
        "Isse koi bhi banda kisi ka bhi login token bana sakta hai."
    );
  }
  secret = raw;
  console.warn(`\n⚠️  JWT_SECRET ki value "${raw}" bahut kamzor/leaked hai. Production se pehle badlein.\n`);
} else if (isProduction && raw.length < 16) {
  // 16 se chhota secret sach mein brute-force ho sakta hai — yahan rukna hi padega
  die(
    `JWT_SECRET sirf ${raw.length} characters ka hai. Itna chhota secret ` +
      "brute-force se toda ja sakta hai. Kam se kam 32 (aur behtar 64+) rakhein."
  );
} else {
  secret = raw;
  if (raw.length < 32) {
    // Site ko down karna theek nahi — bas har startup pe yaad dilate rahenge
    console.warn("\n" + "⚠".repeat(31));
    console.warn(`⚠️  JWT_SECRET sirf ${raw.length} characters ka hai — kamzor hai.`);
    console.warn("    Naya banayein aur Render ki Environment mein badal dein:");
    console.warn('      node -e "console.log(require(\'crypto\').randomBytes(48).toString(\'hex\'))"');
    console.warn("    (Badalne par sabhi users ek baar logout ho jayenge — ye normal hai.)");
    console.warn("⚠".repeat(31) + "\n");
  }
}

export const JWT_SECRET = secret;

export default JWT_SECRET;
