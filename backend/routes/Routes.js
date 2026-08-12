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
import { adminOnly } from "../middlewares/adminOnly.js";

// 🔒 NAYA (Round 1): rate limiters — poora explanation
// middlewares/rateLimiters.js mein hai.
import {
  otpLimiter,
  otpIpLimiter,
  loginLimiter,
  loginEmailLimiter,
  loginIpLimiter,
  signupLimiter,
  signupIpLimiter,
  adminLimiter,
  writeLimiter,
} from "../middlewares/rateLimiters.js";

// multipart (image wale) requests ke liye — multer ke BAAD dobara sanitize.
// Wajah middlewares/sanitize.js ke comment me likhi hai.
import { sanitizeBody } from "../middlewares/sanitize.js";

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

import { getTeacherSubjects } from "../controllers/getTeacherSubjects.js";
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
//
// 🔒 Round 1: har public route pe rate limit lag gaya hai. Ye woh routes hain
// jinhe internet pe koi bhi bina login ke maar sakta hai — isliye yahi sabse
// pehle abuse hote hain (fake signup, password brute force, OTP se paisa
// jalana). Ab har IP/number ki ginti hoti hai.
// ═════════════════════════════════════════════
// 🐛 CRITICAL FIX (pehle wale round se): frontend `/signup` pe POST karta tha
// lekin backend pe sirf `/add-user` tha → student signup HAMESHA 404 deta tha.
router.post("/signup", signupIpLimiter, signupLimiter, addUser);
router.post("/add-user", signupIpLimiter, signupLimiter, addUser);

router.post("/user-Login", loginIpLimiter, loginLimiter, loginEmailLimiter, loginUser);
router.post("/user-login", loginIpLimiter, loginLimiter, loginEmailLimiter, loginUser); // case-safe alias
router.post("/logout", logoutUser);

// OTP = asli paisa. Do limit lagti hain: ek number pe, ek IP pe.
router.post("/send-signup-otp", otpIpLimiter, otpLimiter, sendSignupOtp);
router.post("/request-reset-otp", otpIpLimiter, otpLimiter, requestResetOtp);
// 6-digit OTP guess karne ki koshish yahin ruk jaayegi
router.post("/reset-password", signupIpLimiter, signupLimiter, resetPassword);

router.get("/allExamName", allExamName);

// adminLimiter, adminOnly,
// ═════════════════════════════════════════════
router.post("/add-question", adminLimiter, adminOnly, processQuestionMiddleware, sanitizeBody, addQuestion);
router.post("/add-bluePrint",  addBluePrint);
router.post("/add-rank-predictor-data", adminLimiter, adminOnly, addRankPredictorData);
router.post("/add-previous-year-test", adminLimiter, adminOnly, addPreviousYearTest);
router.post("/add-current-affair", adminLimiter, adminOnly, addCurrentAffair);
router.post("/add-current-affair-quiz", adminLimiter, adminOnly, addCurrentAffairQuiz);

// ═════════════════════════════════════════════
// STUDENT ROUTES (login zaroori)
// ═════════════════════════════════════════════
router.get("/me", userInfo, (req, res) => {
  res.status(200).json({ success: true, data: req.user });
});

router.get("/is-admin", userInfo, (req, res) => {
  // 🔧 Round 1: dono taraf lowercase. Pehle sirf env wali value lowercase hoti
  // thi — purana account jiska email DB me "Anuj@Gmail.com" tarah save hai,
  // wo kabhi admin match hi nahi karta tha (aur koi hint bhi nahi milta tha).
  const configuredEmail = String(process.env.ADMIN_EMAIL || "").toLowerCase().trim();
  const isAdminUser =
    !!configuredEmail && String(req.user.email || "").toLowerCase().trim() === configuredEmail;
  res.status(200).json({ success: true, isAdmin: isAdminUser });
});

router.post("/user-update", userInfo, writeLimiter, updateUserInfo);

router.get("/blueprints/:examName", userInfo, async (req, res) => {
  try {
    const { examName } = req.params;
    const blueprints = await Blueprint.find({ examName });
    res.status(200).json({ success: true, data: blueprints });
  } catch (error) {
    console.error("blueprints error:", error);
    res.status(500).json({
      success: false,
      message: "Blueprints fetch karne mein error aaya",
      // 🔒 Round 1: production me asli error message bahar nahi jata —
      // usme model/field ke naam hote hain jo attacker ke kaam aate hain.
      ...(process.env.NODE_ENV === "production" ? {} : { error: error.message }),
    });
  }
});

// generate-mock DB pe sabse bhaari kaam hai (random questions nikalna),
// isliye ispe writeLimiter zaroori hai
router.post("/generate-mock", userInfo, writeLimiter, addMocktest);
// 🔒 SECURITY FIX: pehle ye route BINA login ke tha aur body ka userId trust
// karta tha — koi bhi kisi ke naam pe fake performance daal sakta tha.
router.post("/add-performence", userInfo, writeLimiter, addPerformence);

// ── Analysis (student) ──
router.get("/analysis/mock-list/:userId/:examName", userInfo, getUserMockTests);
router.get("/analysis/overview/:userId/:examName", userInfo, getAllAnalysis1stPage);
router.get("/analysis/mock-detail/:performanceId", userInfo, getPerformanceAnalysis);
router.get("/analysis/subject/:userId/:examName/:subjectName", userInfo, getSubjectAnalysis);
router.get("/analysis/topic/:userId/:examName/:subjectName/:topicName", userInfo, getTopicAnalysis);
router.post("/analysis/hide-question", userInfo, writeLimiter, hideQuestion);

