// controllers/removeSubTeacher.js
// Sub-teacher ko remove karna — content (questions, tests) delete NAHI
// hota, sirf access revoke hota hai (status=removed + CouponAccess clear).
import mongoose from "mongoose";
import Teacher from "../models/Teacher.js";
import CouponAccess from "../models/CouponAccess.js";

export const removeSubTeacher = async (req, res) => {
  try {
    if (req.teacher.role !== "main") {
      return res.status(403).json({
        success: false,
        message: "Sirf Main Teacher hi sub-teacher remove kar sakta hai!",
      });
    }

    const { subTeacherId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(subTeacherId)) {
      return res.status(400).json({ success: false, message: "Invalid subTeacherId." });
    }

    const subTeacher = await Teacher.findOne({
      _id: subTeacherId,
      parentTeacher: req.teacher._id,
    });

    if (!subTeacher) {
      return res.status(404).json({
        success: false,
        message: "Ye sub-teacher nahi mila ya aapka nahi hai!",
      });
    }

    if (subTeacher.status === "removed") {
      return res.status(400).json({
        success: false,
        message: "Ye sub-teacher pehle se hi removed hai.",
      });
    }

    subTeacher.status = "removed";
    subTeacher.inviteToken = null;
    subTeacher.inviteTokenExpiry = null;
    subTeacher.activeCoupon = null;
    await subTeacher.save();

    // Access revoke — sub-teacher ka bana hua content (questions/tests)
    // seedha createdBy se link hai, CouponAccess se nahi — isliye wo safe rahega
    await CouponAccess.deleteMany({ subTeacher: subTeacher._id });

    return res.status(200).json({
      success: true,
      message: `${subTeacher.name} ko remove kar diya gaya. Unka bana hua content safe hai.`,
    });
  } catch (error) {
    console.error("removeSubTeacher error:", error);
    return res.status(500).json({
      success: false,
      message: "Sub-teacher remove karte waqt error aaya.",
      error: error.message,
    });
  }
};