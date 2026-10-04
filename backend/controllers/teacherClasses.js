// controllers/teacherClasses.js
//
// Video classes — teacher side.
//   Batch → Subject folder → (Topic folder) → Class
// A class is a YouTube live stream or recorded video, with optional notes (PDF).
// Main Teacher manages everything in their batches; a Sub-teacher only the
// subjects assigned to them (CouponAccess).
import Coupon from "../models/Coupon.js";
import CouponAccess from "../models/CouponAccess.js";
import ClassFolder from "../models/ClassFolder.js";
import VideoClass from "../models/VideoClass.js";
import ClassAttendance from "../models/ClassAttendance.js";
import ClassDoubt from "../models/ClassDoubt.js";
import Note from "../models/Note.js";
import User from "../models/User.js";
import { checkCouponAccess } from "../utils/checkCouponAccess.js";
import { ciExact, normalizeSubject, sameSubject } from "../utils/subjectName.js";
import { isPdfBuffer } from "../utils/privateFiles.js";
import {
  cleanText,
  createClassNote,
  deleteClassNote,
  isObjectId,
  parseDate,
  parseYouTubeId,
} from "../utils/videoClassHelpers.js";

const fail = (res, status, message) => res.status(status).json({ success: false, message });

/** The teacher's active batch + which subjects they may manage there (null = all). */
const activeBatch = async (teacher) => {
  if (!teacher.activeCoupon) return null;
  const coupon = await Coupon.findById(teacher.activeCoupon);
  if (!coupon) return null;
  if (teacher.role === "main") {
    return String(coupon.mainTeacher) === String(teacher._id) ? { coupon, subjects: null } : null;
  }
  const access = await CouponAccess.find({ coupon: coupon._id, subTeacher: teacher._id }).select("subject");
  if (access.length === 0) return null;
  return { coupon, subjects: access.map((a) => a.subject) };
};

const canManageSubject = (subjects, subjectName) =>
  subjects === null || subjects.some((s) => sameSubject(s, subjectName));

/** Permission check for an existing folder/class (independent of the active batch). */
const checkItemAccess = async (teacher, couponId, subjectName) => {
  const check = await checkCouponAccess(teacher, couponId, teacher.role === "sub" ? subjectName : null);
  return check.allowed ? check : null;
};

const folderView = (f) => ({
  _id: f._id,
  kind: f.kind,
  parent: f.parent,
  name: f.name,
  subjectName: f.subjectName,
  createdAt: f.createdAt,
});

const classView = (c, extra = {}) => ({
  _id: c._id,
  folder: c.folder,
  subjectName: c.subjectName,
  topicName: c.topicName,
  title: c.title,
  description: c.description,
  kind: c.kind,
  youtubeVideoId: c.youtubeVideoId,
  scheduledAt: c.scheduledAt,
  status: c.status,
  startedAt: c.startedAt,
  endedAt: c.endedAt,
  hidden: c.hidden,
  note: c.note && typeof c.note === "object" && c.note.title ? { _id: c.note._id, title: c.note.title, fileBytes: c.note.fileBytes } : c.note ? { _id: c.note } : null,
  createdBy: c.createdBy,
  createdAt: c.createdAt,
  ...extra,
});

// ─────────────────────────────────────────────
// GET /teacher/classes — folders + classes of the active batch
// ─────────────────────────────────────────────
export const getTeacherClasses = async (req, res) => {
  try {
    const batch = await activeBatch(req.teacher);
    if (!batch) return fail(res, 400, "Select your active batch first.");
    const { coupon, subjects } = batch;

    const subjectFilter = subjects === null ? {} : { subjectName: { $in: subjects.map(ciExact) } };
    const [folders, classes] = await Promise.all([
      ClassFolder.find({ coupon: coupon._id, ...subjectFilter }).sort({ name: 1 }),
      VideoClass.find({ coupon: coupon._id, ...subjectFilter })
        .populate("note", "title fileBytes")
        .sort({ createdAt: 1 }),
    ]);

    const ids = classes.map((c) => c._id);
    const [attendance, openDoubts] = ids.length
      ? await Promise.all([
          ClassAttendance.aggregate([{ $match: { videoClass: { $in: ids } } }, { $group: { _id: "$videoClass", n: { $sum: 1 } } }]),
          ClassDoubt.aggregate([
            { $match: { videoClass: { $in: ids }, answer: "" } },
            { $group: { _id: "$videoClass", n: { $sum: 1 } } },
          ]),
        ])
      : [[], []];
    const attendanceBy = new Map(attendance.map((a) => [String(a._id), a.n]));
    const doubtsBy = new Map(openDoubts.map((a) => [String(a._id), a.n]));

    return res.status(200).json({
      success: true,
      data: {
        batch: { _id: coupon._id, name: coupon.name, exam: coupon.exam },
        role: req.teacher.role,
        allowedSubjects: subjects,
        folders: folders.map(folderView),
        classes: classes.map((c) =>
          classView(c, { viewers: attendanceBy.get(String(c._id)) || 0, openDoubts: doubtsBy.get(String(c._id)) || 0 })
        ),
      },
    });
  } catch (error) {
    console.error("getTeacherClasses error:", error);
    return fail(res, 500, "Could not load classes.");
  }
};