// ── Challenge ──
router.post("/create-challenge", userInfo, writeLimiter, createChallenge);
// ⚠️ ORDER: "/leaderboard" aur "/my-attempt" wale routes generic
// "/challenge/:challengeCode" se PEHLE aane chahiye.
router.get("/challenge/:challengeCode/leaderboard", userInfo, getChallengeLeaderboard);
router.get("/challenge/:challengeCode/my-attempt", userInfo, getChallengeAttemptDetail);
router.post("/challenge/:challengeCode/submit", userInfo, writeLimiter, submitChallenge);
router.get("/challenge/:challengeCode", userInfo, getChallenge);
router.get("/my-challenges", userInfo, getMyChallenges);

// ── Rank Predictor ──
router.get("/rank-predictor-data/:examName", userInfo, getRankPredictorData);
router.get("/rank-predictor/:examName", userInfo, predictRank);

// ── Previous Year Tests ──
router.get("/previous-year-tests/:examName", userInfo, getAllPreviousYearTests);
router.get("/previous-year-attempt/:attemptId", userInfo, getPreviousYearAttemptDetail);
router.post("/previous-year-test/:testId/submit", userInfo, writeLimiter, submitPreviousYearTest);
router.get("/previous-year-test/:testId", userInfo, getPreviousYearTest);

// ── Custom Tests (student) ──
router.get("/custom-test-attempt/:attemptId", userInfo, getCustomTestAttemptDetail);
router.get("/custom-tests/:examName", userInfo, getAllCustomTests);
router.post("/custom-test/:testId/submit", userInfo, writeLimiter, submitCustomTest);
router.get("/custom-test/:testId", userInfo, getCustomTest);

// ── Current Affairs ──
// ⚠️ ORDER: "/dates" pehle, warna ":date" usko match kar leta hai
router.get("/current-affair/:examName/dates", userInfo, getCurrentAffairDates);
router.get("/current-affair/:examName/:date", userInfo, getCurrentAffair);
router.get("/current-affair/:examName", userInfo, getCurrentAffair);

router.get("/current-affair-quiz/:examName/:date/my-attempt", userInfo, getCurrentAffairAttemptDetail);
router.post("/current-affair-quiz/:examName/:date/submit", userInfo, writeLimiter, submitCurrentAffairQuiz);
router.get("/current-affair-quiz/:examName/:date", userInfo, getCurrentAffairQuiz);

// ── Batch / Coupon (student) ──
// coupon code guess karne ki koshish yahin ruk jaayegi
router.post("/redeem-coupon", userInfo, writeLimiter, redeemCoupon);
router.get("/my-batch", userInfo, getMyBatch);

// ═════════════════════════════════════════════
// TEACHER ROUTES
// ═════════════════════════════════════════════
router.post("/teacher-signup", signupIpLimiter, signupLimiter, addTeacher);
router.post("/teacher-login", loginIpLimiter, loginLimiter, loginEmailLimiter, loginTeacher);
router.post("/teacher-logout", logoutTeacher);
// PUBLIC — invite link se aata hai, isliye limit zaroori hai
router.post("/accept-invite", signupIpLimiter, signupLimiter, acceptInvite);

router.get("/teacher-me", teacherInfo, (req, res) => {
  res.status(200).json({ success: true, data: req.teacher });
});

router.get("/teacher/dashboard", teacherInfo, getTeacherDashboard);

// ── Coupons / group ──
router.post("/create-coupon", teacherInfo, writeLimiter, createCoupon);
router.get("/my-coupons", teacherInfo, getMyCoupons);
router.post("/switch-active-coupon", teacherInfo, switchActiveCoupon);

// ── Sub-teachers ──
router.post("/invite-sub-teacher", teacherInfo, writeLimiter, inviteSubTeacher);
router.get("/my-sub-teachers", teacherInfo, getMySubTeachers);
router.post("/remove-sub-teacher/:subTeacherId", teacherInfo, writeLimiter, removeSubTeacher);
router.post("/manage-coupon-access/assign", teacherInfo, writeLimiter, assignCouponAccess);
router.post("/manage-coupon-access/revoke", teacherInfo, writeLimiter, revokeCouponAccess);

// ── Subject suggestions ──
// subject ka naam haath se type karne ki wajah se spelling galtiyan hoti thi
// (aur poore flow chup-chaap toot jate the). Ab frontend yahan se list mangwata hai.
router.get("/teacher/subjects", teacherInfo, getTeacherSubjects);

// ── Content ──
router.post(
  "/teacher/add-question",
  teacherInfo,
  writeLimiter,
  processTeacherQuestionMiddleware,
  sanitizeBody, // 👈 multer ke baad — multipart field "subjectName[$ne]" jaisi chaal rokta hai
  addTeacherQuestion
);

router.post("/teacher/previous-year-paper/create-shell", teacherInfo, writeLimiter, createPreviousYearPaperShell);
router.post("/teacher/previous-year-paper/:paperId/fill-subject", teacherInfo, writeLimiter, fillPreviousYearPaperSubject);
// ⚠️ ORDER: "/list" generic ":paperId" se pehle
router.get("/teacher/previous-year-paper/list", teacherInfo, getTeacherPYQPapers);
router.get("/teacher/previous-year-paper/:paperId", teacherInfo, getTeacherPYQPaperById);

router.post("/teacher/custom-test/create", teacherInfo, writeLimiter, createCustomTest);
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
