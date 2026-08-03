// middlewares/processQuestion.js
import multer from "multer";
import cloudinaryPackage from "cloudinary";
import sharp from "sharp";
import fs from "fs";
import path from "path";
// import dotenv from "dotenv";

// dotenv.config();

const cloudinary = cloudinaryPackage.v2; // 👈 V2 Instance setup done

// 1️⃣ Cloudinary Configuration (Theek kar diya)
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// 2️⃣ Multer Memory Storage Setup
const storage = multer.memoryStorage();
const uploadFields = multer({
  storage: storage,
  limits: { fileSize: 10 * 1024 * 1024 },
}).fields([
  { name: "questionPhoto", maxCount: 1 },
  { name: "answerExplainWithPhoto", maxCount: 1 }
]);

// Helper function: Local temporary file ko Cloudinary par upload karne ke liye
const uploadToCloudinary = async (localFilePath) => {
  try {
    // 👈 Yahan bhi 'cloudinary' kar diya
    const response = await cloudinary.uploader.upload(localFilePath, {
      folder: "questions_photos",
      resource_type: "image"
    });
    return response.secure_url;
  } catch (error) {
    throw new Error("Cloudinary upload failed: " + error.message);
  }
};

// 3️⃣ Main Middleware Function
export const processQuestionMiddleware = (req, res, next) => {
  uploadFields(req, res, async function (err) {
    if (err) {
      return res.status(400).json({ success: false, message: "Multer Error: " + err.message });
    }

    try {
      const { question, option1, option2, option3, option4, correctOption, subjectName, topicName,examName } = req.body;

      // 🛑 A. TEXT DATA VALIDATION
      if (!question || !option1 || !option2 || !option3 || !option4 || !subjectName || !topicName) {
        return res.status(400).json({ success: false, message: "❌ Sabhi fields aur options zaroori hain!" });
      }
      if (!correctOption || correctOption < 1 || correctOption > 4) {
        return res.status(400).json({ success: false, message: "❌ correctOption 1 se 4 ke beech hona chahiye!" });
      }

      let parsedExamName = examName;
      if (typeof examName === "string") {
        try { parsedExamName = JSON.parse(examName); } catch (e) { parsedExamName = [examName]; }
      }
      if (!parsedExamName || !Array.isArray(parsedExamName) || parsedExamName.length === 0) {
        return res.status(400).json({ success: false, message: "❌ examName array hona zaroori hai!" });
      }
      req.body.examName = parsedExamName;

      const tempDir = "./public/temp";
      if (!fs.existsSync(tempDir)) {
        fs.mkdirSync(tempDir, { recursive: true });
      }

      // 📂 B. PHOTO PROCESSING & COMPRESSION VIA SHARP
      const fileFields = ["questionPhoto", "answerExplainWithPhoto"];
      
      for (const field of fileFields) {
        if (req.files && req.files[field] && req.files[field][0]) {
          const fileBuffer = req.files[field][0].buffer;
          const uniqueName = `${field}-${Date.now()}-${Math.round(Math.random() * 1e9)}.jpeg`;
          const localOutputPath = path.join(tempDir, uniqueName);

          await sharp(fileBuffer)
            .jpeg({ quality: 60 }) 
            .toFile(localOutputPath);

          // ☁️ C. UPLOAD TO CLOUDINARY
          const cloudinaryUrl = await uploadToCloudinary(localOutputPath);
          req.body[field] = cloudinaryUrl;

          // 🗑️ D. DELETE LOCAL TEMP FILE
          if (fs.existsSync(localOutputPath)) {
            fs.unlinkSync(localOutputPath);
          }
        } else {
          req.body[field] = null;
        }
      }

      next();

    } catch (error) {
      return res.status(500).json({
        success: false,
        message: "❌ Middleware mein processing error aaya",
        error: error.message
      });
    }
  });
};