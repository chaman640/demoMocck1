// middlewares/processTeacherQuestion.js
import multer from "multer";
import cloudinaryPackage from "cloudinary";
import sharp from "sharp";
import fs from "fs";
import path from "path";

const cloudinary = cloudinaryPackage.v2;

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const storage = multer.memoryStorage();
const uploadFields = multer({
  storage: storage,
  limits: { fileSize: 10 * 1024 * 1024 },
}).fields([
  { name: "questionPhoto", maxCount: 1 },
  { name: "answerExplainWithPhoto", maxCount: 1 },
]);

const uploadToCloudinary = async (localFilePath) => {
  try {
    const response = await cloudinary.uploader.upload(localFilePath, {
      folder: "teacher_question_photos",
      resource_type: "image",
    });
    return response.secure_url;
  } catch (error) {
    throw new Error("Cloudinary upload failed: " + error.message);
  }
};

// ─────────────────────────────────────────────
// Do tarah ke requests handle karta hai:
// 1. Bulk / text-only (Content-Type: application/json) — koi file
//    upload nahi, seedha next(). Controller khud array/single sambhal lega.
// 2. Single question WITH image (multipart/form-data, Postman "form-data"
//    tab se) — file uthao, Cloudinary pe upload karo, URL req.body mein
//    daal do, phir next().
// ─────────────────────────────────────────────
export const processTeacherQuestionMiddleware = (req, res, next) => {
  if (!req.is("multipart/form-data")) {
    return next();
  }

  uploadFields(req, res, async function (err) {
    if (err) {
      return res.status(400).json({ success: false, message: "Multer Error: " + err.message });
    }

    try {
      const {
        question,
        option1,
        option2,
        option3,
        option4,
        correctOption,
        subjectName,
        topicName,
        answerExplain,
      } = req.body;

      if (
        !question ||
        !option1 ||
        !option2 ||
        !option3 ||
        !option4 ||
        !subjectName ||
        !topicName ||
        !answerExplain
      ) {
        return res.status(400).json({ success: false, message: "❌ Sabhi fields zaroori hain!" });
      }
      if (!correctOption || correctOption < 1 || correctOption > 4) {
        return res
          .status(400)
          .json({ success: false, message: "❌ correctOption 1 se 4 ke beech hona chahiye!" });
      }

      const tempDir = "./public/temp";
      if (!fs.existsSync(tempDir)) {
        fs.mkdirSync(tempDir, { recursive: true });
      }

      const fileFields = ["questionPhoto", "answerExplainWithPhoto"];

      for (const field of fileFields) {
        if (req.files && req.files[field] && req.files[field][0]) {
          const fileBuffer = req.files[field][0].buffer;
          const uniqueName = `${field}-${Date.now()}-${Math.round(Math.random() * 1e9)}.jpeg`;
          const localOutputPath = path.join(tempDir, uniqueName);

          await sharp(fileBuffer).jpeg({ quality: 60 }).toFile(localOutputPath);

          const cloudinaryUrl = await uploadToCloudinary(localOutputPath);
          req.body[field] = cloudinaryUrl;

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
        error: error.message,
      });
    }
  });
};