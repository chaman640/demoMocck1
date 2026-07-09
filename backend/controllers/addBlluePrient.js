// controllers/addBluePrint.js
import Blueprint from "../models/bluePrint.js"; // 👈 Dhyan rahe filename exact match kare

export const addBluePrint = async (req, res) => {
    try {
        const { 
            blueprintName, 
            examName, // 👈 1. Frontend se examName extract kiya
            totalQuestions, 
            marksPerQuestion, 
            negativeMarking, 
            subjects, 
            mockType 
        } = req.body;

        // 1. Validation: Zaroori fields check karein (isme examName bhi jod diya)
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
        const newBlueprint = new Blueprint({
            blueprintName,
            examName, // 👈 2. Database me save karne ke liye yahan pass kiya
            totalQuestions,
            marksPerQuestion,
            negativeMarking: negativeMarking ?? 0, // 👈 Falsy bug fix (?? use kiya)
            subjects, 
            mockType: mockType ?? "Full" // 👈 Falsy bug fix (?? use kiya)
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
        // Error handling
        res.status(500).json({
            success: false,
            message: "Server me error aa gaya blueprint save karte waqt.",
            error: error.message
        });
    }
};