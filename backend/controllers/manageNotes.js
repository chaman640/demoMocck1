// controllers/manageNotes.js
//
// Admin aur teachers ke liye notes (PDF) upload / list / hide / delete.
//   Admin   → "public" notes: chune hue exam ke sabhi students
//   Teacher → "batch" notes: sirf unke chune hue batches (coupons)
//             Sub-teacher sirf apne assigned subject ke notes daal sakta hai.
import multer from "multer";
import mongoose from "mongoose";
import Note from "../models/Note.js";
import Coupon from "../models/Coupon.js";
import CouponAccess from "../models/CouponAccess.js";
import ExamName from "../models/ExamName.js";
import { checkCouponAccess } from "../utils/checkCouponAccess.js";
import { MAX_PDF_BYTES, deletePrivateFile, isPdfBuffer, uploadPrivatePdf } from "../utils/privateFiles.js";

const clean = (v, max = 200) => String(v ?? "").trim().slice(0, max);

const uploadPdf = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_PDF_BYTES },
}).single("file");

export const uploadNotePdfMiddleware = (req, res, next) => {
  uploadPdf(req, res, (err) => {
    if (err) {
      const message =
        err.code === "LIMIT_FILE_SIZE" ? "PDF is larger than 25 MB." : "File upload error: " + err.message;
      return res.status(400).json({ success: false, message });
    }
    next();
  });
};

/** Teacher kin batches (aur kin subjects) ke liye notes daal sakta hai */
const teacherTargets = async (teacher) => {
  if (teacher.role === "main") {
    const coupons = await Coupon.find({ mainTeacher: teacher._id }).select("name exam").sort({ createdAt: -1 });
    return coupons.map((c) => ({ _id: c._id, name: c.name, exam: c.exam, subjects: null }));
  }

  const access = await CouponAccess.find({ subTeacher: teacher._id }).populate("coupon", "name exam");
  const byCoupon = new Map();
  for (const a of access) {
    if (!a.coupon) continue;
    const key = String(a.coupon._id);
    if (!byCoupon.has(key)) {
      byCoupon.set(key, { _id: a.coupon._id, name: a.coupon.name, exam: a.coupon.exam, subjects: [] });
    }
    byCoupon.get(key).subjects.push(a.subject);
  }
  return [...byCoupon.values()];
};

export const getNoteUploadOptions = async (req, res) => {
  try {
    if (req.actor.type === "admin") {
      const exams = await ExamName.find().sort({ name: 1 });
      return res.status(200).json({ success: true, data: { actor: "admin", exams: exams.map((e) => e.name) } });
    }
    const batches = await teacherTargets(req.teacher);
    return res.status(200).json({ success: true, data: { actor: "teacher", role: req.teacher.role, batches } });
  } catch (error) {
    console.error("getNoteUploadOptions error:", error);
    return res.status(500).json({ success: false, message: "Could not load options." });
  }
};

