import BookRedemption from "../models/BookRedemption.js";

export const getMyRedemptions = async (req, res) => {
  try {
    const redemptions = await BookRedemption.find({ user: req.user._id })
      .populate("book", "digitalFileUrl")
      .sort({ createdAt: -1 });

    const data = redemptions.map((r) => ({
      _id: r._id,
      title: r.bookSnapshot.title,
      type: r.bookSnapshot.type,
      coverImageUrl: r.bookSnapshot.coverImageUrl,
      coinsSpent: r.coinsSpent,
      status: r.status,
      digitalFileUrl:
        r.bookSnapshot.type === "digital" ? r.book?.digitalFileUrl || r.digitalFileUrl || undefined : undefined,
      trackingInfo: r.trackingInfo || undefined,
      redeemedAt: r.createdAt,
    }));

    return res.status(200).json({ success: true, data });
  } catch (error) {
    console.error("getMyRedemptions error:", error);
    return res.status(500).json({ success: false, message: "Orders list nahi ho payi." });
  }
};
