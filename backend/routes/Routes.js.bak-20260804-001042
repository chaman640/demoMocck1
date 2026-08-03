// routes/Routes.js
import express from "express";

import Blueprint from "../models/bluePrint.js";

import { addQuestion } from "../controllers/addQuestion.js";
import { addUser } from "../controllers/addUser.js";
import { addPerformence } from "../controllers/addPerformence.js";
import { addBluePrint } from "../controllers/addBlluePrient.js";
import { addMocktest } from "../controllers/addMockTest.js";
import { loginUser } from "../controllers/authentication.js";
import { updateUserInfo } from "../controllers/updateSutf.js";
import { allExamName } from "../controllers/allExamName.js";
import { getChallenge } from "../controllers/getChallenge.js";
import { getChallengeAttemptDetail } from "../controllers/getChallengeAttemptDetail.js";

import { createChallenge } from "../controllers/createChallenge.js";
import { submitChallenge } from "../controllers/submitChallenge.js";
import { getChallengeLeaderboard } from "../controllers/getChallengeLeaderboard.js";
import { getMyChallenges } from "../controllers/getMyChallenges.js";

// Rank Predictor
import { addRankPredictorData } from "../controllers/addRankPredictorData.js";
import { predictRank } from "../controllers/predictRank.js";
import { getRankPredictorData } from "../controllers/getRankPredictorData.js";

// Previous Year Test
import { addPreviousYearTest } from "../controllers/addPreviousYearTest.js";
import { getAllPreviousYearTests } from "../controllers/getAllPreviousYearTests.js";
import { getPreviousYearTest } from "../controllers/getPreviousYearTest.js";
import { submitPreviousYearTest } from "../controllers/submitPreviousYearTest.js";
import { getPreviousYearAttemptDetail } from "../controllers/getPreviousYearAttemptDetail.js";

// Current Affairs
import { addCurrentAffair } from "../controllers/addCurrentAffair.js";
import { addCurrentAffairQuiz } from "../controllers/addCurrentAffairQuiz.js";
import { getCurrentAffair, getCurrentAffairDates } from "../controllers/getCurrentAffair.js";
import { getCurrentAffairQuiz } from "../controllers/getCurrentAffairQuiz.js";
import { submitCurrentAffairQuiz } from "../controllers/submitCurrentAffairQuiz.js";
import { getCurrentAffairAttemptDetail } from "../controllers/getCurrentAffairAttemptDetail.js";

// ── Middleware ────────────────────────────────
import { processQuestionMiddleware } from "../middlewares/processQuestion.js";
import { userInfo } from "../middlewares/userInfo.js";
import { adminOnly } from "../middlewares/adminOnly.js"; // 👈 NAYA

// ── Teacher ───────────────────────────────────
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

import { redeemCoupon } from "../controllers/redeemCoupon.js";
import { getMyBatch } from "../controllers/getMyBatch.js";

// ── Analysis (student) ────────────────────────
import {
  getAllAnalysis1stPage,
  getPerformanceAnalysis,
  getSubjectAnalysis,
  getTopicAnalysis,
  getUserMockTests,
} from "../pages/user/analysicUser.js";
import { logoutUser } from "../controllers/logoutUser.js";
import { hideQuestion } from "../controllers/hideQuestion.js";

import { processTeacherQuestionMiddleware } from "../middlewares/processTeacherQuestion.js";
import { addTeacherQuestion } from "../controllers/addTeacherQuestion.js";
import { createPreviousYearPaperShell } from "../controllers/createPreviousYearPaperShell.js";
import { fillPreviousYearPaperSubject } from "../controllers/fillPreviousYearPaperSubject.js";
import { createCustomTest } from "../controllers/createCustomTest.js";

import { getAllCustomTests } from "../controllers/getAllCustomTests.js";
import { getCustomTest } from "../controllers/getCustomTest.js";
import { submitCustomTest } from "../controllers/submitCustomTest.js";
import { getCustomTestAttemptDetail } from "../controllers/getCustomTestAttemptDetail.js";
import { searchStudentByPhone } from "../controllers/searchStudentByPhone.js";
import {
  getStudentOverview,
  getStudentMockDetail,
  getStudentSubjectAnalysis,
  getStudentTopicAnalysis,
} from "../pages/teacher/analysisTeacher.js";
import { getClassTopicAnalysis } from "../controllers/getClassTopicAnalysis.js";
import { getClassQuestionAnalysis } from "../controllers/getClassQuestionAnalysis.js";