// ─────────────────────────────────────────────
// Folders
// ─────────────────────────────────────────────
export const createClassFolder = async (req, res) => {
  try {
    const batch = await activeBatch(req.teacher);
    if (!batch) return fail(res, 400, "Select your active batch first.");
    const { coupon, subjects } = batch;

    const kind = req.body.kind === "topic" ? "topic" : "subject";
    const name = normalizeSubject(cleanText(req.body.name, 100));
    if (!name) return fail(res, 400, "Folder name is required.");

    let parent = null;
    let subjectName = name;
    if (kind === "topic") {
      if (!isObjectId(req.body.parentId)) return fail(res, 400, "Choose a subject folder.");
      parent = await ClassFolder.findOne({ _id: req.body.parentId, coupon: coupon._id, kind: "subject" });
      if (!parent) return fail(res, 404, "Subject folder not found.");
      subjectName = parent.subjectName;
    }

    if (!canManageSubject(subjects, subjectName)) {
      return fail(res, 403, `You are not assigned the subject '${subjectName}' in this batch.`);
    }
    // Sub-teachers get the exact spelling the Main Teacher assigned
    if (kind === "subject" && subjects !== null) {
      subjectName = subjects.find((s) => sameSubject(s, name)) || name;
    }

    const duplicate = await ClassFolder.exists({
      coupon: coupon._id,
      parent: parent ? parent._id : null,
      name: ciExact(kind === "subject" ? subjectName : name),
    });
    if (duplicate) return fail(res, 409, "A folder with this name already exists here.");

    const folder = await ClassFolder.create({
      coupon: coupon._id,
      kind,
      parent: parent ? parent._id : null,
      name: kind === "subject" ? subjectName : name,
      subjectName,
      createdBy: { teacherId: req.teacher._id, name: req.teacher.name || "" },
    });
    return res.status(201).json({ success: true, message: "Folder created!", data: folderView(folder) });
  } catch (error) {
    console.error("createClassFolder error:", error);
    return fail(res, 500, "Error while creating the folder.");
  }
};

export const renameClassFolder = async (req, res) => {
  try {
    if (!isObjectId(req.params.folderId)) return fail(res, 404, "Folder not found.");
    const folder = await ClassFolder.findById(req.params.folderId);
    if (!folder || !(await checkItemAccess(req.teacher, folder.coupon, folder.subjectName))) {
      return fail(res, 404, "Folder not found.");
    }
    const name = normalizeSubject(cleanText(req.body.name, 100));
    if (!name) return fail(res, 400, "Folder name is required.");

    if (folder.kind === "subject" && req.teacher.role !== "main") {
      return fail(res, 403, "Only the Main Teacher can rename a subject folder.");
    }
    const duplicate = await ClassFolder.exists({
      _id: { $ne: folder._id },
      coupon: folder.coupon,
      parent: folder.parent,
      name: ciExact(name),
    });
    if (duplicate) return fail(res, 409, "A folder with this name already exists here.");

    if (folder.kind === "subject") {
      const oldSubject = folder.subjectName;
      await ClassFolder.updateMany({ coupon: folder.coupon, subjectName: ciExact(oldSubject) }, { $set: { subjectName: name } });
      await VideoClass.updateMany({ coupon: folder.coupon, subjectName: ciExact(oldSubject) }, { $set: { subjectName: name } });
      folder.subjectName = name;
    } else {
      await VideoClass.updateMany({ folder: folder._id }, { $set: { topicName: name } });
    }
    folder.name = name;
    await folder.save();
    return res.status(200).json({ success: true, message: "Folder renamed!", data: folderView(folder) });
  } catch (error) {
    console.error("renameClassFolder error:", error);
    return fail(res, 500, "Error while renaming the folder.");
  }
};

