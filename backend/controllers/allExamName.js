// controllers/allExamName.js
//
// 🆕 CHANGE — pehle ye ek hardcoded array tha, ab ExamName collection se
// padhta hai. Naya exam Admin Panel se add ho sakta hai, code/redeploy
// nahi chahiye.
import ExamName from "../models/ExamName.js";

// Purani hardcoded list — sirf PEHLI baar collection khaali milne par
// isse seed kiya jaata hai, taaki upgrade ke baad kuch na tute.
const LEGACY_DEFAULT_EXAMS = ["UP Police Constable", "SSC GD", "SSC CGL"];

export const allExamName = async (req, res) => {
    try {
        let docs = await ExamName.find().sort({ name: 1 });

        if (docs.length === 0) {
            await ExamName.insertMany(
                LEGACY_DEFAULT_EXAMS.map((name) => ({ name })),
                { ordered: false }
            ).catch(() => {}); // agar koi race condition mein pehle hi ban gaya ho
            docs = await ExamName.find().sort({ name: 1 });
        }

        res.status(200).json({
            success: true,
            message: "Exam list fetched successfully",
            data: docs.map((d) => d.name),
        });
    } catch (error) {
        console.error("Error fetching exams:", error);
        res.status(500).json({
            success: false,
            message: "Internal Server Error"
        });
    }
};
