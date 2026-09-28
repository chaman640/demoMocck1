def patch_once(path, marker, old, new, label):
    try:
        with open(path, "r", encoding="utf-8") as f:
            content = f.read()
    except FileNotFoundError:
        print(f"WARNING [{label}]: file not found: {path} — SKIPPED")
        return
    if marker in content:
        print(f"OK [{label}]: already applied earlier, skipping — {path}")
        return
    if old not in content:
        print(f"WARNING [{label}]: anchor text not found in {path} — SKIPPED (file may have changed, needs manual check)")
        return
    if content.count(old) > 1:
        print(f"WARNING [{label}]: anchor text found MORE THAN ONCE in {path} — SKIPPED")
        return
    with open(path, "w", encoding="utf-8") as f:
        f.write(content.replace(old, new))
    print(f"OK [{label}]: patched {path}")


ROUTES = "backend/routes/Routes.js"
patch_once(
    ROUTES, "adminListTeacherCommissions",
    'import { adminSettlePromoterCommission, adminSettleTeacherCommission } from "../controllers/adminManageCommission.js";',
    'import { adminSettlePromoterCommission, adminSettleTeacherCommission, adminListTeacherCommissions } from "../controllers/adminManageCommission.js";',
    "Routes.js: import teacher-commission list",
)
patch_once(
    ROUTES, '"/admin/teacher-commissions"',
    'router.post("/admin/teachers/:teacherId/settle-commission", adminLimiter, adminOnly, adminSettleTeacherCommission);',
    'router.post("/admin/teachers/:teacherId/settle-commission", adminLimiter, adminOnly, adminSettleTeacherCommission);\nrouter.get("/admin/teacher-commissions", adminOnly, adminListTeacherCommissions);',
    "Routes.js: teacher-commissions route",
)

APP = "frontend/src/App.jsx"
patch_once(
    APP, "import AdminTeacherCommissions",
    "import ManageBookOrders from './pages/ManageBookOrders';",
    "import ManageBookOrders from './pages/ManageBookOrders';\nimport AdminTeacherCommissions from './pages/AdminTeacherCommissions';",
    "App.jsx: import AdminTeacherCommissions",
)
patch_once(
    APP, 'path="/AdminTeacherCommissions"',
    '            <Route path="/ManageBookOrders" element={<ManageBookOrders />} />',
    '            <Route path="/ManageBookOrders" element={<ManageBookOrders />} />\n            <Route path="/AdminTeacherCommissions" element={<AdminTeacherCommissions />} />',
    "App.jsx: AdminTeacherCommissions route",
)

patch_once(
    "frontend/src/pages/AdminPanel.jsx", 'navigate("/AdminTeacherCommissions")',
    """          <p className="text-xs text-gray-500">Naya promoter banayein, students/questions dekhein, hisab settle karein</p>
        </button>""",
    """          <p className="text-xs text-gray-500">Naya promoter banayein, students/questions dekhein, hisab settle karein</p>
        </button>

        <button
          onClick={() => navigate("/AdminTeacherCommissions")}
          className="w-full text-left bg-[#111827] border border-gray-800 hover:border-[#7C3AED] rounded-2xl p-5 sm:p-6 transition-colors"
        >
          <h3 className="font-semibold text-base mb-1">Teacher Commission →</h3>
          <p className="text-xs text-gray-500">Main teachers ka question count dekhein aur hisab settle karein</p>
        </button>""",
    "AdminPanel.jsx: Teacher Commission entry",
)

STORE = "frontend/src/pages/RewardsStore.jsx"
patch_once(
    STORE, 'import { emitBoostActivated }',
    'import { vibrateShort } from "../utils/vibrate";',
    'import { vibrateShort } from "../utils/vibrate";\nimport { emitBoostActivated } from "../utils/rewardEvents";',
    "RewardsStore.jsx: import emitBoostActivated",
)
patch_once(
    STORE, "emitBoostActivated(Math",
    """      const res = await api.post("/rewards/watch-ad-boost");
      setMessage(res.data.message);
      vibrateShort();""",
    """      const res = await api.post("/rewards/watch-ad-boost");
      setMessage(res.data.message);
      emitBoostActivated(Math.round((res.data.data?.boostRemainingSeconds || 2700) / 60));""",
    "RewardsStore.jsx: boost activation animation",
)

CH = "frontend/src/pages/Challenge.jsx"
patch_once(
    CH, "import AdBanner",
    'import api from "../api/api";',
    'import api from "../api/api";\nimport AdBanner from "../components/AdBanner";\nimport { vibrateShort } from "../utils/vibrate";',
    "Challenge.jsx: imports",
)
patch_once(
    CH, "adRefreshCount, setAdRefreshCount",
    "  const [activeQIdx, setActiveQIdx] = useState(0);",
    "  const [activeQIdx, setActiveQIdx] = useState(0);\n  const [adRefreshCount, setAdRefreshCount] = useState(0);",
    "Challenge.jsx: adRefreshCount state",
)
patch_once(
    CH, "setAdRefreshCount((c) => c + 1);",
    """    if (activeQIdx < subj.questions.length - 1) {
      goToQuestion(activeSubjectIdx, activeQIdx + 1);
    } else if (activeSubjectIdx < challengeMeta.subjects.length - 1) {
      goToQuestion(activeSubjectIdx + 1, 0);
    }
  };

  const goPrev""",
    """    if (activeQIdx < subj.questions.length - 1) {
      setAdRefreshCount((c) => c + 1);
      goToQuestion(activeSubjectIdx, activeQIdx + 1);
    } else if (activeSubjectIdx < challengeMeta.subjects.length - 1) {
      setAdRefreshCount((c) => c + 1);
      goToQuestion(activeSubjectIdx + 1, 0);
    }
  };

  const goPrev""",
    "Challenge.jsx: ad refresh on next",
)
patch_once(
    CH, "AdBanner adSlot",
    """                Submit Karo
              </button>
            </div>
          </div>
        </div>""",
    """                Submit Karo
              </button>
            </div>
          </div>
          <div className="max-w-2xl mx-auto mt-4">
            <AdBanner adSlot="YOUR_AD_SLOT_ID" refreshTrigger={adRefreshCount} />
          </div>
        </div>""",
    "Challenge.jsx: AdBanner below question card",
)
patch_once(
    CH, "vibrateShort();\n      setResultData",
    "      const res = await api.post(`/challenge/${effectiveCode}/submit`, { attemptedQuestions });\n      setResultData(res.data.data);",
    "      const res = await api.post(`/challenge/${effectiveCode}/submit`, { attemptedQuestions });\n      vibrateShort();\n      setResultData(res.data.data);",
    "Challenge.jsx: vibrate on submit",
)

SC = "backend/controllers/submitChallenge.js"
patch_once(
    SC, "commissionTracking",
    'import ChallengeAttempt from "../models/ChallengeAttempt.js";',
    'import ChallengeAttempt from "../models/ChallengeAttempt.js";\nimport { creditQuestionsToCommissionHolders } from "../utils/commissionTracking.js";',
    "submitChallenge.js: import commissionTracking",
)
patch_once(
    SC, "creditQuestionsToCommissionHolders(req.user",
    "    await newAttempt.save();",
    "    await newAttempt.save();\n\n    await creditQuestionsToCommissionHolders(req.user, correctCount + wrongCount);",
    "submitChallenge.js: count questions for commission",
)

print("")
print("Done. Read every OK/WARNING line above.")
