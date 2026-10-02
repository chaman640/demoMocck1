import Book from "../models/Book.js";

// Admin saari books manage karta hai; teacher sirf apni banayi hui.
export const bookScopeFor = (req) =>
  req.actor?.type === "teacher"
    ? { "createdBy.actorType": "teacher", "createdBy.actorId": req.actor.teacherId }
    : {};

const parseBoolean = (v) => v === true || v === "true";
const parseNumberOrNull = (v) => {
  if (v === undefined || v === null || v === "") return null;
  const n = Number(v);
  return Number.isNaN(n) ? null : n;
};

export const createBook = async (req, res) => {
  try {
    const { title, description, type, isFree, coinCost, stockQuantity, coverImageUrl, digitalFilePublicId } = req.body;

    if (!title || !type) {
      return res.status(400).json({ success: false, message: "Title aur type zaroori hain!" });
    }
    if (!["digital", "physical"].includes(type)) {
      return res.status(400).json({ success: false, message: "type 'digital' ya 'physical' hona chahiye." });
    }

    const free = parseBoolean(isFree);
    const cost = free ? 0 : Number(coinCost) || 0;
    if (!free && cost <= 0) {
      return res.status(400).json({ success: false, message: "Paid book ke liye coin cost 0 se zyada hona chahiye." });
    }

    if (type === "digital" && !digitalFilePublicId) {
      return res.status(400).json({ success: false, message: "Digital book ke liye file upload karna zaroori hai." });
    }

    const book = new Book({
      title: String(title).trim(),
      description: description ? String(description).trim() : "",
      coverImageUrl: coverImageUrl || "",
      type,
      isFree: free,
      coinCost: cost,
      digitalFilePublicId: type === "digital" ? digitalFilePublicId : "",
      stockQuantity: type === "physical" ? parseNumberOrNull(stockQuantity) : null,
      createdBy: {
        actorType: req.actor?.type || "admin",
        actorId: req.actor?.type === "teacher" ? req.actor.teacherId : null,
      },
    });
    await book.save();

    return res.status(201).json({ success: true, message: "Book add ho gayi!", data: book });
  } catch (error) {
    console.error("createBook error:", error);
    return res.status(500).json({ success: false, message: "Book add karte waqt error aaya." });
  }
};

export const listBooksForManage = async (req, res) => {
  try {
    const books = await Book.find(bookScopeFor(req)).sort({ createdAt: -1 });
    return res.status(200).json({ success: true, data: books });
  } catch (error) {
    console.error("listBooksForManage error:", error);
    return res.status(500).json({ success: false, message: "Books list nahi ho payi." });
  }
};

export const updateBook = async (req, res) => {
  try {
    const { bookId } = req.params;
    const { title, description, isFree, coinCost, stockQuantity, coverImageUrl, digitalFilePublicId } = req.body;

    const book = await Book.findOne({ _id: bookId, ...bookScopeFor(req) });
    if (!book) {
      return res.status(404).json({ success: false, message: "Book nahi mili!" });
    }

    if (title) book.title = String(title).trim();
    if (description !== undefined) book.description = String(description).trim();
    if (coverImageUrl) book.coverImageUrl = coverImageUrl;
    if (digitalFilePublicId && book.type === "digital") {
      book.digitalFilePublicId = digitalFilePublicId;
      book.digitalFileUrl = ""; // purana public link band
    }

    if (isFree !== undefined) {
      book.isFree = parseBoolean(isFree);
      book.coinCost = book.isFree ? 0 : Number(coinCost) || book.coinCost;
    } else if (coinCost !== undefined && !book.isFree) {
      book.coinCost = Number(coinCost) || book.coinCost;
    }

    if (book.type === "physical" && stockQuantity !== undefined) {
      book.stockQuantity = parseNumberOrNull(stockQuantity);
    }

    if (!book.isFree && !(book.coinCost > 0)) {
      return res.status(400).json({ success: false, message: "Paid book ke liye coin cost 0 se zyada hona chahiye." });
    }

    await book.save();
    return res.status(200).json({ success: true, message: "Book update ho gayi!", data: book });
  } catch (error) {
    console.error("updateBook error:", error);
    return res.status(500).json({ success: false, message: "Book update karte waqt error aaya." });
  }
};

export const setBookStatus = async (req, res) => {
  try {
    const { bookId } = req.params;
    const { status } = req.body;

    if (!["active", "hidden"].includes(status)) {
      return res.status(400).json({ success: false, message: "status 'active' ya 'hidden' hona chahiye." });
    }

    const book = await Book.findOneAndUpdate({ _id: bookId, ...bookScopeFor(req) }, { status }, { new: true });
    if (!book) {
      return res.status(404).json({ success: false, message: "Book nahi mili!" });
    }

    return res.status(200).json({
      success: true,
      message: status === "hidden" ? "Book hide kar di gayi." : "Book active kar di gayi.",
      data: book,
    });
  } catch (error) {
    console.error("setBookStatus error:", error);
    return res.status(500).json({ success: false, message: "Status badalte waqt error aaya." });
  }
};