export const createNote = async (req, res) => {
  try {
    const title = clean(req.body.title, 150);
    const description = clean(req.body.description, 1000);
    const subjectName = clean(req.body.subjectName, 100);
    const topicName = clean(req.body.topicName, 100);

    if (!title || !subjectName) {
      return res.status(400).json({ success: false, message: "Title and subject are required." });
    }
    if (!req.file || !isPdfBuffer(req.file.buffer)) {
      return res.status(400).json({ success: false, message: "Upload a PDF file only." });
    }

    const note = {
      title,
      description,
      subjectName,
      topicName,
      createdBy: { actorType: req.actor.type, actorId: null, name: "" },
    };

    if (req.actor.type === "admin") {
      const examName = clean(req.body.examName, 100);
      if (!examName || !(await ExamName.exists({ name: examName }))) {
        return res.status(400).json({ success: false, message: "Choose a valid exam." });
      }
      note.visibility = "public";
      note.examName = examName;
      note.coupons = [];
    } else {
      let couponIds = req.body.couponIds;
      if (typeof couponIds === "string") {
        try {
          couponIds = JSON.parse(couponIds);
        } catch {
          couponIds = [couponIds];
        }
      }
      couponIds = [...new Set((Array.isArray(couponIds) ? couponIds : []).map(String))].filter((id) =>
        mongoose.Types.ObjectId.isValid(id)
      );
      if (couponIds.length === 0) {
        return res.status(400).json({ success: false, message: "Choose at least one batch." });
      }

      const exams = new Set();
      for (const couponId of couponIds) {
        const check = await checkCouponAccess(req.teacher, couponId, req.teacher.role === "sub" ? subjectName : null);
        if (!check.allowed) {
          return res.status(403).json({ success: false, message: check.reason || "You do not have permission for this batch." });
        }
        exams.add(check.coupon.exam);
        if (check.subject && req.teacher.role === "sub") note.subjectName = check.subject;
      }

      note.visibility = "batch";
      note.coupons = couponIds;
      note.examName = exams.size === 1 ? [...exams][0] : "";
      note.createdBy.actorId = req.teacher._id;
      note.createdBy.name = req.teacher.name || "";
    }

    const uploaded = await uploadPrivatePdf(req.file.buffer, "study_notes");
    note.filePublicId = uploaded.publicId;
    note.fileBytes = uploaded.bytes || req.file.size;

    const saved = await Note.create(note);
    return res.status(201).json({ success: true, message: "Notes uploaded!", data: saved });
  } catch (error) {
    console.error("createNote error:", error);
    return res.status(500).json({ success: false, message: "Error while uploading notes." });
  }
};

const ownsNote = (req, note) =>
  req.actor.type === "admin" ||
  (note.createdBy?.actorType === "teacher" && String(note.createdBy.actorId) === String(req.teacher._id));

export const listManagedNotes = async (req, res) => {
  try {
    const filter = req.actor.type === "admin" ? {} : { "createdBy.actorType": "teacher", "createdBy.actorId": req.teacher._id };
    const notes = await Note.find(filter).populate("coupons", "name").sort({ createdAt: -1 }).limit(500);
    return res.status(200).json({
      success: true,
      data: notes.map((n) => ({
        _id: n._id,
        title: n.title,
        description: n.description,
        examName: n.examName,
        subjectName: n.subjectName,
        topicName: n.topicName,
        visibility: n.visibility,
        batches: (n.coupons || []).filter(Boolean).map((c) => ({ _id: c._id, name: c.name })),
        fileBytes: n.fileBytes,
        status: n.status,
        createdBy: n.createdBy,
        createdAt: n.createdAt,
      })),
    });
  } catch (error) {
    console.error("listManagedNotes error:", error);
    return res.status(500).json({ success: false, message: "Could not load the notes list." });
  }
};

export const setNoteStatus = async (req, res) => {
  try {
    const { status } = req.body;
    if (!["active", "hidden"].includes(status)) {
      return res.status(400).json({ success: false, message: "Status must be 'active' or 'hidden'." });
    }
    const note = await Note.findById(req.params.noteId);
    if (!note || !ownsNote(req, note)) return res.status(404).json({ success: false, message: "Notes not found." });

    note.status = status;
    await note.save();
    return res.status(200).json({ success: true, message: status === "hidden" ? "Notes hidden." : "Notes are visible again." });
  } catch (error) {
    console.error("setNoteStatus error:", error);
    return res.status(500).json({ success: false, message: "Could not change the status." });
  }
};

export const deleteNote = async (req, res) => {
  try {
    const note = await Note.findById(req.params.noteId);
    if (!note || !ownsNote(req, note)) return res.status(404).json({ success: false, message: "Notes not found." });

    await Note.deleteOne({ _id: note._id });
    await deletePrivateFile(note.filePublicId);
    return res.status(200).json({ success: true, message: "Notes deleted." });
  } catch (error) {
    console.error("deleteNote error:", error);
    return res.status(500).json({ success: false, message: "Could not delete." });
  }
};