export const deleteClassFolder = async (req, res) => {
  try {
    if (!isObjectId(req.params.folderId)) return fail(res, 404, "Folder not found.");
    const folder = await ClassFolder.findById(req.params.folderId);
    if (!folder || !(await checkItemAccess(req.teacher, folder.coupon, folder.subjectName))) {
      return fail(res, 404, "Folder not found.");
    }
    const [hasChildren, hasClasses] = await Promise.all([
      ClassFolder.exists({ parent: folder._id }),
      VideoClass.exists({ folder: folder._id }),
    ]);
    if (hasChildren || hasClasses) {
      return fail(res, 400, "This folder is not empty. Delete or move its classes and topics first.");
    }
    await ClassFolder.deleteOne({ _id: folder._id });
    return res.status(200).json({ success: true, message: "Folder deleted." });
  } catch (error) {
    console.error("deleteClassFolder error:", error);
    return fail(res, 500, "Error while deleting the folder.");
  }
};

// ─────────────────────────────────────────────
// Classes
// ─────────────────────────────────────────────
const readClassFields = (body) => ({
  title: cleanText(body.title, 150),
  description: cleanText(body.description, 2000),
  youtubeRaw: cleanText(body.youtubeUrl, 300),
  scheduledAt: parseDate(body.scheduledAt),
});

export const createVideoClass = async (req, res) => {
  try {
    const batch = await activeBatch(req.teacher);
    if (!batch) return fail(res, 400, "Select your active batch first.");
    const { coupon, subjects } = batch;

    if (!isObjectId(req.body.folderId)) return fail(res, 400, "Choose a folder for this class.");
    const folder = await ClassFolder.findOne({ _id: req.body.folderId, coupon: coupon._id });
    if (!folder) return fail(res, 404, "Folder not found.");
    if (!canManageSubject(subjects, folder.subjectName)) {
      return fail(res, 403, `You are not assigned the subject '${folder.subjectName}' in this batch.`);
    }

    const kind = req.body.kind === "recorded" ? "recorded" : "live";
    const { title, description, youtubeRaw, scheduledAt } = readClassFields(req.body);
    if (!title) return fail(res, 400, "Class name is required.");

    const youtubeVideoId = parseYouTubeId(youtubeRaw);
    if (youtubeRaw && !youtubeVideoId) return fail(res, 400, "This YouTube link is not valid.");
    if (kind === "recorded" && !youtubeVideoId) return fail(res, 400, "Add the YouTube link of the recorded video.");
    if (kind === "live" && !scheduledAt) return fail(res, 400, "Choose the date and time of the live class.");

    if (req.file && !isPdfBuffer(req.file.buffer)) return fail(res, 400, "Notes must be a PDF file.");

    const topicName = folder.kind === "topic" ? folder.name : "";
    let note = null;
    if (req.file) {
      note = await createClassNote({ file: req.file, title, subjectName: folder.subjectName, topicName, coupon, teacher: req.teacher });
    }

    const now = new Date();
    const cls = await VideoClass.create({
      coupon: coupon._id,
      folder: folder._id,
      subjectName: folder.subjectName,
      topicName,
      title,
      description,
      kind,
      youtubeVideoId,
      scheduledAt: kind === "live" ? scheduledAt : null,
      status: kind === "recorded" ? "ended" : "scheduled",
      endedAt: kind === "recorded" ? now : null,
      note: note ? note._id : null,
      createdBy: { teacherId: req.teacher._id, name: req.teacher.name || "" },
    });
    return res.status(201).json({ success: true, message: "Class added!", data: classView(cls) });
  } catch (error) {
    console.error("createVideoClass error:", error);
    return fail(res, 500, "Error while adding the class.");
  }
};

const loadOwnedClass = async (req) => {
  if (!isObjectId(req.params.classId)) return null;
  const cls = await VideoClass.findById(req.params.classId);
  if (!cls) return null;
  const check = await checkItemAccess(req.teacher, cls.coupon, cls.subjectName);
  return check ? { cls, coupon: check.coupon } : null;
};

