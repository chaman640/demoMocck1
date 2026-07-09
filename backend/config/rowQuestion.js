// config/rowQuestion.js
import mongoose from "mongoose";
import "dotenv/config"; // 👈 Sirf yeh ek line jad se variable ka error khatam karegii!

const ROWQUESTION_URI = process.env.ROWQUESTION_URI;

if (!ROWQUESTION_URI) {
  throw new Error("ROWQUESTION_URI is not defined in .env file");
}

// Apne strict options jo SSL error ko bypass karenge
const connectionOptions = {
  tls: true,
  tlsAllowInvalidCertificates: true,
  tlsAllowInvalidHostnames: true,
};

export const rowQuestionConnection = mongoose.createConnection(ROWQUESTION_URI, connectionOptions);

rowQuestionConnection.on("connected", () => {
  console.log("✅ ROWQUESTION_URI database connected successfully!");
});

rowQuestionConnection.on("error", (err) => {
  console.error("❌ ROWQUESTION_URI connection error:", err.message);
});