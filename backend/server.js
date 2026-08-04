// server.js  —  PRODUCTION READY (Round 1)
//
// ⚠️ SABSE ZAROORI: "dotenv/config" hamesha SABSE PEHLA import rahe.
//
// KYUN? ESM (import/export) mein saare `import` pehle chalte hain, uske baad
// file ka apna code chalta hai. Isliye agar dotenv baad mein load hota, to
// jo modules top pe process.env padhte hain (cloudinary config, jwtSecret,
// rowQuestion) unko sab `undefined` milta.
import "dotenv/config";

import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import helmet from "helmet";
import compression from "compression";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";

// ⚠️ ORDER ZAROORI HAI: envCheck ka import rowQuestion/jwtSecret se PEHLE hai.
// ESM me imports isi order me chalte hain, aur rowQuestion.js / jwtSecret.js
// dono missing env par khud hi ruk jate hain. Agar envCheck baad me hota to
// user ko dostana checklist ke bajaye ek raw stack trace milta.
import "./utils/envCheck.js"; // import hote hi khud chal jata hai
import { rowQuestionConnection } from "./config/rowQuestion.js";
import { sanitizeRequest } from "./middlewares/sanitize.js";
import { globalLimiter } from "./middlewares/rateLimiters.js";
import questionRouter from "./routes/Routes.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const app = express();
const PORT = process.env.PORT || 5000;
const isProduction = process.env.NODE_ENV === "production";

// Render/Nginx jaise proxy ke peeche:
//   • secure cookies sahi kaam karein
//   • rate limiter ko asli client IP mile (warna sabki IP ek jaisi dikhti hai
//     aur ek bot ki wajah se saare users block ho jaate)
app.set("trust proxy", 1);
app.disable("x-powered-by");

// ─────────────────────────────────────────────
// 1. SECURITY HEADERS (helmet)
//
// Ye browser ko batata hai ki aapki site ke saath kya-kya allowed hai.
// Bina iske site clickjacking, MIME-sniffing aur XSS ke liye khuli rehti hai.
//
// CSP (Content-Security-Policy) sabse taakatwar hai lekin sabse "nakhre wali"
// bhi — isliye escape hatch rakha hai: agar kabhi kuch toote to
// DISABLE_CSP=true set karke turant band kar sakte hain (aur mujhe batayein).
// ─────────────────────────────────────────────
const disableCsp = String(process.env.DISABLE_CSP || "").toLowerCase() === "true";

const cspDirectives = {
  defaultSrc: ["'self'"],
  baseUri: ["'self'"],
  objectSrc: ["'none'"],
  frameAncestors: ["'none'"], // koi doosri site aapko iframe mein nahi daal sakti
  formAction: ["'self'"],
  scriptSrc: ["'self'"], // Vite build ki saari JS alag file mein hoti hai — safe
  // recharts / react inline `style=""` lagate hain, isliye style ke liye
  // 'unsafe-inline' zaroori hai. Ye XSS ke liye khatarnak nahi hai.
  // Google Fonts pehle se allow — kabhi index.html me font link jode to
  // site chup-chaap bina style ke render na ho jaye
  styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
  // Cloudinary aur baaki https images allow — questions ki photos ke liye
  imgSrc: ["'self'", "data:", "blob:", "https:"],
  fontSrc: ["'self'", "data:", "https://fonts.gstatic.com"],
  connectSrc: ["'self'", "https:"],
  mediaSrc: ["'self'", "https:", "data:"],
  workerSrc: ["'self'", "blob:"], // aage PWA service worker ke liye
  manifestSrc: ["'self'"], // aage PWA manifest.json ke liye
  // YouTube solution-video embed karna ho to ye pehle se laga hai
  frameSrc: ["'self'", "https://www.youtube.com", "https://www.youtube-nocookie.com"],
};
if (isProduction) cspDirectives.upgradeInsecureRequests = [];

