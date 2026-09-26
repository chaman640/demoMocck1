def dedupe(path, old, new, label):
    try:
        with open(path, "r", encoding="utf-8") as f:
            content = f.read()
    except FileNotFoundError:
        print(f"SKIP [{label}]: file not found: {path}")
        return
    chunk = new[len(old):]
    first_idx = content.find(old)
    if first_idx == -1:
        if new in content:
            print(f"OK [{label}]: already clean (single copy present) — {path}")
        else:
            print(f"OK [{label}]: base text not found (file changed or different state) — skipped, {path}")
        return
    after_old_start = first_idx + len(old)
    before = content[:after_old_start]
    after = content[after_old_start:]
    dup_count = after.count(chunk)
    if dup_count <= 1:
        print(f"OK [{label}]: no duplicate found, already clean — {path}")
        return
    first_chunk_idx = after.find(chunk)
    keep_before = after[:first_chunk_idx + len(chunk)]
    rest = after[first_chunk_idx + len(chunk):]
    rest_cleaned = rest.replace(chunk, "")
    new_content = before + keep_before + rest_cleaned
    with open(path, "w", encoding="utf-8") as f:
        f.write(new_content)
    removed = dup_count - 1
    print(f"FIXED [{label}]: removed {removed} duplicate copy/copies from {path}")


dedupe(
    'backend/controllers/createCoupon.js',
    'import Coupon from "../models/Coupon.js";',
    'import Coupon from "../models/Coupon.js";\nimport Promoter from "../models/Promoter.js";',
    'createCoupon.js: import Promoter',
)

dedupe(
    'backend/utils/mailer.js',
    '    text: `Aapko ${roleText} invite kiya gaya hai. Account activate karein: ${link}`,\n  });\n};',
    '    text: `Aapko ${roleText} invite kiya gaya hai. Account activate karein: ${link}`,\n  });\n};\n\nexport const sendPromoterCredentialsEmail = async (toEmail, { name, email, password, loginLink }) => {\n  await sendEmail({\n    to: toEmail,\n    subject: "BatchMock.in par Promoter account ban gaya hai",\n    html: wrapTemplate(\n      "Aapka Promoter account ban gaya hai",\n      `<p style="font-size: 14px; color: #D1D5DB;">${name ? `Namaste ${name},` : "Namaste,"} aapka login niche diya gaya hai.</p>\n       <div style="background: #111827; padding: 16px; border-radius: 12px; margin: 12px 0; font-size: 13px; color: #D1D5DB;">\n         <div>Email: <strong style="color:#fff;">${email}</strong></div>\n         <div>Password: <strong style="color:#fff;">${password}</strong></div>\n       </div>\n       <a href="${loginLink}" style="display: inline-block; background: #7C3AED; color: #fff; padding: 12px 24px; border-radius: 10px; text-decoration: none; font-weight: 600; margin: 12px 0;">Login Karein</a>\n       <p style="font-size: 12px; color: #6B7280;">Pehli baar login karne ke baad apna password badalna zaroori hoga.</p>`\n    ),\n    text: `Aapka Promoter account ban gaya hai. Email: ${email}, Password: ${password}. Login karein: ${loginLink}`,\n  });\n};',
    'mailer.js: sendPromoterCredentialsEmail',
)

dedupe(
    'backend/controllers/addPerformence.js',
    'import Performance from "../models/Performance.js";\nimport Blueprint from "../models/bluePrint.js";\nimport { Question } from "../models/rowQuestionSchema.js";',
    'import Performance from "../models/Performance.js";\nimport Blueprint from "../models/bluePrint.js";\nimport { Question } from "../models/rowQuestionSchema.js";\nimport { creditQuestionsToCommissionHolders } from "../utils/commissionTracking.js";',
    'addPerformence.js: import commissionTracking',
)

dedupe(
    'backend/controllers/submitCustomTest.js',
    'import mongoose from "mongoose";\nimport CustomTest from "../models/CustomTest.js";\nimport CustomTestAttempt from "../models/CustomTestAttempt.js";',
    'import mongoose from "mongoose";\nimport CustomTest from "../models/CustomTest.js";\nimport CustomTestAttempt from "../models/CustomTestAttempt.js";\nimport { creditQuestionsToCommissionHolders } from "../utils/commissionTracking.js";',
    'submitCustomTest.js: import commissionTracking',
)

dedupe(
    'backend/controllers/submitPreviousYearTest.js',
    'import mongoose from "mongoose";\nimport PreviousYearTest from "../models/PreviousYearTest.js";\nimport PreviousYearAttempt from "../models/PreviousYearAttempt.js";',
    'import mongoose from "mongoose";\nimport PreviousYearTest from "../models/PreviousYearTest.js";\nimport PreviousYearAttempt from "../models/PreviousYearAttempt.js";\nimport { creditQuestionsToCommissionHolders } from "../utils/commissionTracking.js";',
    'submitPreviousYearTest.js: import commissionTracking',
)

dedupe(
    'backend/controllers/submitCurrentAffairQuiz.js',
    'import CurrentAffairQuiz from "../models/CurrentAffairQuiz.js";\nimport CurrentAffairAttempt from "../models/CurrentAffairAttempt.js";',
    'import CurrentAffairQuiz from "../models/CurrentAffairQuiz.js";\nimport CurrentAffairAttempt from "../models/CurrentAffairAttempt.js";\nimport { creditQuestionsToCommissionHolders } from "../utils/commissionTracking.js";',
    'submitCurrentAffairQuiz.js: import commissionTracking',
)

