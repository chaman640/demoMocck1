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
import { getMyChallenges } from "../controllers/getMyChallenges.js";

// 👇 NAYA: Rank Predictor ke controllers
import { addRankPredictorData } from "../controllers/addRankPredictorData.js";
import { predictRank } from "../controllers/predictRank.js";
import { getRankPredictorData } from "../controllers/getRankPredictorData.js";

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

router.post("/create-challenge", userInfo, createChallenge);
router.post("/challenge/:challengeCode/submit", userInfo, submitChallenge);

// 👇 NAYA: Admin is route se rank-predictor ka reference data feed karega
router.post("/add-rank-predictor-data", addRankPredictorData);

// ─────────────────────────────────────────────
// GET ROUTES 
// ─────────────────────────────────────────────

router.get("/me", userInfo, (req, res) => {
    res.status(200).json({ success: true, data: req.user });
});

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
router.get("/my-challenges", userInfo, getMyChallenges);

// 👇 NAYA: Rank Predictor ke GET routes
// Score query param se aayega: /rank-predictor/UP%20Police%20Constable?score=145
router.get("/rank-predictor/:examName", userInfo, predictRank);
// Data availability check karne ke liye (frontend button dikhana/chupana)
router.get("/rank-predictor-data/:examName", getRankPredictorData);

export default router;