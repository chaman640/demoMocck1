// routes/Routes.js
import express from "express";

// ── Models ────────────────────────────────────
import Blueprint from "../models/bluePrint.js"; // 👈 Ye import missing tha jiske wajah se crash ho raha tha

// ── Controllers ──────────────────────────────
import { addQuestion }    from "../controllers/addQuestion.js";
import { addUser }        from "../controllers/addUser.js";
import { addPerformence } from "../controllers/addPerformence.js";
import { addBluePrint }   from "../controllers/addBlluePrient.js"; 
import { addMocktest }    from "../controllers/addMockTest.js";
import { loginUser } from "../controllers/authentication.js";
import { updateUserInfo } from "../controllers/updateSutf.js";
import { allExamName } from "../controllers/allExamName.js";

// ── Middleware ────────────────────────────────
import { processQuestionMiddleware } from "../middlewares/processQuestion.js";
import { userInfo } from "../middlewares/userInfo.js";

// ── Analysis functions ────────────────────────
import {
  getAllAnalysis1stPage,   
  getPerformanceAnalysis,  
  getSubjectAnalysis,      
  getTopicAnalysis,        
  getUserMockTests,        
} from "../pages/user/analysicUser.js";

const router = express.Router();

// ─────────────────────────────────────────────
// POST ROUTES
// ─────────────────────────────────────────────
router.post("/add-question", processQuestionMiddleware, addQuestion);
router.post("/add-user",        addUser);
router.post("/add-performence", addPerformence);
router.post("/add-bluePrint",   addBluePrint);
router.post("/generate-mock",  userInfo, addMocktest);
router.post("/user-Login",   loginUser);
router.post("/user-update",  userInfo, updateUserInfo);

// ─────────────────────────────────────────────
// GET ROUTES 
// ─────────────────────────────────────────────

// 1. Logged-in user ka data fetch karne ke liye (MockTest start karne se pehle)
router.get("/me", userInfo, (req, res) => {
    res.status(200).json({ success: true, data: req.user });
});

// 2. Exam ke hisaab se saare blueprints (mock tests) fetch karne ke liye
router.get("/blueprints/:examName", userInfo, async (req, res) => {
    try {
        const { examName } = req.params;
        const blueprints = await Blueprint.find({ examName });
        
        res.status(200).json({ success: true, data: blueprints });
    } catch (error) {
        res.status(500).json({ success: false, message: "Blueprints fetch karne mein error aaya", error: error.message });
    }
});

// 3. User ke saare mocks ki list
router.get("/analysis/mock-list/:userId/:examName",    getUserMockTests);

// 4. Page 1 — Overview (average score, lifetime graph, subject list)
router.get("/analysis/overview/:userId/:examName", userInfo,   getAllAnalysis1stPage);

// 5. Page 1 — Graph click → ek specific mock ka pura breakdown
router.get("/analysis/mock-detail/:performanceId", userInfo,   getPerformanceAnalysis);

// 6. Page 2 — Subject-wise analysis (topic list + weak topics)
router.get("/analysis/subject/:userId/:examName/:subjectName", userInfo,  getSubjectAnalysis);

// 7. Page 3 — Topic-wise analysis (good/wrong/unattempted)
router.get("/analysis/topic/:userId/:examName/:subjectName/:topicName", userInfo, getTopicAnalysis);

router.get("/allExamName", allExamName);

export default router;