dedupe(
    'backend/routes/Routes.js',
    'import { adminCreateMainTeacher } from "../controllers/adminCreateMainTeacher.js"; // 🆕\nimport { listExamNamesAdmin, addExamName, deleteExamName } from "../controllers/manageExamNames.js"; // 🆕',
    'import { adminCreateMainTeacher } from "../controllers/adminCreateMainTeacher.js"; // 🆕\nimport { listExamNamesAdmin, addExamName, deleteExamName } from "../controllers/manageExamNames.js"; // 🆕\nimport { loginPromoter, logoutPromoter, changePromoterPassword } from "../controllers/promoterAuthentication.js";\nimport { promoterInfo } from "../middlewares/promoterInfo.js";\nimport { adminCreatePromoter, adminListPromoters, adminUpdatePromoter, adminSetPromoterStatus } from "../controllers/adminManagePromoters.js";\nimport { adminSettlePromoterCommission, adminSettleTeacherCommission } from "../controllers/adminManageCommission.js";\nimport { getPromoterDashboard } from "../controllers/getPromoterDashboard.js";',
    'Routes.js: imports',
)

dedupe(
    'frontend/src/App.jsx',
    "import AdminPanel from './pages/AdminPanel';",
    "import AdminPanel from './pages/AdminPanel';\nimport PromoterLogin from './pages/PromoterLogin';\nimport PromoterChangePassword from './pages/PromoterChangePassword';\nimport PromoterDashboard from './pages/PromoterDashboard';\nimport AdminPromoters from './pages/AdminPromoters';",
    'App.jsx: promoter page imports',
)

dedupe(
    'frontend/src/App.jsx',
    '<Route path="/AdminPanel" element={<AdminPanel />} />',
    '<Route path="/AdminPanel" element={<AdminPanel />} />\n            <Route path="/AdminPromoters" element={<AdminPromoters />} />\n            <Route path="/PromoterLogin" element={<PromoterLogin />} />\n            <Route path="/PromoterChangePassword" element={<PromoterChangePassword />} />\n            <Route path="/PromoterDashboard" element={<PromoterDashboard />} />',
    'App.jsx: promoter routes',
)

dedupe(
    'frontend/src/pages/AdminPanel.jsx',
    '        <CreateMainTeacherCard />',
    '        <CreateMainTeacherCard />\n\n        <button\n          onClick={() => navigate("/AdminPromoters")}\n          className="w-full text-left bg-[#111827] border border-gray-800 hover:border-[#7C3AED] rounded-2xl p-5 sm:p-6 transition-colors"\n        >\n          <h3 className="font-semibold text-base mb-1">Promoters Manage Karein →</h3>\n          <p className="text-xs text-gray-500">Naya promoter banayein, students/questions dekhein, hisab settle karein</p>\n        </button>',
    'AdminPanel.jsx: Promoters nav button',
)

dedupe(
    'frontend/src/pages/Singup.jsx',
    '  useEffect(() => {\n    api\n      .get("/allExamName")\n      .then((res) => setExamList(res.data.data || []))\n      .catch(() => {});\n  }, []);',
    '  useEffect(() => {\n    api\n      .get("/allExamName")\n      .then((res) => setExamList(res.data.data || []))\n      .catch(() => {});\n  }, []);\n\n  useEffect(() => {\n    const ref = searchParams.get("ref");\n    if (ref) {\n      setJoinMode("coupon");\n      setFormData((prev) => ({ ...prev, couponCode: ref.toUpperCase() }));\n      const kind = searchParams.get("kind");\n      setRefKind(kind === "promoter" || kind === "teacher" ? kind : "unknown");\n    }\n  }, [searchParams]);',
    'Singup.jsx: ref query-param effect',
)

dedupe(
    'frontend/src/pages/CustomTest.jsx',
    'import api from "../api/api";',
    'import api from "../api/api";\nimport AdBanner from "../components/AdBanner";',
    'CustomTest.jsx: import AdBanner',
)

dedupe(
    'frontend/src/pages/PreviousYearTest.jsx',
    'import api from "../api/api";',
    'import api from "../api/api";\nimport AdBanner from "../components/AdBanner";',
    'PreviousYearTest.jsx: import AdBanner',
)

dedupe(
    'frontend/src/pages/CurrentAffairs.jsx',
    'import api from "../api/api";',
    'import api from "../api/api";\nimport AdBanner from "../components/AdBanner";',
    'CurrentAffairs.jsx: import AdBanner',
)

dedupe(
    'frontend/src/pages/teacher/TeacherCoupons.jsx',
    '  const [copiedCode, setCopiedCode] = useState(null);',
    '  const [copiedCode, setCopiedCode] = useState(null);\n  const [copiedLink, setCopiedLink] = useState(null);',
    'TeacherCoupons.jsx: copiedLink state',
)

dedupe(
    'frontend/src/pages/teacher/TeacherCoupons.jsx',
    '  const copyCode = (code) => {\n    navigator.clipboard.writeText(code);\n    setCopiedCode(code);\n    setTimeout(() => setCopiedCode(null), 1500);\n  };',
    '  const copyCode = (code) => {\n    navigator.clipboard.writeText(code);\n    setCopiedCode(code);\n    setTimeout(() => setCopiedCode(null), 1500);\n  };\n\n  const copySignupLink = (code) => {\n    const link = `${window.location.origin}/#/Singup?ref=${code}&kind=teacher`;\n    navigator.clipboard.writeText(link);\n    setCopiedLink(code);\n    setTimeout(() => setCopiedLink(null), 1500);\n  };',
    'TeacherCoupons.jsx: copySignupLink function',
)

print("")
print("Done. FIXED lines = duplicate removed. OK lines = already clean, nothing to do.")