// middlewares/processTeacherQuestion.js  (TEACHER question upload)
import "dotenv/config"; // 🐛 FIX: warna cloudinary env undefined rehta tha (details neeche)
import multer from "multer";
import cloudinaryPackage from "cloudinary";
import sharp from "sharp";

const cloudinary = cloudinaryPackage.v2;

// ─────────────────────────────────────────────
// 🐛 FIX #1 — CLOUDINARY CONFIG TIMING
// Pehle module ke top pe `cloudinary.config({...process.env})` chalta tha.
// ESM imports server.js ke dotenv.config() se pehle run hote hain, isliye
// saari values `undefined` thi → teacher jab bhi image ke saath question
// add karta tha, "Cloudinary upload failed" milta tha.
// Ab config lazy hai + dotenv yahin import kar liya.
// ─────────────────────────────────────────────
let cloudinaryReady = false;
const ensureCloudinary = () => {
  if (cloudinaryReady) return;

  const { CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET } = process.env;
  if (!CLOUDINARY_CLOUD_NAME || !CLOUDINARY_API_KEY || !CLOUDINARY_API_SECRET) {
    throw new Error(
      "Cloudinary env variables set nahi hain (CLOUDINARY_CLOUD_NAME / CLOUDINARY_API_KEY / CLOUDINARY_API_SECRET)."
    );
  }

  cloudinary.config({
    cloud_name: CLOUDINARY_CLOUD_NAME,
    api_key: CLOUDINARY_API_KEY,
    api_secret: CLOUDINARY_API_SECRET,
  });
  cloudinaryReady = true;
};

const uploadFields = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
}).fields([
  { name: "questionPhoto", maxCount: 1 },
  { name: "answerExplainWithPhoto", maxCount: 1 },
]);

// 🐛 FIX #2 — temp-file chain hataya (Render pe FS ephemeral hota hai)
const uploadBufferToCloudinary = (buffer, folder) =>
  new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { folder, resource_type: "image" },
      (error, result) => {
        if (error) return reject(new Error("Cloudinary upload failed: " + error.message));
        resolve(result.secure_url);
      }
    );
    stream.end(buffer);
  });

// ─────────────────────────────────────────────
// Do tarah ke requests handle karta hai:
// 1. Bulk / text-only (application/json) — seedha next()
// 2. Single question WITH image (multipart/form-data)
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

      // 🐛 FIX #3: `correctOption` multipart mein STRING aata hai ("3").
      // Purana check `correctOption < 1` string pe silently pass ho jata tha
      // aur "abc" jaisa input DB tak pahunch sakta tha. Ab Number() se check.
      const correctOpt = Number(correctOption);
      if (!correctOpt || correctOpt < 1 || correctOpt > 4) {
        return res
          .status(400)
          .json({ success: false, message: "❌ correctOption 1 se 4 ke beech hona chahiye!" });
      }
      req.body.correctOption = correctOpt;

      const fileFields = ["questionPhoto", "answerExplainWithPhoto"];
      const hasAnyFile = fileFields.some((f) => req.files?.[f]?.[0]);
      if (hasAnyFile) ensureCloudinary();

      for (const field of fileFields) {
        const file = req.files?.[field]?.[0];
        if (file) {
          const compressed = await sharp(file.buffer).jpeg({ quality: 60 }).toBuffer();
          req.body[field] = await uploadBufferToCloudinary(compressed, "teacher_question_photos");
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
