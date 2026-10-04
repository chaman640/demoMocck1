// controllers/offlineReading.js
//
// Books aur notes ko app ke andar (offline bhi) padhne ka system.
//
//   POST /offline/:itemType/:itemId   → watermark + encrypted PDF (binary)
//                                       key/iv/license response headers mein
//   POST /offline/sync                → saved items ki permission aage badhao
//                                       ya revoke karo
//   GET  /offline/devices             → is account ke phones
//   POST /offline/devices/:deviceId/remove
//   GET  /notes                       → student ko dikhne wale notes
import mongoose from "mongoose";
import Book from "../models/Book.js";
import BookRedemption from "../models/BookRedemption.js";
import Note from "../models/Note.js";
import OfflineDevice from "../models/OfflineDevice.js";
import OfflineDeviceRemoval from "../models/OfflineDeviceRemoval.js";
import OfflineLicense from "../models/OfflineLicense.js";
import { fetchPdfBuffer } from "../utils/privateFiles.js";
import { buildOfflinePackage, watermarkText } from "../utils/offlinePackage.js";

export const OFFLINE_DAYS = 15;
export const MAX_OFFLINE_DEVICES = 2;
const MAX_REMOVALS_PER_30_DAYS = 3;
const DAY_MS = 24 * 60 * 60 * 1000;

const ITEM_TYPES = ["book", "note"];
const isValidDeviceId = (id) => typeof id === "string" && /^[A-Za-z0-9-]{16,64}$/.test(id);
const newExpiry = () => new Date(Date.now() + OFFLINE_DAYS * DAY_MS);

const noteVisibleTo = (note, user) => {
  if (!note || note.status !== "active") return false;
  if (note.visibility === "public") return Boolean(user.exam) && note.examName === user.exam;
  if (!user.activeCoupon) return false;
  return note.coupons.some((c) => String(c) === String(user.activeCoupon));
};

/**
 * Kya ye student is item ko padh sakta hai?
 * @returns {Promise<null | { title, subtitle, source: { publicId?, url? } }>}
 */
const resolveItemAccess = async (user, itemType, itemId) => {
  if (!mongoose.Types.ObjectId.isValid(itemId)) return null;

  if (itemType === "book") {
    const [book, redemption] = await Promise.all([
      Book.findById(itemId),
      BookRedemption.findOne({ user: user._id, book: itemId }).select("_id"),
    ]);
    // Book baad mein hide bhi ho jaye, jisne le li hai wo padh sakta hai
    if (!book || book.type !== "digital" || !redemption) return null;
    if (!book.digitalFilePublicId && !book.digitalFileUrl) return null;
    return {
      title: book.title,
      subtitle: "Book",
      source: { publicId: book.digitalFilePublicId || undefined, url: book.digitalFileUrl || undefined },
    };
  }

  if (itemType === "note") {
    const note = await Note.findById(itemId);
    if (!noteVisibleTo(note, user)) return null;
    return {
      title: note.title,
      subtitle: [note.subjectName, note.topicName].filter(Boolean).join(" · "),
      source: { publicId: note.filePublicId },
    };
  }

  return null;
};

const listActiveDevices = (userId) =>
  OfflineDevice.find({ user: userId, active: true }).sort({ lastSeenAt: -1 });

const deviceView = (d, currentDeviceId) => ({
  deviceId: d.deviceId,
  label: d.label || "Unknown device",
  lastSeenAt: d.lastSeenAt,
  addedAt: d.createdAt,
  isThisDevice: d.deviceId === currentDeviceId,
});

/** Device ko register karta hai; limit paar ho to null. */
const registerDevice = async (user, deviceId, label) => {
  const existing = await OfflineDevice.findOne({ user: user._id, deviceId });
  if (existing?.active) {
    existing.lastSeenAt = new Date();
    if (label) existing.label = label;
    await existing.save();
    return existing;
  }

  const activeCount = await OfflineDevice.countDocuments({ user: user._id, active: true });
  if (activeCount >= MAX_OFFLINE_DEVICES) return null;

  if (existing) {
    existing.active = true;
    existing.removedAt = null;
    existing.lastSeenAt = new Date();
    if (label) existing.label = label;
    await existing.save();
    return existing;
  }
  return OfflineDevice.create({ user: user._id, deviceId, label, lastSeenAt: new Date() });
};

