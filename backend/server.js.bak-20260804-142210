// server.js
// ⚠️ SABSE ZAROORI: "dotenv/config" hamesha SABSE PEHLA import rahe.
//
// KYUN? ESM (import/export) mein saare `import` pehle chalte hain, uske baad
// file ka apna code (jaise purana `dotenv.config()`) chalta hai. Iska matlab
// tha ki jab middlewares/processQuestion.js load hota tha aur uske top pe
// `cloudinary.config({ cloud_name: process.env.CLOUDINARY_CLOUD_NAME, ... })`
// chalta tha, tab .env load hi nahi hua hota tha → saari values `undefined`
// → har image upload "Cloudinary upload failed" deta tha.
//
// `import "dotenv/config"` khud ek module hai, aur imports order mein chalte
// hain — isliye ise sabse upar rakhne se baaki sab modules ko env mil jata hai.
import "dotenv/config";

import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";
import { rowQuestionConnection } from "./config/rowQuestion.js";
import questionRouter from "./routes/Routes.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const app = express();
const PORT = process.env.PORT || 5000;

// Proxy (Render/Nginx) ke peeche secure cookies sahi se kaam karein
app.set("trust proxy", 1);

// ─────────────────────────────────────────────
// CORS
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
      // Postman / mobile app / same-origin requests mein origin nahi hoti
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
// Body parsers — routes se PEHLE
// ─────────────────────────────────────────────
app.use(express.json({ limit: "5mb" })); // bulk question upload ke liye thoda bada
app.use(express.urlencoded({ extended: true, limit: "5mb" }));
app.use(cookieParser());

// Chhota sa health-check — deploy debug karne mein kaam aata hai
app.get("/api/health", (req, res) => {
  res.status(200).json({
    success: true,
    dbState: rowQuestionConnection.readyState, // 1 = connected
    env: process.env.NODE_ENV || "development",
  });
});

// ─────────────────────────────────────────────
// API Routes
// ─────────────────────────────────────────────
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
// Frontend (React build) serve karna — API ke BAAD
// ─────────────────────────────────────────────
const distPath = path.join(__dirname, "../frontend/dist");
const indexHtmlPath = path.join(distPath, "index.html");

app.use(express.static(distPath));

app.get(/^(?!\/api).*/, (req, res) => {
  if (!fs.existsSync(indexHtmlPath)) {
    return res
      .status(503)
      .send(
        "Frontend build nahi mila. Pehle `cd frontend && npm run build` chalayein, " +
          "ya dev mein frontend alag se `npm run dev` se chalayein."
      );
  }
  res.sendFile(indexHtmlPath);
});

// ─────────────────────────────────────────────
// Global error handler — 🐛 FIX: pehle koi bhi unhandled error
// HTML stack-trace return karta tha jise axios parse nahi kar pata tha
// ─────────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error("Unhandled error:", err);
  if (res.headersSent) return next(err);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || "Server mein unexpected error aa gaya.",
  });
});

// ─────────────────────────────────────────────
// DB connect hone ke BAAD hi server start karo
// ─────────────────────────────────────────────
let serverStarted = false;
const startServer = () => {
  if (serverStarted) return;
  serverStarted = true;
  app.listen(PORT, () => {
    console.log(`✅ Server running on port ${PORT}`);
    console.log(`✅ Database connected`);
    console.log(`   NODE_ENV = ${process.env.NODE_ENV || "development"}`);
  });
};

// 🐛 FIX: agar connection is file ke chalne se PEHLE hi ban gaya ho,
// to `once("connected")` kabhi fire nahi hota tha aur server hang ho jata tha.
if (rowQuestionConnection.readyState === 1) {
  startServer();
} else {
  rowQuestionConnection.once("connected", startServer);
}

rowQuestionConnection.on("error", (err) => {
  console.error("❌ Database connection failed:", err.message);
  if (!serverStarted) process.exit(1);
});

// Process-level safety nets — server silently marne ke bajaye log kare
process.on("unhandledRejection", (reason) => {
  console.error("Unhandled promise rejection:", reason);
});
