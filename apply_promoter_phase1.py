import re

def patch(path, old, new, label):
    try:
        with open(path, "r", encoding="utf-8") as f:
            content = f.read()
    except FileNotFoundError:
        print(f"WARNING [{label}]: file not found: {path} — SKIPPED")
        return
    if old not in content:
        print(f"WARNING [{label}]: anchor text not found in {path} — SKIPPED (file may have changed, needs manual check)")
        return
    if content.count(old) > 1:
        print(f"WARNING [{label}]: anchor text found MORE THAN ONCE in {path} — SKIPPED (ambiguous, needs manual check)")
        return
    content = content.replace(old, new)
    with open(path, "w", encoding="utf-8") as f:
        f.write(content)
    print(f"OK [{label}]: patched {path}")


def full_replace_if_matches(path, expected_old_full, new_full, label):
    try:
        with open(path, "r", encoding="utf-8") as f:
            content = f.read()
    except FileNotFoundError:
        print(f"WARNING [{label}]: file not found: {path} — SKIPPED")
        return
    if content.strip() != expected_old_full.strip():
        print(f"WARNING [{label}]: {path} content does not match expected — SKIPPED (file changed since last check, needs manual merge)")
        return
    with open(path, "w", encoding="utf-8") as f:
        f.write(new_full)
    print(f"OK [{label}]: rewrote {path}")


# ─────────────────────────────────────────────
# 1. models/User.js — add promoter field
# ─────────────────────────────────────────────
patch(
    "backend/models/User.js",
    '''        leftAt: { type: Date, default: null }, // null = abhi bhi active
      },
    ],
  },
  {
    timestamps: true,
  }
);''',
    '''        leftAt: { type: Date, default: null }, // null = abhi bhi active
      },
    ],

    promoter: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Promoter",
      default: null,
    },
  },
  {
    timestamps: true,
  }
);''',
    "User.js: promoter field",
)

# ─────────────────────────────────────────────
# 2. models/Teacher.js — add commission fields
# ─────────────────────────────────────────────
patch(
    "backend/models/Teacher.js",
    '''    activeCoupon: { type: mongoose.Schema.Types.ObjectId, ref: "Coupon", default: null },
    coupons: [{ type: mongoose.Schema.Types.ObjectId, ref: "Coupon" }],
  },
  { timestamps: true }
);''',
    '''    activeCoupon: { type: mongoose.Schema.Types.ObjectId, ref: "Coupon", default: null },
    coupons: [{ type: mongoose.Schema.Types.ObjectId, ref: "Coupon" }],

    pendingQuestionsCount: { type: Number, default: 0 },
    totalQuestionsAllTime: { type: Number, default: 0 },
    paymentHistory: [
      {
        amount: { type: Number, required: true },
        questionsSettled: { type: Number, required: true },
        settledAt: { type: Date, default: Date.now },
        note: { type: String, trim: true, default: "" },
      },
    ],
  },
  { timestamps: true }
);''',
    "Teacher.js: commission fields",
)

# ─────────────────────────────────────────────
# 3. controllers/createCoupon.js — cross-check Promoter codes too
# ─────────────────────────────────────────────
patch(
    "backend/controllers/createCoupon.js",
    'import Coupon from "../models/Coupon.js";',
    'import Coupon from "../models/Coupon.js";\nimport Promoter from "../models/Promoter.js";',
    "createCoupon.js: import Promoter",
)

patch(
    "backend/controllers/createCoupon.js",
    '''    while (!isUnique && attempts < 5) {
      code = generateCouponCode();
      const existing = await Coupon.findOne({ code });
      if (!existing) isUnique = true;
      attempts++;
    }''',
    '''    while (!isUnique && attempts < 5) {
      code = generateCouponCode();
      const [existing, existingPromoter] = await Promise.all([
        Coupon.findOne({ code }),
        Promoter.findOne({ code }),
      ]);
      if (!existing && !existingPromoter) isUnique = true;
      attempts++;
    }''',
    "createCoupon.js: cross-check Promoter codes",
)

