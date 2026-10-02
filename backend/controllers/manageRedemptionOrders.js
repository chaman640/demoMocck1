import BookRedemption from "../models/BookRedemption.js";
import Book from "../models/Book.js";
import { bookScopeFor } from "./manageBooks.js";

// Teacher sirf apni books ke orders dekhe/badle — doosre students ka
// naam/phone/address har teacher ko nahi dikhna chahiye.
const orderScopeFor = async (req) => {
  if (req.actor?.type !== "teacher") return {};
  const myBookIds = await Book.find(bookScopeFor(req)).distinct("_id");
  return { book: { $in: myBookIds } };
};

export const listRedemptionOrders = async (req, res) => {
  try {
    const { status, type } = req.query;
    const filter = await orderScopeFor(req);
    if (status) filter.status = status;
    if (type) filter["bookSnapshot.type"] = type;

    const orders = await BookRedemption.find(filter)
      .populate("user", "name email phone")
      .sort({ createdAt: -1 })
      .limit(500);

    return res.status(200).json({ success: true, data: orders });
  } catch (error) {
    console.error("listRedemptionOrders error:", error);
    return res.status(500).json({ success: false, message: "Orders list nahi ho payi." });
  }
};

export const updateRedemptionStatus = async (req, res) => {
  try {
    const { redemptionId } = req.params;
    const { status, trackingInfo } = req.body;

    if (!["pending", "shipped", "delivered"].includes(status)) {
      return res.status(400).json({ success: false, message: "status galat hai." });
    }

    const order = await BookRedemption.findOne({ _id: redemptionId, ...(await orderScopeFor(req)) });
    if (!order) {
      return res.status(404).json({ success: false, message: "Order nahi mila!" });
    }
    if (order.bookSnapshot.type !== "physical") {
      return res.status(400).json({ success: false, message: "Digital orders ka status badalna zaroori nahi hai." });
    }

    order.status = status;
    if (trackingInfo !== undefined) order.trackingInfo = String(trackingInfo).trim();
    await order.save();

    return res.status(200).json({ success: true, message: "Order update ho gaya!", data: order });
  } catch (error) {
    console.error("updateRedemptionStatus error:", error);
    return res.status(500).json({ success: false, message: "Order update karte waqt error aaya." });
  }
};
