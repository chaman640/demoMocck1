// backend/utils/cloudinaryUpload.js
//
// 🆕 NAYA — Custom Test ke question-builder mein photo add karne ke liye
// ek standalone "ek image do, URL wapas lo" endpoint chahiye tha (kyunki
// poora test ek hi JSON POST mein banta hai, multipart nahi) — ye
// woh shared logic hai jo processQuestion.js middleware mein pehle se
// istemal ho rahi thi.
import multer from "multer";
import cloudinaryPackage from "cloudinary";

const cloudinary = cloudinaryPackage.v2;

let cloudinaryReady = false;
const ensureCloudinary = () => {
  if (cloudinaryReady) return;
  const { CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET } = process.env;
  if (!CLOUDINARY_CLOUD_NAME || !CLOUDINARY_API_KEY || !CLOUDINARY_API_SECRET) {
    throw new Error("Cloudinary env variables set nahi hain.");
  }
  cloudinary.config({
    cloud_name: CLOUDINARY_CLOUD_NAME,
    api_key: CLOUDINARY_API_KEY,
    api_secret: CLOUDINARY_API_SECRET,
  });
  cloudinaryReady = true;
};

export const uploadSingleImage = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
}).single("image");

const uploadBufferToCloudinary = (buffer, folder) =>
  new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream({ folder, resource_type: "image" }, (error, result) => {
      if (error) return reject(new Error("Cloudinary upload failed: " + error.message));
      resolve(result.secure_url);
    });
    stream.end(buffer);
  });

// POST handler — route mein uploadSingleImage middleware ke baad lagayein
export const handleImageUpload = async (req, res) => {
  try {
    ensureCloudinary();
    if (!req.file) {
      return res.status(400).json({ success: false, message: "Koi image nahi mili (field name 'image' hona chahiye)." });
    }
    const url = await uploadBufferToCloudinary(req.file.buffer, "custom-test-questions");
    return res.status(200).json({ success: true, url });
  } catch (error) {
    console.error("handleImageUpload error:", error);
    return res.status(500).json({ success: false, message: error.message || "Upload fail ho gaya." });
  }
};