export const downloadOfflineItem = async (req, res) => {
  try {
    const { itemType, itemId } = req.params;
    const deviceId = String(req.body?.deviceId || "");
    const label = String(req.body?.deviceLabel || "").slice(0, 80);

    if (!ITEM_TYPES.includes(itemType)) {
      return res.status(400).json({ success: false, message: "Invalid item type." });
    }
    if (!isValidDeviceId(deviceId)) {
      return res.status(400).json({ success: false, message: "Invalid device ID. Reload the app and try again." });
    }

    const access = await resolveItemAccess(req.user, itemType, itemId);
    if (!access) {
      return res.status(403).json({ success: false, message: "You do not have permission to read this." });
    }

    const device = await registerDevice(req.user, deviceId, label);
    if (!device) {
      const devices = await listActiveDevices(req.user._id);
      return res.status(409).json({
        success: false,
        code: "DEVICE_LIMIT",
        message: `Your account is already in use on ${MAX_OFFLINE_DEVICES} phones. Remove an old phone to read on a new one.`,
        devices: devices.map((d) => deviceView(d, deviceId)),
      });
    }

    let pdfBuffer;
    try {
      pdfBuffer = await fetchPdfBuffer(access.source);
    } catch (error) {
      console.error("offline fetchPdfBuffer error:", error.message);
      return res.status(502).json({ success: false, message: "The file could not be loaded right now. Try again in a little while." });
    }

    const pkg = await buildOfflinePackage(pdfBuffer, req.user);
    const expiresAt = newExpiry();

    const license = await OfflineLicense.findOneAndUpdate(
      { user: req.user._id, deviceId, itemType, itemId },
      { $set: { expiresAt, revokedAt: null }, $inc: { downloadCount: 1 } },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    res.set({
      "Content-Type": "application/octet-stream",
      "Cache-Control": "no-store",
      "X-Offline-License": String(license._id),
      "X-Offline-Key": pkg.key,
      "X-Offline-Iv": pkg.iv,
      "X-Offline-Expires": expiresAt.toISOString(),
      "X-Offline-Title": encodeURIComponent(access.title),
      "X-Offline-Subtitle": encodeURIComponent(access.subtitle || ""),
      "X-Offline-Watermark": encodeURIComponent(watermarkText(req.user)),
    });
    return res.status(200).send(pkg.cipher);
  } catch (error) {
    console.error("downloadOfflineItem error:", error);
    return res.status(500).json({ success: false, message: "Error while preparing the file." });
  }
};

export const syncOfflineLicenses = async (req, res) => {
  try {
    const deviceId = String(req.body?.deviceId || "");
    const licenseIds = Array.isArray(req.body?.licenseIds) ? req.body.licenseIds.slice(0, 500) : [];
    if (!isValidDeviceId(deviceId)) {
      return res.status(400).json({ success: false, message: "Invalid device ID." });
    }

    const validIds = licenseIds.filter((id) => mongoose.Types.ObjectId.isValid(id));
    const device = await OfflineDevice.findOne({ user: req.user._id, deviceId, active: true });
    if (device) {
      device.lastSeenAt = new Date();
      await device.save();
    }

    const licenses = device
      ? await OfflineLicense.find({ _id: { $in: validIds }, user: req.user._id, deviceId, revokedAt: null })
      : [];
    const byId = new Map(licenses.map((l) => [String(l._id), l]));

    const results = [];
    for (const id of licenseIds) {
      const license = byId.get(String(id));
      if (!license) {
        results.push({ licenseId: id, status: "revoked" });
        continue;
      }
      const access = await resolveItemAccess(req.user, license.itemType, license.itemId);
      if (!access) {
        license.revokedAt = new Date();
        await license.save();
        results.push({ licenseId: id, status: "revoked" });
        continue;
      }
      license.expiresAt = newExpiry();
      await license.save();
      results.push({ licenseId: id, status: "active", expiresAt: license.expiresAt });
    }

    return res.status(200).json({ success: true, data: results });
  } catch (error) {
    console.error("syncOfflineLicenses error:", error);
    return res.status(500).json({ success: false, message: "Could not sync." });
  }
};

export const listOfflineDevices = async (req, res) => {
  try {
    const current = String(req.query.deviceId || "");
    const devices = await listActiveDevices(req.user._id);
    return res.status(200).json({
      success: true,
      data: { maxDevices: MAX_OFFLINE_DEVICES, devices: devices.map((d) => deviceView(d, current)) },
    });
  } catch (error) {
    console.error("listOfflineDevices error:", error);
    return res.status(500).json({ success: false, message: "Could not load devices." });
  }
};

export const removeOfflineDevice = async (req, res) => {
  try {
    const { deviceId } = req.params;
    const device = await OfflineDevice.findOne({ user: req.user._id, deviceId, active: true });
    if (!device) return res.status(404).json({ success: false, message: "Device not found." });

    const recentRemovals = await OfflineDeviceRemoval.countDocuments({
      user: req.user._id,
      createdAt: { $gte: new Date(Date.now() - 30 * DAY_MS) },
    });
    if (recentRemovals >= MAX_REMOVALS_PER_30_DAYS) {
      return res.status(429).json({
        success: false,
        message: `You can remove a phone only ${MAX_REMOVALS_PER_30_DAYS} times in 30 days. Try again in a few days.`,
      });
    }

    device.active = false;
    device.removedAt = new Date();
    await device.save();
    await OfflineDeviceRemoval.create({ user: req.user._id, deviceId });
    await OfflineLicense.updateMany(
      { user: req.user._id, deviceId, revokedAt: null },
      { $set: { revokedAt: new Date() } }
    );

    return res.status(200).json({ success: true, message: "Phone removed." });
  } catch (error) {
    console.error("removeOfflineDevice error:", error);
    return res.status(500).json({ success: false, message: "Could not remove the phone." });
  }
};

export const listNotesForStudent = async (req, res) => {
  try {
    const or = [];
    if (req.user.exam) or.push({ visibility: "public", examName: req.user.exam });
    if (req.user.activeCoupon) or.push({ visibility: "batch", coupons: req.user.activeCoupon });
    if (or.length === 0) return res.status(200).json({ success: true, data: [] });

    const notes = await Note.find({ status: "active", $or: or })
      .select("title description subjectName topicName fileBytes visibility createdBy.actorType createdBy.name createdAt")
      .sort({ subjectName: 1, topicName: 1, createdAt: -1 });

    return res.status(200).json({
      success: true,
      data: notes.map((n) => ({
        _id: n._id,
        title: n.title,
        description: n.description,
        subjectName: n.subjectName,
        topicName: n.topicName,
        fileBytes: n.fileBytes,
        source: n.visibility === "batch" ? "batch" : "official",
        teacherName: n.createdBy?.actorType === "teacher" ? n.createdBy.name : "",
        createdAt: n.createdAt,
      })),
    });
  } catch (error) {
    console.error("listNotesForStudent error:", error);
    return res.status(500).json({ success: false, message: "Could not load notes." });
  }
};