# ─────────────────────────────────────────────
# 4. utils/mailer.js — add sendPromoterCredentialsEmail
# ─────────────────────────────────────────────
patch(
    "backend/utils/mailer.js",
    '''    text: `Aapko ${roleText} invite kiya gaya hai. Account activate karein: ${link}`,
  });
};''',
    '''    text: `Aapko ${roleText} invite kiya gaya hai. Account activate karein: ${link}`,
  });
};

export const sendPromoterCredentialsEmail = async (toEmail, { name, email, password, loginLink }) => {
  await sendEmail({
    to: toEmail,
    subject: "BatchMock.in par Promoter account ban gaya hai",
    html: wrapTemplate(
      "Aapka Promoter account ban gaya hai",
      `<p style="font-size: 14px; color: #D1D5DB;">${name ? `Namaste ${name},` : "Namaste,"} aapka login niche diya gaya hai.</p>
       <div style="background: #111827; padding: 16px; border-radius: 12px; margin: 12px 0; font-size: 13px; color: #D1D5DB;">
         <div>Email: <strong style="color:#fff;">${email}</strong></div>
         <div>Password: <strong style="color:#fff;">${password}</strong></div>
       </div>
       <a href="${loginLink}" style="display: inline-block; background: #7C3AED; color: #fff; padding: 12px 24px; border-radius: 10px; text-decoration: none; font-weight: 600; margin: 12px 0;">Login Karein</a>
       <p style="font-size: 12px; color: #6B7280;">Pehli baar login karne ke baad apna password badalna zaroori hoga.</p>`
    ),
    text: `Aapka Promoter account ban gaya hai. Email: ${email}, Password: ${password}. Login karein: ${loginLink}`,
  });
};''',
    "mailer.js: sendPromoterCredentialsEmail",
)

# ─────────────────────────────────────────────
# 5. controllers/getTeacherDashboard.js — commission section for main teacher
# ─────────────────────────────────────────────
patch(
    "backend/controllers/getTeacherDashboard.js",
    '''    totalCustomTests,
    coupons: couponBreakdown,
  };
};''',
    '''    totalCustomTests,
    coupons: couponBreakdown,
    commission: {
      pendingQuestionsCount: teacher.pendingQuestionsCount || 0,
      totalQuestionsAllTime: teacher.totalQuestionsAllTime || 0,
      paymentHistory: teacher.paymentHistory || [],
    },
  };
};''',
    "getTeacherDashboard.js: commission section",
)

# ─────────────────────────────────────────────
# 6. Credit questions-attempted on every submit controller
# ─────────────────────────────────────────────
patch(
    "backend/controllers/addPerformence.js",
    '''import Performance from "../models/Performance.js";
import Blueprint from "../models/bluePrint.js";
import { Question } from "../models/rowQuestionSchema.js";''',
    '''import Performance from "../models/Performance.js";
import Blueprint from "../models/bluePrint.js";
import { Question } from "../models/rowQuestionSchema.js";
import { creditQuestionsToCommissionHolders } from "../utils/commissionTracking.js";''',
    "addPerformence.js: import commissionTracking",
)
patch(
    "backend/controllers/addPerformence.js",
    '''    await newPerformance.save();

    // 9. Response''',
    '''    await newPerformance.save();

    await creditQuestionsToCommissionHolders(req.user, correctCount + wrongCount);

    // 9. Response''',
    "addPerformence.js: credit call",
)

patch(
    "backend/controllers/submitCustomTest.js",
    '''import mongoose from "mongoose";
import CustomTest from "../models/CustomTest.js";
import CustomTestAttempt from "../models/CustomTestAttempt.js";''',
    '''import mongoose from "mongoose";
import CustomTest from "../models/CustomTest.js";
import CustomTestAttempt from "../models/CustomTestAttempt.js";
import { creditQuestionsToCommissionHolders } from "../utils/commissionTracking.js";''',
    "submitCustomTest.js: import commissionTracking",
)
patch(
    "backend/controllers/submitCustomTest.js",
    '''    await newAttempt.save();

    return res.status(201).json({
      success: true,
      message: "Custom Test submit ho gaya!",''',
    '''    await newAttempt.save();

    await creditQuestionsToCommissionHolders(req.user, correctCount + wrongCount);

    return res.status(201).json({
      success: true,
      message: "Custom Test submit ho gaya!",''',
    "submitCustomTest.js: credit call",
)