app.use(
  helmet({
    contentSecurityPolicy: disableCsp ? false : { useDefaults: false, directives: cspDirectives },
    // HSTS sirf production mein — local http pe browser ko HTTPS pe
    // force karke development todna nahi hai
    strictTransportSecurity: isProduction
      ? { maxAge: 15552000, includeSubDomains: true } // 180 din
      : false,
    // Images/fonts doosre origin se load ho sakein (Cloudinary)
    crossOriginResourcePolicy: { policy: "cross-origin" },
    crossOriginEmbedderPolicy: false, // warna Cloudinary images block ho jaati hain
    referrerPolicy: { policy: "strict-origin-when-cross-origin" },
  })
);

// ─────────────────────────────────────────────
// 2. COMPRESSION — Render free plan ka bandwidth bachata hai
//    aur slow 4G pe app kaafi tez khulta hai (JSON 70-80% chhota ho jaata hai)
// ─────────────────────────────────────────────
app.use(compression());

// ─────────────────────────────────────────────
// 3. CORS
// ─────────────────────────────────────────────
const allowedOrigins = [
  "http://localhost:5173", // Vite dev server
  "http://127.0.0.1:5173",
  "http://localhost:4173", // vite preview
  "https://mocktest1.onrender.com",
  process.env.FRONTEND_URL,
].filter(Boolean);

app.use(
  cors({
    origin: (origin, callback) => {
      // Postman / TWA android app / same-origin requests mein origin nahi hoti
      if (!origin) return callback(null, true);
      if (allowedOrigins.includes(origin)) return callback(null, true);
      // 🐛 FIX: pehle yahan `new Error(...)` throw hota tha jo Express 5 mein
      // ek ugly 500 HTML page de deta tha. Ab bas CORS headers nahi bhejte —
      // browser khud block kar dega aur server crash-log spam nahi hoga.
      console.warn(`CORS blocked: ${origin}`);
      return callback(null, false);
    },
    credentials: true,
  })
);

// ─────────────────────────────────────────────
// 4. Body parsers — routes se PEHLE
//    Limit 5mb se ghata kar 2mb — 200 questions ka bulk JSON bhi
//    ~300kb hota hai, to 2mb bahut hai. Chhoti limit = kam DoS surface.
// ─────────────────────────────────────────────
const BODY_LIMIT = process.env.JSON_BODY_LIMIT || "2mb";
app.use(express.json({ limit: BODY_LIMIT }));
app.use(express.urlencoded({ extended: true, limit: BODY_LIMIT }));
app.use(cookieParser());

// NoSQL injection guard (middlewares/sanitize.js mein poora explanation hai)
app.use(sanitizeRequest);

// ─────────────────────────────────────────────
// 5. Halka sa request logger
//    Sirf slow (>1.5s) ya failed (>=400) requests log hoti hain, taaki
//    Render ka log spam na ho lekin problem hone par turant dikh jaye.
// ─────────────────────────────────────────────
app.use((req, res, next) => {
  const startedAt = process.hrtime.bigint();
  res.on("finish", () => {
    const ms = Number(process.hrtime.bigint() - startedAt) / 1e6;
    if (res.statusCode >= 400 || ms > 1500) {
      console.log(
        `${res.statusCode >= 500 ? "🔴" : res.statusCode >= 400 ? "🟡" : "🐢"} ` +
          `${req.method} ${req.originalUrl} → ${res.statusCode} (${ms.toFixed(0)}ms)`
      );
    }
  });
  next();
});

// ─────────────────────────────────────────────
// 6. Health check — uptime monitor isi pe ping karta hai.
//    Rate limiter se PEHLE rakha hai taaki har minute ka ping kabhi block na ho.
//
//    DB down hone par ab 503 milta hai (pehle 200 milta tha) — matlab
//    aapka uptime monitor sach bolega, jhoothi "site up hai" nahi dikhayega.
// ─────────────────────────────────────────────
const startedAtMs = Date.now();

// LIVENESS — "process zinda hai kya?" Hamesha 200.
// 👉 Render ke "Health Check Path" me YEHI daalein (ya khali chhod dein).
//    /api/health mat daalein — wo DB blip par 503 deta hai, aur Render usse
//    "app mar gaya" samajh kar container restart kar dega, jisse us waqt test
//    de rahe students ka attempt toot jayega.
app.get("/api/ping", (req, res) => res.status(200).json({ success: true, pong: true }));

