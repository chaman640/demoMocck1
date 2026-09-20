// backend/controllers/deleteCustomTest.js
//
// 🆕 NAYA — Custom Test delete karta hai. Jisne test banaya (createdBy)
// ya us batch ka Main Teacher, dono delete kar sakte hain. Students ke
// purane attempt records (unka score/history) delete NAHI hote — sirf
// test ka "template" hatta hai, taaki purani performance history safe rahe.
import mongoose from "mongoose";
import CustomTest from "../models/CustomTest.js";
import Coupon from "../models/Coupon.js";

export const deleteCustomTest = async (req, res) => {
  try {
    const { testId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(testId)) {
      return res.status(400).json({ success: false, message: "Invalid test ID." });
    }

    const test = await CustomTest.findById(testId);
    if (!test) {
      return res.status(404).json({ success: false, message: "Ye test nahi mila." });
    }

    const isCreator = test.createdBy?.toString() === req.teacher._id.toString();
    let isOwningMainTeacher = false;
    if (!isCreator && req.teacher.role === "main") {
      const coupon = await Coupon.findById(test.couponId).select("mainTeacher");
      isOwningMainTeacher = coupon && coupon.mainTeacher.toString() === req.teacher._id.toString();
    }

    if (!isCreator && !isOwningMainTeacher) {
      return res.status(403).json({ success: false, message: "Ye test delete karne ki permission nahi hai." });
    }

    await CustomTest.deleteOne({ _id: testId });

    return res.status(200).json({ success: true, message: `'${test.testName}' test delete ho gaya.` });
  } catch (error) {
    console.error("deleteCustomTest error:", error);
    return res.status(500).json({ success: false, message: "Test delete karte waqt error aaya." });
  }
};