export const updateVideoClass = async (req, res) => {
  try {
    const owned = await loadOwnedClass(req);
    if (!owned) return fail(res, 404, "Class not found.");
    const { cls, coupon } = owned;

    const { title, description, youtubeRaw, scheduledAt } = readClassFields(req.body);
    if (!title) return fail(res, 400, "Class name is required.");

    if (youtubeRaw) {
      const id = parseYouTubeId(youtubeRaw);
      if (!id) return fail(res, 400, "This YouTube link is not valid.");
      cls.youtubeVideoId = id;
    } else if (req.body.youtubeUrl !== undefined) {
      if (cls.kind === "recorded" || cls.status === "live") return fail(res, 400, "The YouTube link is required.");
      cls.youtubeVideoId = "";
    }
    if (cls.kind === "live" && cls.status === "scheduled") {
      if (!scheduledAt) return fail(res, 400, "Choose the date and time of the live class.");
      cls.scheduledAt = scheduledAt;
    }

    if (req.file && !isPdfBuffer(req.file.buffer)) return fail(res, 400, "Notes must be a PDF file.");
    const removeNotes = String(req.body.removeNotes) === "true";

    cls.title = title;
    cls.description = description;

    const oldNote = cls.note;
    if (req.file) {
      const note = await createClassNote({
        file: req.file,
        title,
        subjectName: cls.subjectName,
        topicName: cls.topicName,
        coupon,
        teacher: req.teacher,
      });
      cls.note = note._id;
    } else if (removeNotes) {
      cls.note = null;
    } else if (oldNote) {
      await Note.updateOne({ _id: oldNote }, { $set: { title: cleanText(`${title} — Notes`, 150) } });
    }
    await cls.save();
    if (oldNote && String(oldNote) !== String(cls.note || "")) await deleteClassNote(oldNote);

    return res.status(200).json({ success: true, message: "Class updated!", data: classView(cls) });
  } catch (error) {
    console.error("updateVideoClass error:", error);
    return fail(res, 500, "Error while updating the class.");
  }
};

/** Go live / end / cancel / reschedule-back / hide / unhide */
export const setVideoClassStatus = async (req, res) => {
  try {
    const owned = await loadOwnedClass(req);
    if (!owned) return fail(res, 404, "Class not found.");
    const { cls } = owned;
    const action = String(req.body.action || "");
    const now = new Date();

    if (action === "start") {
      if (cls.kind !== "live") return fail(res, 400, "Only a live class can be started.");
      if (!["scheduled", "cancelled"].includes(cls.status)) return fail(res, 400, "This class has already started or ended.");
      const id = req.body.youtubeUrl ? parseYouTubeId(req.body.youtubeUrl) : cls.youtubeVideoId;
      if (!id) return fail(res, 400, "Add the YouTube live link before going live.");
      cls.youtubeVideoId = id;
      cls.status = "live";
      cls.startedAt = now;
    } else if (action === "end") {
      if (cls.status !== "live") return fail(res, 400, "This class is not live.");
      cls.status = "ended";
      cls.endedAt = now;
    } else if (action === "cancel") {
      if (cls.status !== "scheduled") return fail(res, 400, "Only a scheduled class can be cancelled.");
      cls.status = "cancelled";
    } else if (action === "restore") {
      if (cls.status !== "cancelled") return fail(res, 400, "This class is not cancelled.");
      cls.status = "scheduled";
    } else if (action === "hide" || action === "unhide") {
      cls.hidden = action === "hide";
    } else {
      return fail(res, 400, "Unknown action.");
    }
    await cls.save();
    // Notes of a hidden class should not show up in the Notes page either
    if ((action === "hide" || action === "unhide") && cls.note) {
      await Note.updateOne({ _id: cls.note }, { $set: { status: cls.hidden ? "hidden" : "active" } });
    }

    const messages = {
      start: "🔴 You are live! Students can now join.",
      end: "Class ended. The recording is now available to students.",
      cancel: "Class cancelled.",
      restore: "Class scheduled again.",
      hide: "Class hidden from students.",
      unhide: "Class visible to students again.",
    };
    return res.status(200).json({ success: true, message: messages[action], data: classView(cls) });
  } catch (error) {
    console.error("setVideoClassStatus error:", error);
    return fail(res, 500, "Error while changing the class status.");
  }
};

