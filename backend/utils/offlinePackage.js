// utils/offlinePackage.js
//
// Student ke liye PDF taiyaar karta hai:
//   1. har page par student ka naam + phone (watermark) — screenshot/print
//      share ho to pata chale kiska hai
//   2. AES-256-GCM se encrypt — phone ke storage se file nikal bhi li jaye
//      to bina app ke wo bekaar data hai
import crypto from "crypto";
import { PDFDocument, StandardFonts, degrees, rgb } from "pdf-lib";

// pdf-lib poori PDF memory mein kholta hai. Render free plan (512MB) par
// ek saath bahut saari badi PDFs crash kara sakti hain — isliye ek waqt
// mein sirf 2.
const MAX_PARALLEL = 2;
let running = 0;
const waiting = [];

const withSlot = async (fn) => {
  if (running >= MAX_PARALLEL) await new Promise((resolve) => waiting.push(resolve));
  running += 1;
  try {
    return await fn();
  } finally {
    running -= 1;
    waiting.shift()?.();
  }
};

// Standard PDF font sirf Latin characters likh sakta hai (Hindi naam nahi).
// Baaki characters hata dete hain; naam khaali ho jaye to sirf phone dikhega.
const latinOnly = (text) =>
  String(text || "")
    .replace(/[^\x20-\x7E]/g, "")
    .replace(/\s+/g, " ")
    .trim();

export const watermarkText = (user) => {
  const parts = [latinOnly(user?.name), latinOnly(user?.phone)].filter(Boolean);
  parts.push("AntimPrayash.in");
  return parts.join(" | ");
};

const addWatermark = async (pdfBuffer, text) => {
  const pdf = await PDFDocument.load(pdfBuffer, { ignoreEncryption: true, updateMetadata: false });
  const font = await pdf.embedFont(StandardFonts.Helvetica);

  for (const page of pdf.getPages()) {
    const { width, height } = page.getSize();

    const footerSize = Math.max(6, Math.min(9, width / 70));
    page.drawText(text, {
      x: 12,
      y: 8,
      size: footerSize,
      font,
      color: rgb(0.45, 0.45, 0.45),
      opacity: 0.8,
    });

    const bigSize = Math.max(14, Math.min(32, width / 22));
    const textWidth = font.widthOfTextAtSize(text, bigSize);
    page.drawText(text, {
      x: width / 2 - (textWidth / 2) * Math.cos(Math.PI / 4),
      y: height / 2 - (textWidth / 2) * Math.sin(Math.PI / 4),
      size: bigSize,
      font,
      color: rgb(0.5, 0.5, 0.5),
      opacity: 0.12,
      rotate: degrees(45),
    });
  }

  return Buffer.from(await pdf.save({ useObjectStreams: true }));
};

/**
 * @returns {{ cipher: Buffer, key: string, iv: string }}
 *   cipher = encrypted data + 16-byte GCM tag (Web Crypto isi format ko padhta hai)
 *   key / iv = base64
 */
export const buildOfflinePackage = (pdfBuffer, user) =>
  withSlot(async () => {
    let finalPdf;
    try {
      finalPdf = await addWatermark(pdfBuffer, watermarkText(user));
    } catch (error) {
      // Kuch PDFs (tooti hui / ajeeb format) pdf-lib nahi khol pata.
      // Tab bhi student padh sake — encrypt bina watermark ke; reader screen
      // par apna watermark alag se dikhata hai.
      console.error("Watermark failed, sending without it:", error.message);
      finalPdf = pdfBuffer;
    }

    const key = crypto.randomBytes(32);
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
    const encrypted = Buffer.concat([cipher.update(finalPdf), cipher.final(), cipher.getAuthTag()]);

    return { cipher: encrypted, key: key.toString("base64"), iv: iv.toString("base64") };
  });