// READINESS — "sab kuch sahi chal raha hai kya?" DB down ho to 503.
// 👉 Aapke uptime monitor (jo har kuch minute ping karta hai) ke liye YEH sahi hai.
app.get("/api/health", (req, res) => {
  const dbState = rowQuestionConnection.readyState; // 1 = connected
  const healthy = dbState === 1;
  res.status(healthy ? 200 : 503).json({
    success: healthy,
    dbState,
    db: ["disconnected", "connected", "connecting", "disconnecting"][dbState] ?? "unknown",
    env: process.env.NODE_ENV || "development",
    uptimeSeconds: Math.round((Date.now() - startedAtMs) / 1000),
  });
});

// ─────────────────────────────────────────────
// 7. API Routes (global rate limit ke peeche)
// ─────────────────────────────────────────────
app.use("/api", globalLimiter);
app.use("/api", questionRouter);

// 🐛 FIX: pehle koi galat /api path SPA ka index.html return karta tha,
// aur frontend "Unexpected token '<'" JSON parse error deta tha.
// Ab clean JSON 404 milta hai.
app.use("/api", (req, res) => {
  res.status(404).json({
    success: false,
    message: `API route nahi mila: ${req.method} ${req.originalUrl}`,
  });
});

// ─────────────────────────────────────────────
// 8. Frontend (React build) serve karna — API ke BAAD
//
//    Caching: /assets/* ki files ka naam hash ke saath hota hai
//    (index-a1b2c3.js), isliye unhe 1 saal cache kar sakte hain.
//    index.html ko KABHI cache nahi karna — warna naya deploy karne ke
//    baad bhi users ko purana app dikhta rahega.
// ─────────────────────────────────────────────
const distPath = path.join(__dirname, "../frontend/dist");
const indexHtmlPath = path.join(distPath, "index.html");

// Har SPA request pe fs.existsSync chalana faaltu hai (HashRouter me HAR page
// load "/" hi hit karta hai). Ek baar boot pe check karke yaad rakh lete hain;
// agar na mile to hi dobara dekhte hain (dev me build baad me banti hai).
let indexHtmlFound = fs.existsSync(indexHtmlPath);
const indexHtmlExists = () => indexHtmlFound || (indexHtmlFound = fs.existsSync(indexHtmlPath));

// ─────────────────────────────────────────────
// 8a. /.well-known/ — Play Store (TWA) ke liye ZAROORI
//
// Android ko "assetlinks.json" chahiye hota hai taaki wo maan sake ki app aur
// website ek hi malik ke hain (warna app mein browser ka URL bar dikhta rehta
// hai). Wo file /.well-known/assetlinks.json par milti hai.
//
// ⚠️ TRAP: express.static aur res.sendFile dono, default settings mein,
// "." se shuru hone wale folder/file ko CHUP-CHAAP 404 kar dete hain
// (dotfiles: "ignore"). Yaani agar ye alag mount na ho, to assetlinks.json
// hamesha 404 deta aur Play Store wali verification kabhi paas na hoti —
// aur error kahin dikhta bhi nahi.
// Isliye sirf is ek folder ke liye dotfiles: "allow" kar rahe hain.
// ─────────────────────────────────────────────
app.use(
  "/.well-known",
  express.static(path.join(distPath, ".well-known"), {
    dotfiles: "allow",
    maxAge: 0,
    setHeaders: (res) => res.setHeader("Cache-Control", "public, max-age=300"),
  })
);

app.use(
  express.static(distPath, {
    index: false, // "/" hamesha neeche wale handler se jayega
    etag: true,
    maxAge: 0,
    setHeaders: (res, filePath) => {
      if (/[\\/]assets[\\/]/.test(filePath)) {
        res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
      } else if (filePath.endsWith(".html")) {
        res.setHeader("Cache-Control", "no-cache");
      } else {
        res.setHeader("Cache-Control", "public, max-age=3600");
      }
    },
  })
);