export const deleteVideoClass = async (req, res) => {
  try {
    const owned = await loadOwnedClass(req);
    if (!owned) return fail(res, 404, "Class not found.");
    const { cls } = owned;
    await VideoClass.deleteOne({ _id: cls._id });
    await Promise.all([ClassAttendance.deleteMany({ videoClass: cls._id }), ClassDoubt.deleteMany({ videoClass: cls._id })]);
    await deleteClassNote(cls.note);
    return res.status(200).json({ success: true, message: "Class deleted." });
  } catch (error) {
    console.error("deleteVideoClass error:", error);
    return fail(res, 500, "Error while deleting the class.");
  }
};

// ─────────────────────────────────────────────
// Attendance + doubts
// ─────────────────────────────────────────────
export const getVideoClassAttendance = async (req, res) => {
  try {
    const owned = await loadOwnedClass(req);
    if (!owned) return fail(res, 404, "Class not found.");
    const { cls } = owned;

    const rows = await ClassAttendance.find({ videoClass: cls._id })
      .populate("user", "name phone")
      .sort({ firstJoinedAt: 1 })
      .limit(2000);
    const joinedIds = rows.map((r) => r.user?._id).filter(Boolean);
    const notJoined = await User.find({ activeCoupon: cls.coupon, _id: { $nin: joinedIds } })
      .select("name phone")
      .sort({ name: 1 })
      .limit(1000);

    return res.status(200).json({
      success: true,
      data: {
        class: classView(cls),
        joined: rows
          .filter((r) => r.user)
          .map((r) => ({
            userId: r.user._id,
            name: r.user.name,
            phone: r.user.phone,
            joinedLive: r.joinedLive,
            watchMinutes: Math.round((r.watchSeconds || 0) / 60),
            completed: r.completed,
            firstJoinedAt: r.firstJoinedAt,
            lastSeenAt: r.lastSeenAt,
          })),
        notJoined: notJoined.map((u) => ({ userId: u._id, name: u.name, phone: u.phone })),
      },
    });
  } catch (error) {
    console.error("getVideoClassAttendance error:", error);
    return fail(res, 500, "Could not load attendance.");
  }
};

export const getVideoClassDoubtsForTeacher = async (req, res) => {
  try {
    const owned = await loadOwnedClass(req);
    if (!owned) return fail(res, 404, "Class not found.");
    const doubts = await ClassDoubt.find({ videoClass: owned.cls._id }).sort({ createdAt: -1 }).limit(300);
    return res.status(200).json({
      success: true,
      data: doubts.map((d) => ({
        _id: d._id,
        userName: d.userName,
        text: d.text,
        answer: d.answer,
        answeredBy: d.answeredBy,
        answeredAt: d.answeredAt,
        createdAt: d.createdAt,
      })),
    });
  } catch (error) {
    console.error("getVideoClassDoubtsForTeacher error:", error);
    return fail(res, 500, "Could not load doubts.");
  }
};

const loadOwnedDoubt = async (req) => {
  if (!isObjectId(req.params.doubtId)) return null;
  const doubt = await ClassDoubt.findById(req.params.doubtId);
  if (!doubt) return null;
  const cls = await VideoClass.findById(doubt.videoClass);
  if (!cls || !(await checkItemAccess(req.teacher, cls.coupon, cls.subjectName))) return null;
  return doubt;
};

export const answerVideoClassDoubt = async (req, res) => {
  try {
    const doubt = await loadOwnedDoubt(req);
    if (!doubt) return fail(res, 404, "Doubt not found.");
    const answer = cleanText(req.body.answer, 1000);
    if (!answer) return fail(res, 400, "Write an answer.");
    doubt.answer = answer;
    doubt.answeredBy = req.teacher.name || "Teacher";
    doubt.answeredAt = new Date();
    await doubt.save();
    return res.status(200).json({ success: true, message: "Answer sent!" });
  } catch (error) {
    console.error("answerVideoClassDoubt error:", error);
    return fail(res, 500, "Error while answering.");
  }
};

export const deleteVideoClassDoubt = async (req, res) => {
  try {
    const doubt = await loadOwnedDoubt(req);
    if (!doubt) return fail(res, 404, "Doubt not found.");
    await ClassDoubt.deleteOne({ _id: doubt._id });
    return res.status(200).json({ success: true, message: "Doubt removed." });
  } catch (error) {
    console.error("deleteVideoClassDoubt error:", error);
    return fail(res, 500, "Error while removing the doubt.");
  }
};
