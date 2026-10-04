// controllers/studentClasses.js
//
// Video classes — student side. A student sees the classes of their active
// batch: live now, upcoming, and recordings arranged Subject → Topic.
import Coupon from "../models/Coupon.js";
import ClassFolder from "../models/ClassFolder.js";
import VideoClass from "../models/VideoClass.js";
import ClassAttendance from "../models/ClassAttendance.js";
import ClassDoubt from "../models/ClassDoubt.js";
import { cleanText, isObjectId } from "../utils/videoClassHelpers.js";

const fail = (res, status, message) => res.status(status).json({ success: false, message });

// Most watch time one progress ping can add (the player pings every ~20s)
const MAX_PING_SECONDS = 60;
const MAX_OPEN_DOUBTS_PER_CLASS = 5;

const visibleFilter = (user) => ({ coupon: user.activeCoupon, hidden: false, status: { $ne: "cancelled" } });

const studentClassView = (c, progress) => ({
  _id: c._id,
  folder: c.folder,
  subjectName: c.subjectName,
  topicName: c.topicName,
  title: c.title,
  kind: c.kind,
  status: c.status,
  scheduledAt: c.scheduledAt,
  startedAt: c.startedAt,
  endedAt: c.endedAt,
  hasVideo: Boolean(c.youtubeVideoId),
  hasNotes: Boolean(c.note),
  teacherName: c.createdBy?.name || "",
  createdAt: c.createdAt,
  progress: progress
    ? {
        watchMinutes: Math.round((progress.watchSeconds || 0) / 60),
        completed: progress.completed,
        lastPosition: progress.lastPosition || 0,
      }
    : null,
});

/** GET /classes — everything for the student's active batch */
export const getStudentClasses = async (req, res) => {
  try {
    if (!req.user.activeCoupon) return res.status(200).json({ success: true, data: { batch: null } });

    const coupon = await Coupon.findById(req.user.activeCoupon).select("name exam");
    if (!coupon) return res.status(200).json({ success: true, data: { batch: null } });

    const [folders, classes] = await Promise.all([
      ClassFolder.find({ coupon: coupon._id }).sort({ name: 1 }),
      VideoClass.find(visibleFilter(req.user)).sort({ createdAt: 1 }),
    ]);
    const progressRows = classes.length
      ? await ClassAttendance.find({ user: req.user._id, videoClass: { $in: classes.map((c) => c._id) } })
      : [];
    const progressBy = new Map(progressRows.map((p) => [String(p.videoClass), p]));

    return res.status(200).json({
      success: true,
      data: {
        batch: { _id: coupon._id, name: coupon.name, exam: coupon.exam },
        folders: folders.map((f) => ({ _id: f._id, kind: f.kind, parent: f.parent, name: f.name, subjectName: f.subjectName })),
        classes: classes.map((c) => studentClassView(c, progressBy.get(String(c._id)))),
      },
    });
  } catch (error) {
    console.error("getStudentClasses error:", error);
    return fail(res, 500, "Could not load classes.");
  }
};

/** GET /classes/live-now — small call for the home page banner */
export const getLiveClassesNow = async (req, res) => {
  try {
    if (!req.user.activeCoupon) return res.status(200).json({ success: true, data: { live: [], next: null } });
    const now = new Date();
    const [live, next] = await Promise.all([
      VideoClass.find({ ...visibleFilter(req.user), status: "live" }).sort({ startedAt: -1 }).limit(5),
      VideoClass.findOne({
        ...visibleFilter(req.user),
        status: "scheduled",
        scheduledAt: { $gte: new Date(now.getTime() - 60 * 60 * 1000) },
      }).sort({ scheduledAt: 1 }),
    ]);
    return res.status(200).json({
      success: true,
      data: {
        live: live.map((c) => ({ _id: c._id, title: c.title, subjectName: c.subjectName, teacherName: c.createdBy?.name || "" })),
        next: next ? { _id: next._id, title: next.title, subjectName: next.subjectName, scheduledAt: next.scheduledAt } : null,
      },
    });
  } catch (error) {
    console.error("getLiveClassesNow error:", error);
    return fail(res, 500, "Could not load live classes.");
  }
};

const loadVisibleClass = async (req) => {
  if (!req.user.activeCoupon || !isObjectId(req.params.classId)) return null;
  return VideoClass.findOne({ _id: req.params.classId, ...visibleFilter(req.user) }).populate("note", "title fileBytes status");
};