patch(
    "backend/controllers/submitPreviousYearTest.js",
    '''import mongoose from "mongoose";
import PreviousYearTest from "../models/PreviousYearTest.js";
import PreviousYearAttempt from "../models/PreviousYearAttempt.js";''',
    '''import mongoose from "mongoose";
import PreviousYearTest from "../models/PreviousYearTest.js";
import PreviousYearAttempt from "../models/PreviousYearAttempt.js";
import { creditQuestionsToCommissionHolders } from "../utils/commissionTracking.js";''',
    "submitPreviousYearTest.js: import commissionTracking",
)
patch(
    "backend/controllers/submitPreviousYearTest.js",
    '''    await newAttempt.save();

    return res.status(201).json({
      success: true,
      message: "Previous Year Test submit ho gaya!",''',
    '''    await newAttempt.save();

    await creditQuestionsToCommissionHolders(req.user, correctCount + wrongCount);

    return res.status(201).json({
      success: true,
      message: "Previous Year Test submit ho gaya!",''',
    "submitPreviousYearTest.js: credit call",
)

patch(
    "backend/controllers/submitCurrentAffairQuiz.js",
    '''import CurrentAffairQuiz from "../models/CurrentAffairQuiz.js";
import CurrentAffairAttempt from "../models/CurrentAffairAttempt.js";''',
    '''import CurrentAffairQuiz from "../models/CurrentAffairQuiz.js";
import CurrentAffairAttempt from "../models/CurrentAffairAttempt.js";
import { creditQuestionsToCommissionHolders } from "../utils/commissionTracking.js";''',
    "submitCurrentAffairQuiz.js: import commissionTracking",
)
patch(
    "backend/controllers/submitCurrentAffairQuiz.js",
    '''    await newAttempt.save();

    return res.status(201).json({
      success: true,
      message: "Quiz submit ho gaya!",''',
    '''    await newAttempt.save();

    await creditQuestionsToCommissionHolders(req.user, correctCount + wrongCount);

    return res.status(201).json({
      success: true,
      message: "Quiz submit ho gaya!",''',
    "submitCurrentAffairQuiz.js: credit call",
)

# ─────────────────────────────────────────────
# 7. routes/Routes.js — imports + admin routes + promoter routes
# ─────────────────────────────────────────────
patch(
    "backend/routes/Routes.js",
    '''import { adminCreateMainTeacher } from "../controllers/adminCreateMainTeacher.js"; // 🆕
import { listExamNamesAdmin, addExamName, deleteExamName } from "../controllers/manageExamNames.js"; // 🆕''',
    '''import { adminCreateMainTeacher } from "../controllers/adminCreateMainTeacher.js"; // 🆕
import { listExamNamesAdmin, addExamName, deleteExamName } from "../controllers/manageExamNames.js"; // 🆕
import { loginPromoter, logoutPromoter, changePromoterPassword } from "../controllers/promoterAuthentication.js";
import { promoterInfo } from "../middlewares/promoterInfo.js";
import { adminCreatePromoter, adminListPromoters, adminUpdatePromoter, adminSetPromoterStatus } from "../controllers/adminManagePromoters.js";
import { adminSettlePromoterCommission, adminSettleTeacherCommission } from "../controllers/adminManageCommission.js";
import { getPromoterDashboard } from "../controllers/getPromoterDashboard.js";''',
    "Routes.js: imports",
)

