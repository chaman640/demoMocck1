// controllers/addBluePrint.js
import Blueprint from "../models/bluePrint.js"; // 👈 Dhyan rahe filename exact match kare

export const addBluePrint = async (req, res) => {
    try {
        const {
            blueprintName,
            examName,
            totalQuestions,
            marksPerQuestion,
            negativeMarking,
            durationMinutes,
            subjects,
            unseenPassages, // 🆕 — pehle ye field controller mein hi nahi tha, isliye chup-chaap ignore ho jaata tha
            mockType
        } = req.body;

        // 1. Validation: Zaroori fields check karein
        if (!blueprintName || !examName || !totalQuestions || !marksPerQuestion || !subjects) {
            return res.status(400).json({
                success: false,
                message: "blueprintName, examName, totalQuestions, marksPerQuestion, aur subjects bharna zaroori hai!"
            });
        }

        // 2. Validation: Check karein ki subjects ek Array ho aur khali na ho
        if (!Array.isArray(subjects) || subjects.length === 0) {
            return res.status(400).json({
                success: false,
                message: "Subjects me kam se kam ek subject ka data hona chahiye!"
            });
        }

        // 3. Naya Blueprint Document banayein
        // 🆕 Yahan se hierarchy (totalQuestions = subjects + unseenPassages ka
        // sum, aur har subject.questionCount = uske topics ka sum) khud Model
        // ke pre("validate") hook mein check hoti hai — agar numbers match
        // nahi karte to .save() khud hi saaf error de dega.
        const newBlueprint = new Blueprint({
            blueprintName,
            examName,
            totalQuestions,
            marksPerQuestion,
            negativeMarking: negativeMarking ?? 0,
            durationMinutes: durationMinutes ?? 0,
            subjects,
            unseenPassages: unseenPassages ?? [], // 🆕
            mockType: mockType ?? "Full"
        });

        // 4. Database me save karein
        await newBlueprint.save();

        // 5. Success Response
        res.status(201).json({
            success: true,
            message: "Blueprint successfully create ho gaya!",
            data: newBlueprint
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: "Server me error aa gaya blueprint save karte waqt.",
            error: error.message
        });
    }
};
