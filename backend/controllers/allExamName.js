// controllers/allExamName.js

export const allExamName = async (req, res) => {
    try {
        // Aapki exam names ki list (Future me aap yahan aur exams add kar sakte hain)
        const exams = [
            "UP Police Constable",
            "Ssc Gd",
            "Ssc CGL"
        ];

        // Frontend ko list bhej dena
        res.status(200).json({
            success: true,
            message: "Exam list fetched successfully",
            data: exams
        });

    } catch (error) {
        console.error("Error fetching exams:", error);
        res.status(500).json({ 
            success: false, 
            message: "Internal Server Error" 
        });
    }
};