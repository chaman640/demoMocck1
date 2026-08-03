// controllers/createPreviousYearPaperShell.js
// Sirf MAIN TEACHER ek naya paper "shell" banata hai — sirf structure
// (naam, saal, blueprint: kaunse subject ke kitne questions chahiye)
// define hota hai, actual questions abhi nahi daale jaate. Har blueprint
// subject ke liye "subjects" array mein ek khaali placeholder bhi bana
// dete hain, taaki sub-teachers baad mein seedha usme push kar sakein.
import PreviousYearTest from "../models/PreviousYearTest.js";
import Coupon from "../models/Coupon.js";

export const createPreviousYearPaperShell = async (req, res) => {
  try {
    // ─────────────────────────────────────────────
    // STEP 0: Sirf Main Teacher hi shell bana sakta hai
    // ─────────────────────────────────────────────
    if (req.teacher.role !== "main") {
      return res.status(403).json({
        success: false,
        message: "Sirf Main Teacher hi naya paper-shell bana sakta hai!",
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
        message: "couponId, testName, year aur blueprint (kam se kam ek subject) zaroori hain!",
      });
    }
    if (!durationMinutes) {
      return res.status(400).json({
        success: false,
        message: "durationMinutes zaroori hai!",
      });
    }

    for (const b of blueprint) {
      if (!b.subjectName || !b.questionCount || b.questionCount <= 0) {
        return res.status(400).json({
          success: false,
          message: "Blueprint ke har entry mein subjectName aur positive questionCount hona zaroori hai.",
        });
      }
    }

    // Duplicate subject names blueprint mein na hon (warna fill-quota logic confuse ho jayegi)
    const subjectNamesInBlueprint = blueprint.map((b) => b.subjectName);
    if (new Set(subjectNamesInBlueprint).size !== subjectNamesInBlueprint.length) {
      return res.status(400).json({
        success: false,
        message: "Blueprint mein ek subject sirf ek hi baar aana chahiye.",
      });
    }

    // ─────────────────────────────────────────────
    // STEP 2: Coupon is Main Teacher ka hi ho, verify karo —
    // examName YAHIN se derive hoga (manual mismatch avoid karne ke liye)
    // ─────────────────────────────────────────────
    const coupon = await Coupon.findOne({ _id: couponId, mainTeacher: req.teacher._id });
    if (!coupon) {
      return res.status(404).json({
        success: false,
        message: "Ye coupon nahi mila ya aapka nahi hai!",
      });
    }

    // ─────────────────────────────────────────────
    // STEP 3: subjects array pre-populate karo — blueprint ke hisaab se,
    // har subject khaali questions ke saath. Isse sub-teacher jab fill
    // karega, to seedha apne subject ka array match ho jayega.
    // ─────────────────────────────────────────────
    const initialSubjects = blueprint.map((b) => ({
      subjectName: b.subjectName,
      questions: [],
      filled: false,
    }));

    const newPaper = new PreviousYearTest({
      examName: coupon.exam,
      testName: testName.trim(),
      year,
      description: description || "",
      couponId: coupon._id,
      createdByTeacher: req.teacher._id,
      blueprint,
      subjects: initialSubjects,
      marksPerQuestion: marksPerQuestion ?? 1,
      negativeMarking: negativeMarking ?? 0,
      durationMinutes,
      // status "draft" pre-save hook khud set kar dega (kyunki subjects khaali hain)
    });

    await newPaper.save();

    return res.status(201).json({
      success: true,
      message: `'${testName}' ka shell ban gaya! Ab sub-teachers apna-apna subject fill kar sakte hain.`,
      data: newPaper,
    });
  } catch (error) {
    console.error("createPreviousYearPaperShell error:", error);
    return res.status(500).json({
      success: false,
      message: "Server mein error aa gaya paper-shell banate waqt.",
      error: error.message,
    });
  }
};