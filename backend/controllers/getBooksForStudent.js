import Book from "../models/Book.js";
import BookRedemption from "../models/BookRedemption.js";

export const getBooksForStudent = async (req, res) => {
  try {
    const books = await Book.find({ status: "active" }).sort({ createdAt: -1 });

    const myRedemptions = await BookRedemption.find({ user: req.user._id }).select("book");
    const redeemedBookIds = new Set(myRedemptions.map((r) => String(r.book)));

    const data = books.map((b) => ({
      _id: b._id,
      title: b.title,
      description: b.description,
      coverImageUrl: b.coverImageUrl,
      type: b.type,
      isFree: b.isFree,
      coinCost: b.isFree ? 0 : b.coinCost,
      inStock: b.type === "physical" ? b.stockQuantity === null || b.stockQuantity > 0 : true,
      alreadyRedeemed: redeemedBookIds.has(String(b._id)),
    }));

    return res.status(200).json({ success: true, data });
  } catch (error) {
    console.error("getBooksForStudent error:", error);
    return res.status(500).json({ success: false, message: "Books list nahi ho payi." });
  }
};
