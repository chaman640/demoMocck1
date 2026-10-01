// utils/privateFiles.js
//
// Notes / digital books ki PDF ab PRIVATE Cloudinary file ("authenticated")
// banti hai — iska koi public link nahi hota. Student ko file sirf
// /api/offline/... se milti hai: watermark + encrypt hokar, app ke andar
// padhne ke liye.
import cloudinaryPackage from "cloudinary";

const cloudinary = cloudinaryPackage.v2;

export const MAX_PDF_BYTES = 25 * 1024 * 1024;

let configured = false;
const ensureCloudinary = () => {
  if (configured) return;
  const { CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET } = process.env;
  if (!CLOUDINARY_CLOUD_NAME || !CLOUDINARY_API_KEY || !CLOUDINARY_API_SECRET) {
    throw new Error("Cloudinary env variables set nahi hain.");
  }
  cloudinary.config({
    cloud_name: CLOUDINARY_CLOUD_NAME,
    api_key: CLOUDINARY_API_KEY,
    api_secret: CLOUDINARY_API_SECRET,
  });
  configured = true;
};

export const isPdfBuffer = (buffer) =>
  Buffer.isBuffer(buffer) && buffer.length > 4 && buffer.subarray(0, 5).toString("latin1") === "%PDF-";

/** PDF ko private (authenticated) raw file ki tarah upload karta hai. */
export const uploadPrivatePdf = (buffer, folder) =>
  new Promise((resolve, reject) => {
    ensureCloudinary();
    const stream = cloudinary.uploader.upload_stream(
      { folder, resource_type: "raw", type: "authenticated" },
      (error, result) => {
        if (error) return reject(new Error("Cloudinary upload failed: " + error.message));
        resolve({ publicId: result.public_id, bytes: result.bytes });
      }
    );
    stream.end(buffer);
  });

export const deletePrivateFile = async (publicId) => {
  if (!publicId) return;
  try {
    ensureCloudinary();
    await cloudinary.uploader.destroy(publicId, { resource_type: "raw", type: "authenticated", invalidate: true });
  } catch (error) {
    console.error("deletePrivateFile failed:", error.message);
  }
};

/**
 * File ka original PDF buffer laata hai.
 *   { publicId } → private file, 2 minute ke signed API download link se
 *   { url }      → purani books jinka public link save hai
 */
export const fetchPdfBuffer = async ({ publicId, url }) => {
  let downloadUrl = url;
  if (publicId) {
    ensureCloudinary();
    downloadUrl = cloudinary.utils.private_download_url(publicId, "", {
      resource_type: "raw",
      type: "authenticated",
      expires_at: Math.floor(Date.now() / 1000) + 120,
    });
  }
  if (!downloadUrl) throw new Error("File ka source nahi mila.");

  const response = await fetch(downloadUrl);
  if (!response.ok) throw new Error(`File download failed (${response.status})`);

  const buffer = Buffer.from(await response.arrayBuffer());
  if (!isPdfBuffer(buffer)) throw new Error("File PDF nahi hai.");
  return buffer;
};
