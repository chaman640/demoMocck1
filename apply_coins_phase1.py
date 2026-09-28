def patch(path, old, new, label):
    try:
        with open(path, "r", encoding="utf-8") as f:
            content = f.read()
    except FileNotFoundError:
        print(f"WARNING [{label}]: file not found: {path} — SKIPPED")
        return
    if new in content:
        print(f"OK [{label}]: already applied earlier, skipping — {path}")
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


# ─────────────────────────────────────────────
# 1. models/User.js — coins, streak, boost fields
# ─────────────────────────────────────────────
patch(
    "backend/models/User.js",
    '''    promoter: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Promoter",
      default: null,
    },
  },
  {
    timestamps: true,
  }
);''',
    '''    promoter: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Promoter",
      default: null,
    },

    coins: { type: Number, default: 0 },
    activityDates: { type: [String], default: [] },
    longestStreak: { type: Number, default: 0 },
    boostActiveUntil: { type: Date, default: null },
    boostActivationsToday: { type: Number, default: 0 },
    boostActivationsDate: { type: String, default: null },
  },
  {
    timestamps: true,
  }
);''',
    "User.js: coins/streak/boost fields",
)

# ─────────────────────────────────────────────
# 2. Credit coins on every submit controller (same hook points as commission)
# ─────────────────────────────────────────────
for filepath in [
    "backend/controllers/addPerformence.js",
    "backend/controllers/submitCustomTest.js",
    "backend/controllers/submitPreviousYearTest.js",
    "backend/controllers/submitCurrentAffairQuiz.js",
]:
    patch(
        filepath,
        'import { creditQuestionsToCommissionHolders } from "../utils/commissionTracking.js";',
        'import { creditQuestionsToCommissionHolders } from "../utils/commissionTracking.js";\nimport { creditDailyCoinsIfEligible } from "../utils/coinRewards.js";',
        f"{filepath}: import coinRewards",
    )

    try:
        with open(filepath, "r", encoding="utf-8") as f:
            _current = f.read()
    except FileNotFoundError:
        _current = ""
    if "creditDailyCoinsIfEligible(req.user" in _current:
        print(f"OK [{filepath}: credit daily coins call]: already applied earlier (Phase 2 addendum may have evolved this line), skipping — {filepath}")
        continue
    patch(
        filepath,
        "await creditQuestionsToCommissionHolders(req.user, correctCount + wrongCount);",
        '''await creditQuestionsToCommissionHolders(req.user, correctCount + wrongCount);

    await creditDailyCoinsIfEligible(req.user, {
      attempted: correctCount + wrongCount,
      total: correctCount + wrongCount + unattemptedCount,
    });''',
        f"{filepath}: credit daily coins call",
    )

# ─────────────────────────────────────────────
# 3. routes/Routes.js — imports + routes
# ─────────────────────────────────────────────
patch(
    "backend/routes/Routes.js",
    '''import { adminSettlePromoterCommission, adminSettleTeacherCommission } from "../controllers/adminManageCommission.js";
import { getPromoterDashboard } from "../controllers/getPromoterDashboard.js";''',
    '''import { adminSettlePromoterCommission, adminSettleTeacherCommission } from "../controllers/adminManageCommission.js";
import { getPromoterDashboard } from "../controllers/getPromoterDashboard.js";

// 🆕 Coins / Streak / Books rewards system
import { adminOrTeacher } from "../middlewares/adminOrTeacher.js";
import { processBookUploadMiddleware } from "../middlewares/processBookUpload.js";
import { getRewardsSummary } from "../controllers/getRewardsSummary.js";
import { getStreakCalendar } from "../controllers/getStreakCalendar.js";
import { getBooksForStudent } from "../controllers/getBooksForStudent.js";
import { redeemBook } from "../controllers/redeemBook.js";
import { getMyRedemptions } from "../controllers/getMyRedemptions.js";
import { activateBoost } from "../controllers/activateBoost.js";
import { createBook, listBooksForManage, updateBook, setBookStatus } from "../controllers/manageBooks.js";
import { listRedemptionOrders, updateRedemptionStatus } from "../controllers/manageRedemptionOrders.js";''',
    "Routes.js: coins/books imports",
)

patch(
    "backend/routes/Routes.js",
    '''router.post("/promoter/change-password", promoterInfo, writeLimiter, changePromoterPassword);
router.get("/promoter/dashboard", promoterInfo, getPromoterDashboard);

// ═════════════════════════════════════════════
// STUDENT ROUTES (login zaroori)
// ═════════════════════════════════════════════''',
    '''router.post("/promoter/change-password", promoterInfo, writeLimiter, changePromoterPassword);
router.get("/promoter/dashboard", promoterInfo, getPromoterDashboard);

// ═════════════════════════════════════════════
// 🆕 REWARDS ROUTES (Student — coins, streak, books)
// ═════════════════════════════════════════════
router.get("/rewards/summary", userInfo, getRewardsSummary);
router.get("/rewards/streak-calendar", userInfo, getStreakCalendar);
router.get("/rewards/books", userInfo, getBooksForStudent);
router.post("/rewards/books/:bookId/redeem", userInfo, writeLimiter, redeemBook);
router.get("/rewards/my-redemptions", userInfo, getMyRedemptions);
router.post("/rewards/watch-ad-boost", userInfo, writeLimiter, activateBoost);

// ═════════════════════════════════════════════
// 🆕 BOOK CATALOG MANAGEMENT (Admin + Main/Sub Teacher)
// ═════════════════════════════════════════════
router.post("/admin/books", adminLimiter, adminOrTeacher, processBookUploadMiddleware, sanitizeBody, createBook);
router.get("/admin/books", adminOrTeacher, listBooksForManage);
router.post("/admin/books/:bookId/update", adminLimiter, adminOrTeacher, processBookUploadMiddleware, sanitizeBody, updateBook);
router.post("/admin/books/:bookId/status", adminLimiter, adminOrTeacher, setBookStatus);
router.get("/admin/book-orders", adminOrTeacher, listRedemptionOrders);
router.post("/admin/book-orders/:redemptionId/update", adminLimiter, adminOrTeacher, updateRedemptionStatus);

// ═════════════════════════════════════════════
// STUDENT ROUTES (login zaroori)
// ═════════════════════════════════════════════''',
    "Routes.js: rewards + book-management routes",
)

print("")
print("Done. Read every OK/WARNING line above.")
print("Agar koi WARNING aaya hai to wo file manually check karni hogi — patch skip ho gaya hai, koi nuksan nahi hua.")
