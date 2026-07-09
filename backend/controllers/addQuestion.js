import { Question } from "../models/rowQuestionSchema.js";

export const addQuestion = async (req, res) => {
  try {
    // 1️⃣ Check karte hain ki Postman se data Array me aaya hai ya Single
    const questionsData = Array.isArray(req.body) ? req.body : [req.body];

    // Agar data khali hai
    if (!questionsData || questionsData.length === 0 || Object.keys(questionsData[0]).length === 0) {
        return res.status(400).json({ success: false, message: "Postman se blank data aa raha hai. Format check karein."});
    }

    const savedQuestions = [];

    // 2️⃣ Sabhi questions par loop chalayenge
    for (const q of questionsData) {
      
      // DYNAMIC AUTO-NUMBERING
      const existingCount = await Question.countDocuments({
        examName: { $in: q.examName },
        subjectName: q.subjectName,
        topicName: q.topicName
      });

      const nextNumber = existingCount + 1;

      // Naya model instance create kiya
      const newQuestion = new Question({
        question: q.question,
        option1: q.option1,
        option2: q.option2,
        option3: q.option3,
        option4: q.option4,
        correctOption: q.correctOption,
        answerExplain: q.answerExplain,
        subjectName: q.subjectName,
        topicName: q.topicName,
        examName: q.examName,
        questionPhoto: q.questionPhoto || null,
        answerExplainWithPhoto: q.answerExplainWithPhoto || null,
        questionNumber: nextNumber
      });

      // Database mein save kiya
      const savedQ = await newQuestion.save();
      savedQuestions.push(savedQ);
    }

    // 3️⃣ Frontend ko success response bhej diya
    res.status(201).json({
      success: true,
      message: `🎉 ${savedQuestions.length} Questions successfully saved in Bulk!`,
      data: savedQuestions
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: "❌ Controller mein data save karne mein galti hui",
      error: error.message
    });
  }
};