// controllers/getTeacherSubjects.js
// ─────────────────────────────────────────────
// NAYA ENDPOINT: GET /teacher/subjects
//
// KYUN: pehle teacher ko har jagah subject ka naam HAATH SE type karna padta tha
// (question add, PYQ blueprint, custom test, sub-teacher invite). Ek spelling
// galti se poora flow chup-chaap toot jata tha.
//
// Ab frontend ye list mangwa kar suggestion/autocomplete dikhata hai:
//
//  • inBlueprint: true  → ye subject Mock Test blueprint mein hai.
//                         ISME daale gaye sawaal students ke auto-generated
//                         Mock Test mein aayenge. Yahi use karna chahiye.
//  • inBlueprint: false → ye subject sirf is batch mein use ho raha hai.
//                         Custom Test / PYQ mein chalega, lekin Mock Test
//                         mein nahi aayega.
// ─────────────────────────────────────────────
import Coupon from "../models/Coupon.js";
import { getKnownSubjects, subjectKey } from "../utils/subjectName.js";

export const getTeacherSubjects = async (req, res) => {
  try {
    const teacher = req.teacher;

    if (!teacher.activeCoupon) {
      return res.status(200).json({
        success: true,
        data: { exam: null, subjects: [], message: "Pehle apna active batch select karein." },
      });
    }

    const coupon = await Coupon.findById(teacher.activeCoupon).select("exam name");
    if (!coupon) {
      return res.status(404).json({ success: false, message: "Active coupon nahi mila." });
    }

    const { blueprintSubjects, usedSubjects } = await getKnownSubjects(coupon._id, coupon.exam);

    const merged = [];
    const pushOnce = (name, inBlueprint) => {
      const existing = merged.find((m) => subjectKey(m.name) === subjectKey(name));
      if (existing) {
        existing.inBlueprint = existing.inBlueprint || inBlueprint;
        return;
      }
      merged.push({ name, inBlueprint });
    };

    blueprintSubjects.forEach((s) => pushOnce(s, true));
    usedSubjects.forEach((s) => pushOnce(s, false));

    // Blueprint wale pehle (recommended), phir baaki — dono alphabetically
    merged.sort((a, b) => {
      if (a.inBlueprint !== b.inBlueprint) return a.inBlueprint ? -1 : 1;
      return a.name.localeCompare(b.name);
    });

    return res.status(200).json({
      success: true,
      data: {
        exam: coupon.exam,
        couponName: coupon.name,
        subjects: merged,
      },
    });
  } catch (error) {
    console.error("getTeacherSubjects error:", error);
    return res.status(500).json({
      success: false,
      message: "Subject list fetch karte waqt error aaya.",
      error: error.message,
    });
  }
};