import { getTeacherDashboard } from "../controllers/getTeacherDashboard.js";
import { logoutTeacher } from "../controllers/logoutTeacher.js";
import { getTeacherPYQPapers } from "../controllers/getTeacherPYQPapers.js";
import { getTeacherPYQPaperById } from "../controllers/getTeacherPYQPaperById.js";
import { getTeacherCustomTests } from "../controllers/getTeacherCustomTests.js";

import { sendSignupOtp } from "../controllers/sendSignupOtp.js";
import { requestResetOtp } from "../controllers/requestResetOtp.js";
import { resetPassword } from "../controllers/resetPassword.js";

const router = express.Router();

// ═════════════════════════════════════════════
// PUBLIC AUTH ROUTES (student)
// ═════════════════════════════════════════════
// 🐛 CRITICAL FIX: frontend (Singup.jsx) `/signup` pe POST karta tha lekin
// backend pe sirf `/add-user` tha → student signup HAMESHA 404 deta tha.
// Ab dono naam kaam karte hain, taaki purani/nayi dono frontend build chale.
router.post("/signup", addUser);
router.post("/add-user", addUser);

router.post("/user-Login", loginUser);
router.post("/user-login", loginUser); // case-safe alias
router.post("/logout", logoutUser);

router.post("/send-signup-otp", sendSignupOtp);
router.post("/request-reset-otp", requestResetOtp);
router.post("/reset-password", resetPassword);

router.get("/allExamName", allExamName);

// ═════════════════════════════════════════════
// ADMIN-ONLY ROUTES
// 🔒 SECURITY FIX: ye sab pehle bilkul khule the — koi bhi banda internet se
// aapke DB mein questions/papers/blueprints daal sakta tha.
// ═════════════════════════════════════════════
router.post("/add-question", adminOnly, processQuestionMiddleware, addQuestion);
router.post("/add-bluePrint", adminOnly, addBluePrint);
router.post("/add-rank-predictor-data", adminOnly, addRankPredictorData);
router.post("/add-previous-year-test", adminOnly, addPreviousYearTest);
router.post("/add-current-affair", adminOnly, addCurrentAffair);
router.post("/add-current-affair-quiz", adminOnly, addCurrentAffairQuiz);

// ═════════════════════════════════════════════
// STUDENT ROUTES (login zaroori)
// ═════════════════════════════════════════════
router.get("/me", userInfo, (req, res) => {
  res.status(200).json({ success: true, data: req.user });
});

router.get("/is-admin", userInfo, (req, res) => {
  const isAdminUser =
    !!process.env.ADMIN_EMAIL &&
    req.user.email === process.env.ADMIN_EMAIL.toLowerCase().trim();
  res.status(200).json({ success: true, isAdmin: isAdminUser });
});

router.post("/user-update", userInfo, updateUserInfo);

router.get("/blueprints/:examName", userInfo, async (req, res) => {
  try {
    const { examName } = req.params;
    const blueprints = await Blueprint.find({ examName });
    res.status(200).json({ success: true, data: blueprints });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Blueprints fetch karne mein error aaya",
      error: error.message,
    });
  }
});

router.post("/generate-mock", userInfo, addMocktest);
// 🔒 SECURITY FIX: pehle ye route BINA login ke tha aur body ka userId trust
// karta tha — koi bhi kisi ke naam pe fake performance daal sakta tha.
router.post("/add-performence", userInfo, addPerformence);

// ── Analysis (student) ──
router.get("/analysis/mock-list/:userId/:examName", userInfo, getUserMockTests);
router.get("/analysis/overview/:userId/:examName", userInfo, getAllAnalysis1stPage);
router.get("/analysis/mock-detail/:performanceId", userInfo, getPerformanceAnalysis);
router.get("/analysis/subject/:userId/:examName/:subjectName", userInfo, getSubjectAnalysis);
router.get("/analysis/topic/:userId/:examName/:subjectName/:topicName", userInfo, getTopicAnalysis);
router.post("/analysis/hide-question", userInfo, hideQuestion);

// ── Challenge ──
router.post("/create-challenge", userInfo, createChallenge);
// ⚠️ ORDER: "/leaderboard" aur "/my-attempt" wale routes generic
// "/challenge/:challengeCode" se PEHLE aane chahiye.
router.get("/challenge/:challengeCode/leaderboard", userInfo, getChallengeLeaderboard);
router.get("/challenge/:challengeCode/my-attempt", userInfo, getChallengeAttemptDetail);
router.post("/challenge/:challengeCode/submit", userInfo, submitChallenge);
router.get("/challenge/:challengeCode", userInfo, getChallenge);
router.get("/my-challenges", userInfo, getMyChallenges);

// ── Rank Predictor ──
router.get("/rank-predictor-data/:examName", userInfo, getRankPredictorData);
router.get("/rank-predictor/:examName", userInfo, predictRank);

