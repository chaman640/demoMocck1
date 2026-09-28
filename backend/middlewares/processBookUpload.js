import "dotenv/config";
import multer from "multer";
import cloudinaryPackage from "cloudinary";
import sharp from "sharp";

const cloudinary = cloudinaryPackage.v2;

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
  limits: { fileSize: 25 * 1024 * 1024 },
}).fields([
  { name: "coverImage", maxCount: 1 },
  { name: "digitalFile", maxCount: 1 },
]);

const uploadBufferToCloudinary = (buffer, folder, resourceType) =>
  new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { folder, resource_type: resourceType },
      (error, result) => {
        if (error) return reject(new Error("Cloudinary upload failed: " + error.message));
        resolve(result.secure_url);
      }
    );
    stream.end(buffer);
  });

export const processBookUploadMiddleware = (req, res, next) => {
  if (!req.is("multipart/form-data")) {
    return next();
  }

  uploadFields(req, res, async function (err) {
    if (err) {
      return res.status(400).json({ success: false, message: "Multer Error: " + err.message });
    }

    try {
      const coverFile = req.files?.coverImage?.[0];
      const digitalFile = req.files?.digitalFile?.[0];

      if (coverFile || digitalFile) ensureCloudinary();

      if (coverFile) {
        const compressed = await sharp(coverFile.buffer).jpeg({ quality: 70 }).toBuffer();
        req.body.coverImageUrl = await uploadBufferToCloudinary(compressed, "book_covers", "image");
      }

      if (digitalFile) {
        req.body.digitalFileUrl = await uploadBufferToCloudinary(digitalFile.buffer, "book_digital_files", "raw");
      }

      next();
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: "Upload processing mein error aaya",
        error: error.message,
      });
    }
  });
};
