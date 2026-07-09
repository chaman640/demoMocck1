import dotenv from "dotenv";
dotenv.config(); // sabse upar — baaki sab iske baad

import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser"; // 👈 1. Ye naya import add kiya hai
import { rowQuestionConnection } from "./config/rowQuestion.js";
import questionRouter from "./routes/Routes.js";

const app = express();
const PORT = process.env.PORT || 5000;

// ─────────────────────────────────────────────
// CORS — frontend se API call allow karne ke liye
// CORS missing hone pe browser silently block karta hai —
// koi proper error nahi aata, bas request fail hoti hai
// ─────────────────────────────────────────────
const allowedOrigins = [
  "http://localhost:5173",  // React dev server (Vite)
  "https://demomocck1-1.onrender.com",  
  process.env.FRONTEND_URL, // Production frontend URL (.env mein daalo)
].filter(Boolean); // undefined values hata do

app.use(
  cors({
    origin: (origin, callback) => {
      // Postman/mobile app ke liye origin nahi hoti — allow karo
      if (!origin) return callback(null, true);
      if (allowedOrigins.includes(origin)) return callback(null, true);
      callback(new Error(`CORS blocked: ${origin} allowed nahi hai`));
    },
    credentials: true, // cookies/auth headers ke liye
  })
);

// ─────────────────────────────────────────────
// Middleware
// ─────────────────────────────────────────────
app.use(express.json());
app.use(cookieParser()); // 👈 2. Ye middleware add kiya taaki req.cookies read ho sake (Hamesha routes se upar hona chahiye)

// ─────────────────────────────────────────────
// Routes
// ─────────────────────────────────────────────
app.use("/api", questionRouter);

app.get("/", (req, res) => {
  res.send("Server is Running!");
});

// ─────────────────────────────────────────────
// Database connection check karke server start karo
// Pehle DB connect ho, phir server sune —
// warna server chal jaata hai but DB queries fail hoti hain
// ─────────────────────────────────────────────
rowQuestionConnection.once("connected", () => {
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`Database connected`);
  });
});

rowQuestionConnection.on("error", (err) => {
  console.error("Database connection failed:", err.message);
  process.exit(1); // DB nahi chala to server band karo
});