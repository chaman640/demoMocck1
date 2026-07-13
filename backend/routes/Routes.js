// routes/Routes.js
import express from "express";

// ── Models ────────────────────────────────────
import Blueprint from "../models/bluePrint.js";

// ── Controllers ──────────────────────────────
import { addQuestion }    from "../controllers/addQuestion.js";
import { addUser }        from "../controllers/addUser.js";
import { addPerformence } from "../controllers/addPerformence.js";
import { addBluePrint }   from "../controllers/addBlluePrient.js"; 
import { addMocktest }    from "../controllers/addMockTest.js";
import { loginUser } from "../controllers/authentication.js";
import { updateUserInfo } from "../controllers/updateSutf.js";
import { allExamName } from "../controllers/allExamName.js";
import { getChallenge } from "../controllers/getChallenge.js";
import { getChallengeAttemptDetail } from "../controllers/getChallengeAttemptDetail.js";

import { createChallenge } from "../controllers/createChallenge.js";
import { submitChallenge } from "../controllers/submitChallenge.js";
import { getChallengeLeaderboard } from "../controllers/getChallengeLeaderboard.js";

// 👇 NAYA: Question Bank Review (admin-only) ke controllers
import { getQuestionMeta } from "../controllers/getQuestionMeta.js";
import { getQuestionList } from "../controllers/getQuestionList.js";

// ── Middleware ────────────────────────────────
import { processQuestionMiddleware } from "../middlewares/processQuestion.js";
import { userInfo } from "../middlewares/userInfo.js";
import { isAdmin } from "../middlewares/isAdmin.js"; // 👈 NAYA

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

router.post("/create-challenge", userInfo, createChallenge);
router.post("/challenge/:challengeCode/submit", userInfo, submitChallenge);

// ─────────────────────────────────────────────
// GET ROUTES 
// ─────────────────────────────────────────────

router.get("/me", userInfo, (req, res) => {
    res.status(200).json({ success: true, data: req.user });
});

// 👇 NAYA: Frontend ko batata hai current user admin hai ya nahi —
// isse HomePage pe "Question Review" button sirf admin ko dikhega
router.get("/is-admin", userInfo, (req, res) => {
    const isAdminUser = !!process.env.ADMIN_EMAIL && req.user.email === process.env.ADMIN_EMAIL;
    res.status(200).json({ success: true, isAdmin: isAdminUser });
});

router.get("/blueprints/:examName", userInfo, async (req, res) => {
    try {
        const { examName } = req.params;
        const blueprints = await Blueprint.find({ examName });
        
        res.status(200).json({ success: true, data: blueprints });
    } catch (error) {
        res.status(500).json({ success: false, message: "Blueprints fetch karne mein error aaya", error: error.message });
    }
});

router.get("/analysis/mock-list/:userId/:examName",    getUserMockTests);
router.get("/analysis/overview/:userId/:examName", userInfo,   getAllAnalysis1stPage);
router.get("/analysis/mock-detail/:performanceId", userInfo,   getPerformanceAnalysis);
router.get("/analysis/subject/:userId/:examName/:subjectName", userInfo,  getSubjectAnalysis);
router.get("/analysis/topic/:userId/:examName/:subjectName/:topicName", userInfo, getTopicAnalysis);

router.get("/allExamName", allExamName);

router.get("/challenge/:challengeCode/leaderboard", getChallengeLeaderboard);
router.get("/challenge/:challengeCode", userInfo, getChallenge);
router.get("/challenge/:challengeCode/my-attempt", userInfo, getChallengeAttemptDetail);

// 👇 NAYA: Question Bank Review routes — dono admin-only hain (userInfo + isAdmin)
// kyunki inmein correctOption bhi hota hai, jo normal students ko nahi dikhna chahiye
router.get("/questions/meta/:examName", userInfo, isAdmin, getQuestionMeta);
router.get("/questions/list/:examName/:subjectName/:topicName", userInfo, isAdmin, getQuestionList);

export default router;