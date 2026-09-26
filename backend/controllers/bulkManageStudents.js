import mongoose from "mongoose";
import multer from "multer";
import XLSX from "xlsx";
import { createRequire } from "module";
import User from "../models/User.js";
import Coupon from "../models/Coupon.js";

const require = createRequire(import.meta.url);
const pdfParse = require("pdf-parse");

const MAX_BULK_SIZE = 1000;

export const uploadStudentFileMiddleware = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
}).single("file");

function extractFromExcel(buffer) {
  const workbook = XLSX.read(buffer, { type: "buffer" });
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  const rows = XLSX.utils.sheet_to_json(sheet, { defval: "" });
  if (rows.length === 0) return [];

  const keys = Object.keys(rows[0]);
  const nameKey = keys.find((k) => /name/i.test(k)) || keys[0];
  const phoneKey = keys.find((k) => /phone|mobile|contact|number/i.test(k)) || keys[1] || keys[0];

  return rows.map((row) => ({
    name: String(row[nameKey] ?? "").trim(),
    phone: String(row[phoneKey] ?? "").replace(/\D/g, "").slice(-10),
  }));
}

async function extractFromPdf(buffer) {
  const data = await pdfParse(buffer);
  const lines = data.text.split("\n").map((l) => l.trim()).filter(Boolean);

  const results = [];
  for (const line of lines) {
    const phoneMatch = line.match(/([6-9]\d{9})/);
    if (!phoneMatch) continue;
    const phone = phoneMatch[1];
    const name = line
      .replace(phone, "")
      .replace(/[|,\-:._]/g, " ")
      .replace(/\d+/g, "")
      .replace(/\s+/g, " ")
      .trim();
    results.push({ name, phone });
  }
  return results;
}

export const parseStudentFile = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: "Please upload a file." });
    }

    const ext = (req.file.originalname.split(".").pop() || "").toLowerCase();
    let parsed = [];

    if (["xlsx", "xls", "csv"].includes(ext)) {
      parsed = extractFromExcel(req.file.buffer);
    } else if (ext === "pdf") {
      parsed = await extractFromPdf(req.file.buffer);
    } else {
      return res.status(400).json({ success: false, message: "Only Excel (.xlsx/.xls), CSV, or PDF files are supported." });
    }

    const cleaned = parsed
      .map((r) => ({ name: (r.name || "").trim(), phone: String(r.phone || "").replace(/\D/g, "").slice(-10) }))
      .filter((r) => /^\d{10}$/.test(r.phone));

    const seen = new Set();
    const deduped = cleaned.filter((r) => {
      if (seen.has(r.phone)) return false;
      seen.add(r.phone);
      return true;
    });

    if (deduped.length === 0) {
      return res.status(400).json({
        success: false,
        message: "No valid 10-digit phone numbers found in this file. For PDFs, make sure the phone numbers appear as plain text (not inside a scanned image).",
      });
    }

    return res.status(200).json({ success: true, data: deduped });
  } catch (error) {
    console.error("parseStudentFile error:", error);
    return res.status(500).json({ success: false, message: "Could not read this file. Please check the format and try again." });
  }
};

export const bulkImportStudents = async (req, res) => {
  try {
    if (!req.teacher.activeCoupon) {
      return res.status(400).json({ success: false, message: "Please select your active batch first." });
    }
    const coupon = await Coupon.findById(req.teacher.activeCoupon).select("exam name");
    if (!coupon) return res.status(404).json({ success: false, message: "Active batch not found." });

    const { students } = req.body;
    if (!Array.isArray(students) || students.length === 0) {
      return res.status(400).json({ success: false, message: "Provide at least one student." });
    }
    if (students.length > MAX_BULK_SIZE) {
      return res.status(400).json({ success: false, message: `Maximum ${MAX_BULK_SIZE} students per import — please split into smaller batches.` });
    }

    const results = { created: [], movedExisting: [], alreadyInThisBatch: [], failed: [] };

    for (const raw of students) {
      const phone = String(raw.phone || "").replace(/\D/g, "").slice(-10);
      const name = (raw.name || "").trim();

      if (!/^\d{10}$/.test(phone)) {
        results.failed.push({ name, phone: raw.phone, reason: "Invalid phone number (must be 10 digits)" });
        continue;
      }

      try {
        let user = await User.findOne({ phone });

        if (!user) {
          const defaultPassword = phone;
          user = await User.create({
            name: name || `Student ${phone.slice(-4)}`,
            phone,
            email: `${phone}@student.antimprayash.in`,
            password: defaultPassword,
            exam: coupon.exam,
            activeCoupon: coupon._id,
          });
          results.created.push({ name: user.name, phone, defaultPassword });
        } else if (user.activeCoupon?.toString() === coupon._id.toString()) {
          results.alreadyInThisBatch.push({ name: user.name, phone });
        } else {
          user.activeCoupon = coupon._id;
          if (coupon.exam) user.exam = coupon.exam;
          await user.save();
          results.movedExisting.push({ name: user.name, phone });
        }
      } catch (innerError) {
        results.failed.push({ name, phone, reason: innerError.message });
      }
    }

    return res.status(200).json({
      success: true,
      message: `${results.created.length} new, ${results.movedExisting.length} moved here, ${results.alreadyInThisBatch.length} already in this batch, ${results.failed.length} failed.`,
      data: results,
    });
  } catch (error) {
    console.error("bulkImportStudents error:", error);
    return res.status(500).json({ success: false, message: "Something went wrong during import." });
  }
};

