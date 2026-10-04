// controllers/createPreviousYearPaperShell.js
// Sirf MAIN TEACHER ek naya paper "shell" banata hai — sirf structure
// (naam, saal, blueprint: kaunse subject ke kitne questions chahiye).
import PreviousYearTest from "../models/PreviousYearTest.js";
import Coupon from "../models/Coupon.js";
import {
  normalizeSubject,
  subjectKey,
  getKnownSubjects,
  canonicalizeSubject,
} from "../utils/subjectName.js";

export const createPreviousYearPaperShell = async (req, res) => {
  try {
    // ─────────────────────────────────────────────
    // STEP 0: Sirf Main Teacher
    // ─────────────────────────────────────────────
    if (req.teacher.role !== "main") {
      return res.status(403).json({
        success: false,
        message: "Only a Main Teacher can create a new paper shell!",
      });
    }

    const {
      couponId,
      testName,
      year,
      description,
      blueprint,
      marksPerQuestion,
      negativeMarking,
      durationMinutes,
    } = req.body;

    // ─────────────────────────────────────────────
    // STEP 1: Validation
    // ─────────────────────────────────────────────
    if (!couponId || !testName || !year || !Array.isArray(blueprint) || blueprint.length === 0) {
      return res.status(400).json({
        success: false,
        message: "couponId, testName, year and blueprint (at least one subject) are required!",
      });
    }
    if (!durationMinutes) {
      return res.status(400).json({ success: false, message: "durationMinutes is required!" });
    }

    for (const b of blueprint) {
      if (!normalizeSubject(b.subjectName) || !b.questionCount || b.questionCount <= 0) {
        return res.status(400).json({
          success: false,
          message: "Every blueprint entry needs a subjectName and a positive questionCount.",
        });
      }
    }

    // ─────────────────────────────────────────────
    // STEP 2: Coupon verify — examName YAHIN se derive
    // ─────────────────────────────────────────────
    const coupon = await Coupon.findOne({ _id: couponId, mainTeacher: req.teacher._id });
    if (!coupon) {
      return res.status(404).json({ success: false, message: "This coupon was not found or is not yours!" });
    }

    // ─────────────────────────────────────────────
    // STEP 3: 🐛 SUBJECT SPELLING FIX
    //
    // Purani do dikkatein:
    //  (a) duplicate check `new Set(names)` case-SENSITIVE tha — "Hindi" aur
    //      "hindi" dono blueprint me chale jate the, aur paper me 2 alag blocks
    //      ban jate the. Sub-teacher ek hi bhar pata tha, doosra hamesha khaali
    //      reh jata tha → paper hamesha "draft" → student ko kabhi dikhta hi nahi.
    //  (b) subjectName trim nahi hota tha — "Maths " wale block ko sub-teacher
    //      (jiske paas "Maths" ka access hai) kabhi fill nahi kar pata tha.
    // ─────────────────────────────────────────────
    const known = await getKnownSubjects(coupon._id, coupon.exam);

    const seen = new Map(); // key -> canonical
    const cleanBlueprint = [];

    for (const b of blueprint) {
      const { canonical } = canonicalizeSubject(b.subjectName, known);
      const k = subjectKey(canonical);

      if (seen.has(k)) {
        return res.status(400).json({
          success: false,
          message:
            `'${seen.get(k)}' appears twice in the blueprint (you wrote '${normalizeSubject(b.subjectName)}'). ` +
            `Each subject should appear only once — even with different spelling/capitalisation it counts as the same subject.`,
        });
      }

      seen.set(k, canonical);
      cleanBlueprint.push({ subjectName: canonical, questionCount: Number(b.questionCount) });
    }

    // ─────────────────────────────────────────────
    // STEP 4: subjects array pre-populate + save
    // ─────────────────────────────────────────────
    const initialSubjects = cleanBlueprint.map((b) => ({
      subjectName: b.subjectName,
      questions: [],
      filled: false,
    }));

    const newPaper = new PreviousYearTest({
      examName: coupon.exam,
      testName: String(testName).trim(),
      year,
      description: description || "",
      couponId: coupon._id,
      createdByTeacher: req.teacher._id,
      blueprint: cleanBlueprint,
      subjects: initialSubjects,
      marksPerQuestion: marksPerQuestion ?? 1,
      negativeMarking: negativeMarking ?? 0,
      durationMinutes,
    });

    await newPaper.save();

    return res.status(201).json({
      success: true,
      message: `Shell for '${newPaper.testName}' created! Sub-teachers can now fill in their own subjects.`,
      data: newPaper,
    });
  } catch (error) {
    console.error("createPreviousYearPaperShell error:", error);
    return res.status(500).json({
      success: false,
      message: "Server error while creating the paper shell.",
      error: error.message,
    });
  }
};