/** GET /classes/:classId — player page. Opening it marks the student as joined. */
export const getStudentClass = async (req, res) => {
  try {
    const cls = await loadVisibleClass(req);
    if (!cls) return fail(res, 404, "Class not found or not available for your batch.");

    const now = new Date();
    const progress = await ClassAttendance.findOneAndUpdate(
      { videoClass: cls._id, user: req.user._id },
      {
        $setOnInsert: { firstJoinedAt: now },
        $set: { lastSeenAt: now, ...(cls.status === "live" ? { joinedLive: true } : {}) },
      },
      { upsert: true, new: true }
    );

    const note = cls.note && cls.note.status === "active" ? { _id: cls.note._id, title: cls.note.title, fileBytes: cls.note.fileBytes } : null;
    return res.status(200).json({
      success: true,
      data: {
        ...studentClassView(cls, progress),
        description: cls.description,
        youtubeVideoId: cls.youtubeVideoId,
        note,
      },
    });
  } catch (error) {
    console.error("getStudentClass error:", error);
    return fail(res, 500, "Could not load the class.");
  }
};

/**
 * POST /classes/:classId/progress { watched, position, duration }
 * Sent by the player every ~20 seconds while the video plays.
 */
export const saveClassProgress = async (req, res) => {
  try {
    const cls = await loadVisibleClass(req);
    if (!cls) return fail(res, 404, "Class not found.");

    const now = new Date();
    const existing = await ClassAttendance.findOne({ videoClass: cls._id, user: req.user._id });
    // Never count more time than has really passed since the last ping
    const elapsed = existing ? Math.max(0, (now - existing.lastSeenAt) / 1000) + 5 : MAX_PING_SECONDS;
    const watched = Math.max(0, Math.min(Number(req.body.watched) || 0, MAX_PING_SECONDS, elapsed));
    const position = Math.max(0, Number(req.body.position) || 0);
    const duration = Math.max(0, Number(req.body.duration) || 0);
    const completed = cls.status === "ended" && duration > 60 && position >= duration * 0.9;

    const update = {
      $setOnInsert: { firstJoinedAt: now },
      $set: { lastSeenAt: now, ...(cls.status === "ended" && position ? { lastPosition: Math.floor(position) } : {}) },
      $inc: { watchSeconds: Math.round(watched) },
    };
    if (cls.status === "live") update.$set.joinedLive = true;
    if (completed) update.$set.completed = true;

    await ClassAttendance.updateOne({ videoClass: cls._id, user: req.user._id }, update, { upsert: true });
    return res.status(200).json({ success: true });
  } catch (error) {
    console.error("saveClassProgress error:", error);
    return fail(res, 500, "Could not save progress.");
  }
};

/** GET /classes/:classId/doubts */
export const getClassDoubts = async (req, res) => {
  try {
    const cls = await loadVisibleClass(req);
    if (!cls) return fail(res, 404, "Class not found.");
    const doubts = await ClassDoubt.find({ videoClass: cls._id }).sort({ createdAt: -1 }).limit(100);
    return res.status(200).json({
      success: true,
      data: doubts.map((d) => ({
        _id: d._id,
        userName: d.userName,
        mine: String(d.user) === String(req.user._id),
        text: d.text,
        answer: d.answer,
        answeredBy: d.answeredBy,
        answeredAt: d.answeredAt,
        createdAt: d.createdAt,
      })),
    });
  } catch (error) {
    console.error("getClassDoubts error:", error);
    return fail(res, 500, "Could not load doubts.");
  }
};

/** POST /classes/:classId/doubts { text } */
export const askClassDoubt = async (req, res) => {
  try {
    const cls = await loadVisibleClass(req);
    if (!cls) return fail(res, 404, "Class not found.");
    const text = cleanText(req.body.text, 500);
    if (text.length < 3) return fail(res, 400, "Write your doubt (at least 3 characters).");

    const open = await ClassDoubt.countDocuments({ videoClass: cls._id, user: req.user._id, answer: "" });
    if (open >= MAX_OPEN_DOUBTS_PER_CLASS) {
      return fail(res, 429, `You already have ${MAX_OPEN_DOUBTS_PER_CLASS} unanswered doubts in this class. Wait for the teacher to answer.`);
    }
    const doubt = await ClassDoubt.create({ videoClass: cls._id, user: req.user._id, userName: req.user.name || "Student", text });
    return res.status(201).json({ success: true, message: "Doubt sent to the teacher!", data: { _id: doubt._id } });
  } catch (error) {
    console.error("askClassDoubt error:", error);
    return fail(res, 500, "Could not send the doubt.");
  }
};