export const getBatchRoster = async (req, res) => {
  try {
    if (!req.teacher.activeCoupon) {
      return res.status(400).json({ success: false, message: "Please select your active batch first." });
    }
    const { search = "" } = req.query;
    const query = { activeCoupon: req.teacher.activeCoupon };

    if (search.trim()) {
      const safe = search.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      query.$or = [{ name: { $regex: safe, $options: "i" } }, { phone: { $regex: safe } }];
    }

    const students = await User.find(query).select("name phone email createdAt").sort({ name: 1 });
    return res.status(200).json({ success: true, data: students });
  } catch (error) {
    console.error("getBatchRoster error:", error);
    return res.status(500).json({ success: false, message: "Something went wrong while loading the roster." });
  }
};

export const getMyManagedCoupons = async (req, res) => {
  try {
    if (req.teacher.role !== "main") {
      return res.status(200).json({ success: true, data: [] });
    }
    const coupons = await Coupon.find({ mainTeacher: req.teacher._id }).select("name exam");
    return res.status(200).json({ success: true, data: coupons });
  } catch (error) {
    console.error("getMyManagedCoupons error:", error);
    return res.status(500).json({ success: false, message: "Something went wrong." });
  }
};

export const bulkMoveStudents = async (req, res) => {
  try {
    if (req.teacher.role !== "main") {
      return res.status(403).json({ success: false, message: "Only the main teacher can move students between batches." });
    }

    const { studentIds, targetCouponId } = req.body;
    if (!Array.isArray(studentIds) || studentIds.length === 0) {
      return res.status(400).json({ success: false, message: "Select at least one student." });
    }
    if (!targetCouponId || !mongoose.Types.ObjectId.isValid(targetCouponId)) {
      return res.status(400).json({ success: false, message: "Select a valid target batch." });
    }

    const targetCoupon = await Coupon.findById(targetCouponId).select("exam name");
    if (!targetCoupon) return res.status(404).json({ success: false, message: "Target batch not found." });

    const result = await User.updateMany(
      { _id: { $in: studentIds }, activeCoupon: req.teacher.activeCoupon },
      { $set: { activeCoupon: targetCoupon._id, exam: targetCoupon.exam } }
    );

    return res.status(200).json({
      success: true,
      message: `${result.modifiedCount} student(s) moved to '${targetCoupon.name}'.`,
    });
  } catch (error) {
    console.error("bulkMoveStudents error:", error);
    return res.status(500).json({ success: false, message: "Something went wrong while moving students." });
  }
};

export const bulkRemoveStudents = async (req, res) => {
  try {
    if (req.teacher.role !== "main") {
      return res.status(403).json({ success: false, message: "Only the main teacher can remove students from the batch." });
    }

    const { studentIds } = req.body;
    if (!Array.isArray(studentIds) || studentIds.length === 0) {
      return res.status(400).json({ success: false, message: "Select at least one student." });
    }

    const result = await User.updateMany(
      { _id: { $in: studentIds }, activeCoupon: req.teacher.activeCoupon },
      { $set: { activeCoupon: null } }
    );

    return res.status(200).json({
      success: true,
      message: `${result.modifiedCount} student(s) removed from the batch.`,
    });
  } catch (error) {
    console.error("bulkRemoveStudents error:", error);
    return res.status(500).json({ success: false, message: "Something went wrong while removing students." });
  }
};