patch(
    "backend/routes/Routes.js",
    '''router.post("/admin/create-main-teacher", adminLimiter, adminOnly, adminCreateMainTeacher);
// 🆕 Exam names — Admin Panel se manage (add/delete). Public dropdown''',
    '''router.post("/admin/create-main-teacher", adminLimiter, adminOnly, adminCreateMainTeacher);

// 🆕 Promoter management
router.post("/admin/create-promoter", adminLimiter, adminOnly, adminCreatePromoter);
router.get("/admin/promoters", adminOnly, adminListPromoters);
router.post("/admin/promoters/:promoterId/update", adminLimiter, adminOnly, adminUpdatePromoter);
router.post("/admin/promoters/:promoterId/status", adminLimiter, adminOnly, adminSetPromoterStatus);
router.post("/admin/promoters/:promoterId/settle", adminLimiter, adminOnly, adminSettlePromoterCommission);
router.post("/admin/teachers/:teacherId/settle-commission", adminLimiter, adminOnly, adminSettleTeacherCommission);

// 🆕 Exam names — Admin Panel se manage (add/delete). Public dropdown''',
    "Routes.js: admin promoter routes",
)

patch(
    "backend/routes/Routes.js",
    '''router.delete("/admin/exam-names/:id", adminLimiter, adminOnly, deleteExamName);

// ═════════════════════════════════════════════
// STUDENT ROUTES (login zaroori)
// ═════════════════════════════════════════════''',
    '''router.delete("/admin/exam-names/:id", adminLimiter, adminOnly, deleteExamName);

// ═════════════════════════════════════════════
// PROMOTER ROUTES
// ═════════════════════════════════════════════
router.post("/promoter-login", loginIpLimiter, loginLimiter, loginEmailLimiter, loginPromoter);
router.post("/promoter-logout", logoutPromoter);
router.get("/promoter-me", promoterInfo, (req, res) => {
  res.status(200).json({ success: true, data: req.promoter });
});
router.post("/promoter/change-password", promoterInfo, writeLimiter, changePromoterPassword);
router.get("/promoter/dashboard", promoterInfo, getPromoterDashboard);

// ═════════════════════════════════════════════
// STUDENT ROUTES (login zaroori)
// ═════════════════════════════════════════════''',
    "Routes.js: promoter routes section",
)