// ⚠️ Regex me do cheezein jaan-boojh kar hain:
//   • /api aur /api/... ko chhodna (wahan JSON 404 milta hai)
//   • /.well-known/... ko chhodna — warna assetlinks.json missing hone par
//     SPA ka index.html 200 OK ke saath chala jata, aur Play Store ki
//     verification "file mil gayi lekin JSON nahi hai" wali ajeeb galti deti.
//     Ab saaf 404 milta hai.
app.get(/^(?!\/api(?:\/|$)|\/\.well-known(?:\/|$)).*/, (req, res) => {
  if (!indexHtmlExists()) {
    return res
      .status(503)
      .send(
        "Frontend build nahi mila. Pehle `cd frontend && npm run build` chalayein, " +
          "ya dev mein frontend alag se `npm run dev` se chalayein."
      );
  }
  res.setHeader("Cache-Control", "no-cache");
  // ⚠️ `dotfiles: "allow"` jaan-boojh kar: agar project ka path kabhi kisi
  // hidden folder ke andar chala jaye (jaise /home/user/.apps/mockTest), to
  // res.sendFile default settings mein chup-chaap 404 de deta hai aur poori
  // website "khali" dikhne lagti hai. Yahan path humara apna fixed path hai,
  // user ka bheja hua nahi — isliye ye bilkul safe hai.
  res.sendFile("index.html", { root: distPath, dotfiles: "allow" }, (err) => {
    if (err && !res.headersSent) {
      console.error("index.html bhejne mein error:", err.message);
      res.status(500).send("Frontend load nahi ho paya.");
    }
  });
});

// ─────────────────────────────────────────────
// 9. Global error handler
//    🐛 FIX: pehle koi bhi unhandled error HTML stack-trace return karta tha
//    jise axios parse nahi kar pata tha.
//    🔒 NAYA: production mein asli error message user ko nahi bhejte —
//    stack trace se attacker ko file paths / DB structure pata chal jata hai.
// ─────────────────────────────────────────────
app.use((err, req, res, next) => {
  if (res.headersSent) return next(err);

  // Kharab JSON body (typing mistake / galat Postman request)
  if (err?.type === "entity.parse.failed") {
    return res.status(400).json({ success: false, message: "Request ka JSON format galat hai." });
  }
  // Body limit se bada payload
  if (err?.type === "entity.too.large") {
    return res.status(413).json({
      success: false,
      message: `Data bahut bada hai (limit ${BODY_LIMIT}). Thode-thode karke bhejein.`,
    });
  }
  // Multer (file upload) ki galtiyan
  if (err?.code === "LIMIT_FILE_SIZE") {
    return res.status(413).json({ success: false, message: "Image 10MB se badi hai." });
  }

  console.error("Unhandled error:", err?.stack || err);

  const status = err.status || err.statusCode || 500;
  res.status(status).json({
    success: false,
    message:
      isProduction && status >= 500
        ? "Server mein kuch gadbad ho gayi. Thodi der baad try karein."
        : err.message || "Server mein unexpected error aa gaya.",
  });
});

// ─────────────────────────────────────────────
// 10. DB connect hone ke BAAD hi server start karo
// ─────────────────────────────────────────────
// 🔧 Round 1: pehle `app.listen()` tab chalta tha JAB database connect ho jata.
// Isme do dikkatein thin:
//   1. Render deploy ke waqt port scan karta hai. Agar Atlas 30 second le le,
//      to Render "No open ports detected" kehkar poora deploy fail kar deta hai.
//   2. Us beech koi bhi request seedha "connection refused" deti thi — user ko
//      browser ka error page dikhta tha, aapka koi message nahi.
//
// Ab: port turant khul jata hai, aur `/api/health` tab tak 503 deta hai jab tak
// database ready na ho. Agar database bilkul na jude to server 90 second baad
// khud exit kar jata hai taaki Render naya container chalu kare.
const server = app.listen(PORT, () => {
  console.log(`✅ Server running on port ${PORT}`);
  console.log(`   NODE_ENV = ${process.env.NODE_ENV || "development"}`);
  console.log(`   Security = helmet ✓  rate-limit ✓  sanitize ✓  compression ✓`);
  console.log(`   Database = connect ho raha hai...`);
});

