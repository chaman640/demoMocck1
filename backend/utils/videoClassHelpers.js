// utils/videoClassHelpers.js — shared bits for video classes (teacher + student side)
import mongoose from "mongoose";
import Note from "../models/Note.js";
import { deletePrivateFile, uploadPrivatePdf } from "./privateFiles.js";

const YT_ID = /^[A-Za-z0-9_-]{11}$/;

/**
 * Accepts a YouTube link in any common form (watch?v=, youtu.be/, /live/,
 * /embed/, /shorts/) or a bare 11-character video ID. Returns the ID or "".
 */
export const parseYouTubeId = (input) => {
  const raw = String(input ?? "").trim();
  if (!raw) return "";
  if (YT_ID.test(raw)) return raw;

  let url;
  try {
    url = new URL(/^https?:\/\//i.test(raw) ? raw : `https://${raw}`);
  } catch {
    return "";
  }
  const host = url.hostname.toLowerCase().replace(/^(www\.|m\.|music\.)/, "");
  let id = "";
  if (host === "youtu.be") {
    id = url.pathname.split("/")[1] || "";
  } else if (host === "youtube.com" || host === "youtube-nocookie.com") {
    id = url.searchParams.get("v") || "";
    if (!id) {
      const [, first, second] = url.pathname.split("/");
      if (["live", "embed", "shorts", "v"].includes(first)) id = second || "";
    }
  }
  return YT_ID.test(id) ? id : "";
};

export const isObjectId = (id) => mongoose.Types.ObjectId.isValid(String(id ?? ""));

export const cleanText = (v, max = 200) => String(v ?? "").trim().slice(0, max);

/** "2026-10-05T18:30" or an ISO string → Date, or null if invalid/empty */
export const parseDate = (v) => {
  if (!v) return null;
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? null : d;
};

/** Uploads the class notes PDF as a batch Note (opens in the in-app reader, works offline). */
export const createClassNote = async ({ file, title, subjectName, topicName, coupon, teacher }) => {
  const uploaded = await uploadPrivatePdf(file.buffer, "class_notes");
  return Note.create({
    title: cleanText(`${title} — Notes`, 150),
    description: "Class notes",
    examName: coupon.exam || "",
    subjectName,
    topicName,
    visibility: "batch",
    coupons: [coupon._id],
    filePublicId: uploaded.publicId,
    fileBytes: uploaded.bytes || file.size || 0,
    createdBy: { actorType: "teacher", actorId: teacher._id, name: teacher.name || "" },
  });
};

export const deleteClassNote = async (noteId) => {
  if (!noteId) return;
  const note = await Note.findById(noteId);
  if (!note) return;
  await Note.deleteOne({ _id: note._id });
  await deletePrivateFile(note.filePublicId).catch(() => {});
};