# ─────────────────────────────────────────────
# 8. controllers/addUser.js — unified code field (teacher vs promoter) + linking
# ─────────────────────────────────────────────
EXPECTED_ADDUSER = '''// controllers/addUser.js
import User from "../models/User.js";
import Coupon from "../models/Coupon.js"; // 🆕 coupon-based signup ke liye
import jwt from "jsonwebtoken";
import { JWT_SECRET } from "../utils/jwtSecret.js";
import bcrypt from "bcrypt";
import { verifyOtpCode } from "../utils/otpService.js";
import { authCookieOptions } from "../utils/cookieOptions.js";
import { checkAndMatchAllowedStudent } from "../utils/batchAccess.js"; // 🆕

export const addUser = async (req, res) => {
  try {
    const { name, email, phone, password, address, exam, couponCode, otp } = req.body;

    // 1. Validation — 🆕 ab "exam" ya "couponCode" mein se koi EK hona zaroori hai
    if (!name || !email || !phone || !password || !address || !otp) {
      return res.status(400).json({
        success: false,
        message: "Sabhi fields bharna zaroori hai!",
      });
    }
    if (!exam && !couponCode) {
      return res.status(400).json({
        success: false,
        message: "Exam chunein ya coupon code dalein!",
      });
    }
    if (exam && couponCode) {
      return res.status(400).json({
        success: false,
        message: "Exam aur coupon code dono ek saath nahi — koi ek chunein!",
      });
    }

    if (String(password).length < 6) {
      return res.status(400).json({
        success: false,
        message: "Password kam se kam 6 characters ka hona chahiye!",
      });
    }

    const normalizedEmail = String(email).toLowerCase().trim();
    const normalizedPhone = String(phone).trim();

    if (!/^\\d{10}$/.test(normalizedPhone)) {
      return res.status(400).json({
        success: false,
        message: "Phone number bilkul 10 anko ka hona chahiye!",
      });
    }

    // 2. Duplicate check
    const existingUser = await User.findOne({
      $or: [{ email: normalizedEmail }, { phone: normalizedPhone }],
    });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: "Is email ya phone number se account pehle hi bana hua hai!",
      });
    }

    // 3. 🆕 Coupon code diya hai to usse hi exam derive karo (aur account ko
    // seedha us batch mein enroll bhi kar do — alag se "redeem" karne ki
    // zaroorat nahi padegi)
    let resolvedExam = exam;
    let coupon = null;
    if (couponCode) {
      coupon = await Coupon.findOne({ code: String(couponCode).trim().toUpperCase() });
      if (!coupon) {
        return res.status(404).json({
          success: false,
          message: "Ye coupon code nahi mila. Sahi code check karein.",
        });
      }
      resolvedExam = coupon.exam;

      // 🆕 Invite-only batch check — signup se account create karne se
      // PEHLE hi reject karo, taaki koi stray account na bane bina batch ke
      const accessCheck = await checkAndMatchAllowedStudent(coupon._id, {
        phone: normalizedPhone,
        email: normalizedEmail,
      });
      if (!accessCheck.allowed) {
        return res.status(403).json({
          success: false,
          message: "Aap is batch mein nahi hain. Apne teacher se sampark karein.",
        });
      }
    }

    // 4. OTP verify — email ke against verify hota hai
    await verifyOtpCode(normalizedEmail, "signup", otp);

    // 5. Password hash
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // 6. Save — 🆕 coupon wale case mein activeCoupon + couponHistory bhi
    // yahin set ho jaata hai, seedha signup ke sath hi
    const newUser = new User({
      name: String(name).trim(),
      email: normalizedEmail,
      phone: normalizedPhone,
      password: hashedPassword,
      address: String(address).trim(),
      exam: resolvedExam,
      ...(coupon && {
        activeCoupon: coupon._id,
        couponHistory: [{ coupon: coupon._id, examNameAtJoin: resolvedExam, joinedAt: new Date(), leftAt: null }],
      }),
    });
    await newUser.save();

    // 🆕 Ab userId mil gaya — allowed-list entry par "matched" mark kar do
    if (coupon) {
      await checkAndMatchAllowedStudent(coupon._id, { phone: normalizedPhone, email: normalizedEmail }, newUser._id);
    }

    // 7. JWT + cookie (auto-login)
    const token = jwt.sign(
      { userId: newUser._id },
      JWT_SECRET,
      { expiresIn: "7d" }
    );

    return res
      .status(201)
      .cookie("token", token, authCookieOptions())
      .json({
        success: true,
        message: coupon
          ? `Account ban gaya aur '${coupon.name}' batch mein enroll ho gaye!`
          : "User successfully registered & logged in!",
        data: {
          _id: newUser._id,
          name: newUser.name,
          email: newUser.email,
          phone: newUser.phone,
          exam: newUser.exam,
          activeCoupon: newUser.activeCoupon || null,
        },
      });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "Is email ya phone se account pehle hi maujood hai.",
      });
    }
    console.error("Signup Error:", error);
    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.statusCode ? error.message : "Internal Server Error",
    });
  }
};'''