// ── Previous Year Tests ──
router.get("/previous-year-tests/:examName", userInfo, getAllPreviousYearTests);
router.get("/previous-year-attempt/:attemptId", userInfo, getPreviousYearAttemptDetail);
router.post("/previous-year-test/:testId/submit", userInfo, submitPreviousYearTest);
router.get("/previous-year-test/:testId", userInfo, getPreviousYearTest);

// ── Custom Tests (student) ──
router.get("/custom-test-attempt/:attemptId", userInfo, getCustomTestAttemptDetail);
router.get("/custom-tests/:examName", userInfo, getAllCustomTests);
router.post("/custom-test/:testId/submit", userInfo, submitCustomTest);
router.get("/custom-test/:testId", userInfo, getCustomTest);

// ── Current Affairs ──
// ⚠️ ORDER: "/dates" pehle, warna ":date" usko match kar leta hai
router.get("/current-affair/:examName/dates", userInfo, getCurrentAffairDates);
router.get("/current-affair/:examName/:date", userInfo, getCurrentAffair);
router.get("/current-affair/:examName", userInfo, getCurrentAffair);

router.get("/current-affair-quiz/:examName/:date/my-attempt", userInfo, getCurrentAffairAttemptDetail);
router.post("/current-affair-quiz/:examName/:date/submit", userInfo, submitCurrentAffairQuiz);
router.get("/current-affair-quiz/:examName/:date", userInfo, getCurrentAffairQuiz);

// ── Batch / Coupon (student) ──
router.post("/redeem-coupon", userInfo, redeemCoupon);
router.get("/my-batch", userInfo, getMyBatch);

// ═════════════════════════════════════════════
// TEACHER ROUTES
// ═════════════════════════════════════════════
router.post("/teacher-signup", addTeacher);
router.post("/teacher-login", loginTeacher);
router.post("/teacher-logout", logoutTeacher);
router.post("/accept-invite", acceptInvite); // PUBLIC — invite link se aata hai

router.get("/teacher-me", teacherInfo, (req, res) => {
  res.status(200).json({ success: true, data: req.teacher });
});

router.get("/teacher/dashboard", teacherInfo, getTeacherDashboard);

// ── Coupons / group ──
router.post("/create-coupon", teacherInfo, createCoupon);
router.get("/my-coupons", teacherInfo, getMyCoupons);
router.post("/switch-active-coupon", teacherInfo, switchActiveCoupon);

// ── Sub-teachers ──
router.post("/invite-sub-teacher", teacherInfo, inviteSubTeacher);
router.get("/my-sub-teachers", teacherInfo, getMySubTeachers);
router.post("/remove-sub-teacher/:subTeacherId", teacherInfo, removeSubTeacher);
router.post("/manage-coupon-access/assign", teacherInfo, assignCouponAccess);
router.post("/manage-coupon-access/revoke", teacherInfo, revokeCouponAccess);

// ── Content ──
router.post(
  "/teacher/add-question",
  teacherInfo,
  processTeacherQuestionMiddleware,
  addTeacherQuestion
);

router.post("/teacher/previous-year-paper/create-shell", teacherInfo, createPreviousYearPaperShell);
router.post("/teacher/previous-year-paper/:paperId/fill-subject", teacherInfo, fillPreviousYearPaperSubject);
// ⚠️ ORDER: "/list" generic ":paperId" se pehle
router.get("/teacher/previous-year-paper/list", teacherInfo, getTeacherPYQPapers);
router.get("/teacher/previous-year-paper/:paperId", teacherInfo, getTeacherPYQPaperById);

router.post("/teacher/custom-test/create", teacherInfo, createCustomTest);
router.get("/teacher/custom-test/list", teacherInfo, getTeacherCustomTests);

// ── Students / analysis (teacher) ──
router.get("/teacher/search-student", teacherInfo, searchStudentByPhone);
router.get("/teacher/analysis/overview/:studentId/:examName", teacherInfo, getStudentOverview);
router.get("/teacher/analysis/mock-detail/:studentId/:performanceId", teacherInfo, getStudentMockDetail);
router.get("/teacher/analysis/subject/:studentId/:examName/:subjectName", teacherInfo, getStudentSubjectAnalysis);
router.get("/teacher/analysis/topic/:studentId/:examName/:subjectName/:topicName", teacherInfo, getStudentTopicAnalysis);
router.get("/teacher/class-analysis/topics", teacherInfo, getClassTopicAnalysis);
router.get("/teacher/class-analysis/questions/:subjectName/:topicName", teacherInfo, getClassQuestionAnalysis);

export default router;
