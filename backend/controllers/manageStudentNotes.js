import mongoose from "mongoose";
import User from "../models/User.js";
import StudentNote from "../models/StudentNote.js";

const verifyStudentInBatch = async (teacher, studentId) => {
  if (!mongoose.Types.ObjectId.isValid(studentId)) {
    return { allowed: false, status: 400, message: "Invalid Student ID." };
  }
  if (!teacher.activeCoupon) {
    return { allowed: false, status: 400, message: "Please select your active batch first." };
  }
  const student = await User.findById(studentId).select("activeCoupon");
  if (!student || !student.activeCoupon || student.activeCoupon.toString() !== teacher.activeCoupon.toString()) {
    return { allowed: false, status: 403, message: "This student is not in your active batch." };
  }
  return { allowed: true };
};

export const addStudentNote = async (req, res) => {
  try {
    const { studentId } = req.params;
    const { note } = req.body;

    const check = await verifyStudentInBatch(req.teacher, studentId);
    if (!check.allowed) return res.status(check.status).json({ success: false, message: check.message });

    if (!note || !note.trim()) {
      return res.status(400).json({ success: false, message: "Note cannot be empty." });
    }

    const created = await StudentNote.create({
      student: studentId,
      teacher: req.teacher._id,
      teacherName: req.teacher.name,
      coupon: req.teacher.activeCoupon,
      note: note.trim(),
    });

    return res.status(201).json({ success: true, data: created });
  } catch (error) {
    console.error("addStudentNote error:", error);
    return res.status(500).json({ success: false, message: "Could not save the note." });
  }
};

export const getStudentNotes = async (req, res) => {
  try {
    const { studentId } = req.params;
    const check = await verifyStudentInBatch(req.teacher, studentId);
    if (!check.allowed) return res.status(check.status).json({ success: false, message: check.message });

    const notes = await StudentNote.find({ student: studentId, coupon: req.teacher.activeCoupon })
      .sort({ createdAt: -1 })
      .select("note teacherName createdAt teacher");

    return res.status(200).json({ success: true, data: notes });
  } catch (error) {
    console.error("getStudentNotes error:", error);
    return res.status(500).json({ success: false, message: "Could not load the notes." });
  }
};

export const deleteStudentNote = async (req, res) => {
  try {
    const { noteId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(noteId)) {
      return res.status(400).json({ success: false, message: "Invalid note ID." });
    }

    const note = await StudentNote.findById(noteId);
    if (!note) return res.status(404).json({ success: false, message: "Note not found." });

    const isOwner = note.teacher.toString() === req.teacher._id.toString();
    const isMainOfSameCoupon =
      req.teacher.role === "main" && note.coupon.toString() === req.teacher.activeCoupon?.toString();

    if (!isOwner && !isMainOfSameCoupon) {
      return res.status(403).json({ success: false, message: "You can only delete your own notes." });
    }

    await StudentNote.deleteOne({ _id: noteId });
    return res.status(200).json({ success: true, message: "Note deleted." });
  } catch (error) {
    console.error("deleteStudentNote error:", error);
    return res.status(500).json({ success: false, message: "Could not delete the note." });
  }
};