NEW_ADDUSER = '''// controllers/addUser.js
import User from "../models/User.js";
import Coupon from "../models/Coupon.js";
import Promoter from "../models/Promoter.js";
import jwt from "jsonwebtoken";
import { JWT_SECRET } from "../utils/jwtSecret.js";
import bcrypt from "bcrypt";
import { verifyOtpCode } from "../utils/otpService.js";
import { authCookieOptions } from "../utils/cookieOptions.js";
import { checkAndMatchAllowedStudent } from "../utils/batchAccess.js";

export const addUser = async (req, res) => {
  try {
    const { name, email, phone, password, address, exam, code, couponCode, otp } = req.body;
    const rawCode = code || couponCode;

    if (!name || !email || !phone || !password || !address || !otp) {
      return res.status(400).json({
        success: false,
        message: "Sabhi fields bharna zaroori hai!",
      });
    }
    if (!exam && !rawCode) {
      return res.status(400).json({
        success: false,
        message: "Exam chunein ya code dalein!",
      });
    }

    if (String(password).length < 6) {
      return res.status(400).json({
        success: false,
        message: "Password kam se kam 6 characters ka hona chahiye!",
      });
    }

    const normalizedEmail = String(email).toLowerCase().trim();
    const normalizedPhone = String(phone).trim();

    if (!/^\\d{10}$/.test(normalizedPhone)) {
      return res.status(400).json({
        success: false,
        message: "Phone number bilkul 10 anko ka hona chahiye!",
      });
    }

    const existingUser = await User.findOne({
      $or: [{ email: normalizedEmail }, { phone: normalizedPhone }],
    });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: "Is email ya phone number se account pehle hi bana hua hai!",
      });
    }

    let resolvedExam = exam;
    let coupon = null;
    let promoterDoc = null;

    if (rawCode) {
      const trimmedCode = String(rawCode).trim().toUpperCase();
      coupon = await Coupon.findOne({ code: trimmedCode });

      if (coupon) {
        resolvedExam = coupon.exam;

        const accessCheck = await checkAndMatchAllowedStudent(coupon._id, {
          phone: normalizedPhone,
          email: normalizedEmail,
        });
        if (!accessCheck.allowed) {
          return res.status(403).json({
            success: false,
            message: "Aap is batch mein nahi hain. Apne teacher se sampark karein.",
          });
        }
      } else {
        promoterDoc = await Promoter.findOne({ code: trimmedCode, status: "active" });
        if (!promoterDoc) {
          return res.status(404).json({
            success: false,
            message: "Ye code sahi nahi hai. Sahi teacher ya promoter code check karein.",
          });
        }
        if (!exam) {
          return res.status(400).json({
            success: false,
            message: "Exam ka naam dalna zaroori hai!",
          });
        }
        resolvedExam = exam;
      }
    }

    await verifyOtpCode(normalizedEmail, "signup", otp);

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const newUser = new User({
      name: String(name).trim(),
      email: normalizedEmail,
      phone: normalizedPhone,
      password: hashedPassword,
      address: String(address).trim(),
      exam: resolvedExam,
      ...(coupon && {
        activeCoupon: coupon._id,
        couponHistory: [{ coupon: coupon._id, examNameAtJoin: resolvedExam, joinedAt: new Date(), leftAt: null }],
      }),
      ...(promoterDoc && { promoter: promoterDoc._id }),
    });
    await newUser.save();

    if (coupon) {
      await checkAndMatchAllowedStudent(coupon._id, { phone: normalizedPhone, email: normalizedEmail }, newUser._id);
    }
    if (promoterDoc) {
      await Promoter.updateOne({ _id: promoterDoc._id }, { $inc: { totalStudents: 1 } });
    }

    const token = jwt.sign(
      { userId: newUser._id },
      JWT_SECRET,
      { expiresIn: "7d" }
    );

    return res
      .status(201)
      .cookie("token", token, authCookieOptions())
      .json({
        success: true,
        message: coupon
          ? `Account ban gaya aur '${coupon.name}' batch mein enroll ho gaye!`
          : "User successfully registered & logged in!",
        data: {
          _id: newUser._id,
          name: newUser.name,
          email: newUser.email,
          phone: newUser.phone,
          exam: newUser.exam,
          activeCoupon: newUser.activeCoupon || null,
        },
      });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "Is email ya phone se account pehle hi maujood hai.",
      });
    }
    console.error("Signup Error:", error);
    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.statusCode ? error.message : "Internal Server Error",
    });
  }
};'''

full_replace_if_matches(
    "backend/controllers/addUser.js",
    EXPECTED_ADDUSER,
    NEW_ADDUSER,
    "addUser.js: unified code field + promoter linking",
)

print("")
print("Done. Read every OK/WARNING line above.")
print("Agar koi WARNING aaya hai to wo file manually check karni hogi — patch skip ho gaya hai, koi nuksan nahi hua.")
