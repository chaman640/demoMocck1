// routes/Routes.js
import express from "express";


import Blueprint from "../models/bluePrint.js";

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

// Rank Predictor ke controllers
import { addRankPredictorData } from "../controllers/addRankPredictorData.js";
import { predictRank } from "../controllers/predictRank.js";
import { getRankPredictorData } from "../controllers/getRankPredictorData.js";

// 👇 NAYA: Previous Year Test ke controllers
import { addPreviousYearTest } from "../controllers/addPreviousYearTest.js";
import { getAllPreviousYearTests } from "../controllers/getAllPreviousYearTests.js";
import { getPreviousYearTest } from "../controllers/getPreviousYearTest.js";
import { submitPreviousYearTest } from "../controllers/submitPreviousYearTest.js";
import { getPreviousYearAttemptDetail } from "../controllers/getPreviousYearAttemptDetail.js";

// imports ke sath (upar)
import { addCurrentAffair } from "../controllers/addCurrentAffair.js";
import { addCurrentAffairQuiz } from "../controllers/addCurrentAffairQuiz.js";
import { getCurrentAffair, getCurrentAffairDates } from "../controllers/getCurrentAffair.js";
import { getCurrentAffairQuiz } from "../controllers/getCurrentAffairQuiz.js";
import { submitCurrentAffairQuiz } from "../controllers/submitCurrentAffairQuiz.js";
import { getCurrentAffairAttemptDetail } from "../controllers/getCurrentAffairAttemptDetail.js";

// ── Middleware ────────────────────────────────
import { processQuestionMiddleware } from "../middlewares/processQuestion.js";
import { userInfo } from "../middlewares/userInfo.js";

import { addTeacher } from "../controllers/addTeacher.js";
import { loginTeacher } from "../controllers/teacherAuthentication.js";
import { teacherInfo } from "../middlewares/teacherInfo.js";

import { createCoupon } from "../controllers/createCoupon.js";
import { getMyCoupons } from "../controllers/getMyCoupons.js";

import { inviteSubTeacher } from "../controllers/inviteSubTeacher.js";
import { acceptInvite } from "../controllers/acceptInvite.js";

import { getMySubTeachers } from "../controllers/getMySubTeachers.js";
import { removeSubTeacher } from "../controllers/removeSubTeacher.js";
import { assignCouponAccess, revokeCouponAccess } from "../controllers/manageCouponAccess.js";
import { switchActiveCoupon } from "../controllers/switchActiveCoupon.js";

// ── Analysis functions ────────────────────────
import {
  getAllAnalysis1stPage,   
  getPerformanceAnalysis,  
  getSubjectAnalysis,      
  getTopicAnalysis,        
  getUserMockTests,        
} from "../pages/user/analysicUser.js";
import { logoutUser } from "../controllers/logoutUser.js";
import { hideQuestion } from "../controllers/hideQuestion.js";

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

// Admin is route se rank-predictor ka reference data feed karega
router.post("/add-rank-predictor-data", addRankPredictorData);

// 👇 NAYA: Admin is route se poora Previous Year Test (paper + sab questions) add karega
router.post("/add-previous-year-test", addPreviousYearTest);
router.post("/previous-year-test/:testId/submit", userInfo, submitPreviousYearTest);


router.post("/add-current-affair", addCurrentAffair);
router.post("/add-current-affair-quiz", addCurrentAffairQuiz);
router.post("/logout", logoutUser);
router.post("/analysis/hide-question", userInfo, hideQuestion);


router.post("/teacher-signup", addTeacher);
router.post("/teacher-login", addTeacher);

router.post("/create-coupon", teacherInfo, createCoupon);

router.post("/invite-sub-teacher", teacherInfo, inviteSubTeacher); // sirf Main Teacher call kar sakta hai
router.post("/accept-invite", acceptInvite); // PUBLIC — koi login nahi chahiye

router.post("/remove-sub-teacher/:subTeacherId", teacherInfo, removeSubTeacher);
router.post("/manage-coupon-access/assign", teacherInfo, assignCouponAccess);
router.post("/manage-coupon-access/revoke", teacherInfo, revokeCouponAccess);
router.post("/switch-active-coupon", teacherInfo, switchActiveCoupon);

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

router.get("/teacher-me", teacherInfo, (req, res) => {
  res.status(200).json({ success: true, data: req.teacher });
});

router.get("/analysis/mock-list/:userId/:examName", userInfo, getUserMockTests);
router.get("/analysis/overview/:userId/:examName", userInfo,   getAllAnalysis1stPage);
router.get("/analysis/mock-detail/:performanceId", userInfo,   getPerformanceAnalysis);
router.get("/analysis/subject/:userId/:examName/:subjectName", userInfo,  getSubjectAnalysis);
router.get("/analysis/topic/:userId/:examName/:subjectName/:topicName", userInfo, getTopicAnalysis);

router.get("/allExamName", allExamName);

router.get("/challenge/:challengeCode/leaderboard", getChallengeLeaderboard);
router.get("/challenge/:challengeCode", userInfo, getChallenge);
router.get("/challenge/:challengeCode/my-attempt", userInfo, getChallengeAttemptDetail);
router.get("/my-challenges", userInfo, getMyChallenges);

// Rank Predictor ke GET routes
router.get("/rank-predictor/:examName", userInfo, predictRank);
router.get("/rank-predictor-data/:examName", getRankPredictorData);

// 👇 NAYA: Previous Year Test ke GET routes
router.get("/previous-year-tests/:examName", userInfo, getAllPreviousYearTests);
router.get("/previous-year-test/:testId", userInfo, getPreviousYearTest);
router.get("/previous-year-attempt/:attemptId", userInfo, getPreviousYearAttemptDetail);


// GET routes ke sath — IMPORTANT: /dates wala route pehle aana chahiye
// warna ":date" param usko match kar lega aur wrong controller chalega
router.get("/current-affair/:examName/dates", userInfo, getCurrentAffairDates);
router.get("/current-affair/:examName/:date", userInfo, getCurrentAffair);
router.get("/current-affair/:examName", userInfo, getCurrentAffair);

router.get("/current-affair-quiz/:examName/:date/my-attempt", userInfo, getCurrentAffairAttemptDetail);
router.get("/current-affair-quiz/:examName/:date", userInfo, getCurrentAffairQuiz);
router.post("/current-affair-quiz/:examName/:date/submit", userInfo, submitCurrentAffairQuiz);

router.get("/my-coupons", teacherInfo, getMyCoupons);

router.get("/my-sub-teachers", teacherInfo, getMySubTeachers);

export default router;