// middlewares/processQuestion.js  (ADMIN question upload)
import "dotenv/config"; // 🐛 FIX #1 — niche wajah likhi hai
import multer from "multer";
import cloudinaryPackage from "cloudinary";
import sharp from "sharp";

const cloudinary = cloudinaryPackage.v2;

// ─────────────────────────────────────────────
// 🐛 FIX #1 — CLOUDINARY CONFIG KA TIMING BUG
//
// Pehle file ke top pe seedha `cloudinary.config({ cloud_name: process.env... })`
// likha tha. ESM mein saare imports server.js ke `dotenv.config()` se PEHLE
// chalte hain, isliye us waqt process.env khaali hota tha → cloud_name/api_key
// dono `undefined` → HAR image upload "Cloudinary upload failed" deta tha.
//
// Ab: (a) top pe "dotenv/config" import kiya, aur (b) config ko lazy function
// mein daala jo pehli upload par chalta hai. Dono milke ye bug permanently
// khatam kar dete hain.
// ─────────────────────────────────────────────
let cloudinaryReady = false;
const ensureCloudinary = () => {
  if (cloudinaryReady) return;

  const { CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET } = process.env;
  if (!CLOUDINARY_CLOUD_NAME || !CLOUDINARY_API_KEY || !CLOUDINARY_API_SECRET) {
    // 🐛 FIX: pehle env missing hone par bhi upload try hota tha aur
    // ek confusing error aata tha. Ab saaf message milta hai.
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

// ─────────────────────────────────────────────
// Multer — memory storage
// ─────────────────────────────────────────────
const uploadFields = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
}).fields([
  { name: "questionPhoto", maxCount: 1 },
  { name: "answerExplainWithPhoto", maxCount: 1 },
]);

// ─────────────────────────────────────────────
// 🐛 FIX #2 — temp file ka jhamela hataya
// Pehle image ko ./public/temp mein likha jata tha, phir Cloudinary pe upload,
// phir delete. Render jaise hosts pe filesystem read-only/ephemeral hota hai —
// wahan ye chain toot jati thi. Ab seedha buffer se stream upload hota hai.
// ─────────────────────────────────────────────
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
// Main middleware
// ─────────────────────────────────────────────
export const processQuestionMiddleware = (req, res, next) => {
  // 🐛 FIX #3 — BULK JSON UPLOAD TOOTA HUA THA
  //
  // Purana code har request pe single-question validation chalata tha.
  // addQuestion.js array (bulk) support karta hai, lekin JSON array bhejne par
  // `const { question, option1... } = req.body` sab undefined hota tha
  // → hamesha 400 "Sabhi fields aur options zaroori hain!".
  // Matlab bulk question upload kabhi kaam hi nahi karta tha.
  //
  // Ab: agar request multipart nahi hai (yaani image nahi hai) to seedha
  // controller ko bhej dete hain — wahan proper validation hoti hai.
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
        examName,
      } = req.body;

      // 🛑 A. TEXT DATA VALIDATION
      if (!question || !option1 || !option2 || !option3 || !option4 || !subjectName || !topicName) {
        return res
          .status(400)
          .json({ success: false, message: "❌ Sabhi fields aur options zaroori hain!" });
      }
      // 🐛 FIX #4: answerExplain schema mein `required: true` hai, lekin yahan
      // check nahi hota tha → save() pe mongoose ValidationError aur 500 error.
      if (!answerExplain) {
        return res.status(400).json({ success: false, message: "❌ answerExplain zaroori hai!" });
      }
      const correctOpt = Number(correctOption);
      if (!correctOpt || correctOpt < 1 || correctOpt > 4) {
        return res
          .status(400)
          .json({ success: false, message: "❌ correctOption 1 se 4 ke beech hona chahiye!" });
      }
      req.body.correctOption = correctOpt;

      // examName ko array mein normalize karo
      let parsedExamName = examName;
      if (typeof examName === "string") {
        try {
          parsedExamName = JSON.parse(examName);
        } catch (e) {
          parsedExamName = [examName];
        }
      }
      if (!parsedExamName || !Array.isArray(parsedExamName) || parsedExamName.length === 0) {
        return res
          .status(400)
          .json({ success: false, message: "❌ examName array hona zaroori hai!" });
      }
      req.body.examName = parsedExamName;

      // 📂 B. PHOTO COMPRESS + UPLOAD
      const fileFields = ["questionPhoto", "answerExplainWithPhoto"];
      const hasAnyFile = fileFields.some((f) => req.files?.[f]?.[0]);
      if (hasAnyFile) ensureCloudinary();

      for (const field of fileFields) {
        const file = req.files?.[field]?.[0];
        if (file) {
          const compressed = await sharp(file.buffer).jpeg({ quality: 60 }).toBuffer();
          req.body[field] = await uploadBufferToCloudinary(compressed, "questions_photos");
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