// Render ke load balancer ke saath keep-alive race condition se bachne ke liye
// (server ka timeout proxy se thoda zyada hona chahiye, warna beech-beech
//  mein random 502 aate hain)
server.keepAliveTimeout = 65000;
server.headersTimeout = 70000;

let dbEverConnected = rowQuestionConnection.readyState === 1;
let dbWatchdog; // neeche set hota hai — onDbReady se pehle declare karna zaroori hai

const onDbReady = () => {
  if (dbEverConnected) return;
  dbEverConnected = true;
  clearTimeout(dbWatchdog);
  console.log("✅ Database ready — ab site poori tarah chalu hai");
};

// 🐛 FIX (pehle wale round se): agar connection is file ke chalne se PEHLE hi
// ban gaya ho, to `once("connected")` kabhi fire nahi hota tha.
if (dbEverConnected) {
  console.log("✅ Database pehle se connected");
} else {
  rowQuestionConnection.once("connected", onDbReady);
}

// Startup watchdog — database bilkul na jude to latke rehne ka koi fayda nahi
dbWatchdog = setTimeout(() => {
  if (!dbEverConnected) {
    console.error("❌ 90 second me database connect nahi hua. Exit kar rahe hain");
    console.error("   (Render naya container start karega. Logs me upar wali");
    console.error("    'Database connection error' line dekhein.)");
    process.exit(1);
  }
}, 90_000);
dbWatchdog.unref();

// ─────────────────────────────────────────────
// 11. GRACEFUL SHUTDOWN
//
// Render har deploy pe purane container ko SIGTERM bhejta hai. Pehle server
// bilkul achanak marta tha — matlab us waqt chal rahi requests (jaise koi
// student apna test submit kar raha ho) beech mein hi kat jaati thi aur
// uska poora attempt gum ho jata tha.
//
// Ab: naye connections lena band → chal rahi requests poori hone do →
// database connection theek se band karo → phir exit.
// ─────────────────────────────────────────────
let shuttingDown = false;

const shutdown = async (signal, exitCode = 0) => {
  if (shuttingDown) {
    // Shutdown ke beech me hi crash ho gaya — chup-chaap nigalna theek nahi
    if (exitCode !== 0) {
      console.error("Shutdown ke dauraan crash — turant exit.");
      process.exit(exitCode);
    }
    return;
  }
  shuttingDown = true;
  console.log(`\n${signal} mila — server band kar rahe hain (chal rahi requests poori hone denge)...`);

  // Agar 15 second mein saaf-safai poori na ho to zabardasti band
  const force = setTimeout(() => {
    console.error("⏱️  Graceful shutdown time out — force exit.");
    process.exit(1);
  }, 15000);
  force.unref();

  try {
    if (server) {
      await new Promise((resolve) => server.close(resolve));
      console.log("   ✔ HTTP server band");
    }
    await rowQuestionConnection.close(false);
    console.log("   ✔ Database connection band");
  } catch (e) {
    console.error("   Shutdown ke waqt error:", e.message);
  }

  clearTimeout(force);
  console.log("👋 Bye");
  // ⚠️ exitCode 0 sirf asli (SIGTERM/SIGINT) shutdown me. Crash ke baad 0 dena
  // Render ko "sab theek tha" ka jhootha signal deta hai.
  process.exit(exitCode);
};

process.on("SIGTERM", () => shutdown("SIGTERM")); // Render deploy/restart
process.on("SIGINT", () => shutdown("SIGINT")); // Ctrl+C

// ─────────────────────────────────────────────
// 12. Process-level safety nets
// ─────────────────────────────────────────────
process.on("unhandledRejection", (reason) => {
  console.error("🔴 Unhandled promise rejection:", reason);
  // Jaan-boojh kar exit nahi kar rahe — ek chhoti si galti se poora
  // server girna nahi chahiye. Log dekh kar theek karein.
});

process.on("uncaughtException", (err) => {
  console.error("🔴 Uncaught exception:", err?.stack || err);
  // Yahan process ki state bharosemand nahi rehti — saaf-suthre tarike se
  // band karke Render ko naya container start karne dete hain.
  shutdown("uncaughtException", 1);
});

export default app;
