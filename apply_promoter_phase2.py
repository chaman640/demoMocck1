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


# ─────────────────────────────────────────────
# 1. App.jsx — new routes
# ─────────────────────────────────────────────
patch(
    "frontend/src/App.jsx",
    "import AdminPanel from './pages/AdminPanel';",
    "import AdminPanel from './pages/AdminPanel';\nimport PromoterLogin from './pages/PromoterLogin';\nimport PromoterChangePassword from './pages/PromoterChangePassword';\nimport PromoterDashboard from './pages/PromoterDashboard';\nimport AdminPromoters from './pages/AdminPromoters';",
    "App.jsx: promoter page imports",
)

patch(
    "frontend/src/App.jsx",
    '<Route path="/AdminPanel" element={<AdminPanel />} />',
    '<Route path="/AdminPanel" element={<AdminPanel />} />\n            <Route path="/AdminPromoters" element={<AdminPromoters />} />\n            <Route path="/PromoterLogin" element={<PromoterLogin />} />\n            <Route path="/PromoterChangePassword" element={<PromoterChangePassword />} />\n            <Route path="/PromoterDashboard" element={<PromoterDashboard />} />',
    "App.jsx: promoter routes",
)

# ─────────────────────────────────────────────
# 2. AdminPanel.jsx — nav button to Promoters page
# ─────────────────────────────────────────────
patch(
    "frontend/src/pages/AdminPanel.jsx",
    "        <CreateMainTeacherCard />",
    '''        <CreateMainTeacherCard />

        <button
          onClick={() => navigate("/AdminPromoters")}
          className="w-full text-left bg-[#111827] border border-gray-800 hover:border-[#7C3AED] rounded-2xl p-5 sm:p-6 transition-colors"
        >
          <h3 className="font-semibold text-base mb-1">Promoters Manage Karein →</h3>
          <p className="text-xs text-gray-500">Naya promoter banayein, students/questions dekhein, hisab settle karein</p>
        </button>''',
    "AdminPanel.jsx: Promoters nav button",
)

# ─────────────────────────────────────────────
# 3. TeacherDashboard.jsx — commission section for main teacher
# ─────────────────────────────────────────────
patch(
    "frontend/src/pages/teacher/TeacherDashboard.jsx",
    '''                  ))}
                </div>
              </div>
            )}
          </>
        )}

        {/* ── SUB-TEACHER VIEW ── */}''',
    '''                  ))}
                </div>
              </div>
            )}

            {dashboard.commission && (
              <div className="bg-[#111827] border border-gray-800 rounded-2xl p-4 space-y-3">
                <h3 className="font-semibold text-sm">Your Commission</h3>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <p className="text-[11px] text-gray-500 uppercase tracking-wide mb-1">Pending Questions</p>
                    <p className="text-xl font-bold text-white">{dashboard.commission.pendingQuestionsCount}</p>
                  </div>
                  <div>
                    <p className="text-[11px] text-gray-500 uppercase tracking-wide mb-1">Total Questions (all time)</p>
                    <p className="text-xl font-bold text-white">{dashboard.commission.totalQuestionsAllTime}</p>
                  </div>
                </div>
                {dashboard.commission.paymentHistory?.length > 0 && (
                  <div className="pt-2 border-t border-gray-800 space-y-2">
                    <p className="text-[11px] text-gray-500 uppercase tracking-wide">Payment History</p>
                    {[...dashboard.commission.paymentHistory].reverse().map((entry, idx) => (
                      <div key={idx} className="flex items-center justify-between text-xs">
                        <span className="text-gray-400">
                          {new Date(entry.settledAt).toLocaleDateString()} &middot; {entry.questionsSettled} questions
                        </span>
                        <span className="font-semibold text-[#A78BFA]">₹{entry.amount}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </>
        )}

        {/* ── SUB-TEACHER VIEW ── */}''',
    "TeacherDashboard.jsx: commission section",
)

# ─────────────────────────────────────────────
# 4. Singup.jsx — unified code field + ?ref= link handling
# ─────────────────────────────────────────────
patch(
    "frontend/src/pages/Singup.jsx",
    'import { Link, useNavigate } from "react-router-dom";',
    'import { Link, useNavigate, useSearchParams } from "react-router-dom";',
    "Singup.jsx: useSearchParams import",
)

patch(
    "frontend/src/pages/Singup.jsx",
    '''  const [joinMode, setJoinMode] = useState("exam"); // 🆕 "exam" | "coupon" — toggle
  const [showPassword, setShowPassword] = useState(false);''',
    '''  const [joinMode, setJoinMode] = useState("exam"); // 🆕 "exam" | "coupon" — toggle
  const [refKind, setRefKind] = useState(null); // null | "promoter" | "teacher" | "unknown"
  const [searchParams] = useSearchParams();
  const [showPassword, setShowPassword] = useState(false);''',
    "Singup.jsx: refKind state",
)

patch(
    "frontend/src/pages/Singup.jsx",
    '''  useEffect(() => {
    api
      .get("/allExamName")
      .then((res) => setExamList(res.data.data || []))
      .catch(() => {});
  }, []);''',
    '''  useEffect(() => {
    api
      .get("/allExamName")
      .then((res) => setExamList(res.data.data || []))
      .catch(() => {});
  }, []);

  useEffect(() => {
    const ref = searchParams.get("ref");
    if (ref) {
      setJoinMode("coupon");
      setFormData((prev) => ({ ...prev, couponCode: ref.toUpperCase() }));
      const kind = searchParams.get("kind");
      setRefKind(kind === "promoter" || kind === "teacher" ? kind : "unknown");
    }
  }, [searchParams]);''',
    "Singup.jsx: ref query-param effect",
)

patch(
    "frontend/src/pages/Singup.jsx",
    '''    if (joinMode === "exam" && !formData.exam) errors.exam = true;
    if (joinMode === "coupon" && !formData.couponCode.trim()) errors.couponCode = true;''',
    '''    if (joinMode === "exam" && !formData.exam) errors.exam = true;
    if (joinMode === "coupon" && !refKind && !formData.couponCode.trim()) errors.couponCode = true;
    if (joinMode === "coupon" && refKind === "promoter" && !formData.exam) errors.exam = true;''',
    "Singup.jsx: validation for referral kind",
)

patch(
    "frontend/src/pages/Singup.jsx",
    '''                <div className="grid grid-cols-2 gap-2 mb-3">
                  <button
                    type="button"
                    onClick={() => handleJoinModeChange("exam")}
                    className={`py-2 rounded-lg text-sm font-medium border transition-all ${
                      joinMode === "exam" ? "bg-[#2563EB] text-white border-[#2563EB]" : "bg-white text-[#64748B] border-[#CBD5E1] hover:border-[#94A3B8]"
                    }`}
                  >
                    Choose Exam
                  </button>
                  <button
                    type="button"
                    onClick={() => handleJoinModeChange("coupon")}
                    className={`py-2 rounded-lg text-sm font-medium border transition-all ${
                      joinMode === "coupon" ? "bg-[#2563EB] text-white border-[#2563EB]" : "bg-white text-[#64748B] border-[#CBD5E1] hover:border-[#94A3B8]"
                    }`}
                  >
                    I Have a Coupon Code
                  </button>
                </div>

                {joinMode === "exam" ? (
                  <div className="relative">
                    <span className={`absolute inset-y-0 left-0 flex items-center pl-3 ${fieldErrors.exam ? 'text-red-400' : 'text-[#94A3B8]'}`}>
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                    </span>
                    <select name="exam" value={formData.exam} onChange={handleChange} className={`${getInputClass('exam')} appearance-none cursor-pointer`}>
                      <option value="" disabled>Select Exam</option>
                      {examList.length > 0 ? (
                        examList.map((examName, index) => (
                          <option key={index} value={examName}>{examName}</option>
                        ))
                      ) : (
                        <option value="" disabled>Loading exams...</option>
                      )}
                    </select>
                    <span className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none text-[#94A3B8]">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7"></path></svg>
                    </span>
                  </div>
                ) : (
                  <div className="relative">
                    <span className={`absolute inset-y-0 left-0 flex items-center pl-3 ${fieldErrors.couponCode ? 'text-red-400' : 'text-[#94A3B8]'}`}>
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z" /></svg>
                    </span>
                    <input
                      type="text"
                      name="couponCode"
                      value={formData.couponCode}
                      onChange={(e) => setFormData((prev) => ({ ...prev, couponCode: e.target.value.toUpperCase() }))}
                      placeholder="Code given by your teacher"
                      className={getInputClass('couponCode')}
                    />
                  </div>
                )}
                {joinMode === "coupon" && (
                  <p className="text-[11px] text-[#64748B] mt-1.5">Coupon code se aapka exam automatically set ho jayega aur aap seedhe batch mein enroll ho jayenge.</p>
                )}''',
    '''                {!refKind && (
                  <div className="grid grid-cols-2 gap-2 mb-3">
                    <button
                      type="button"
                      onClick={() => handleJoinModeChange("exam")}
                      className={`py-2 rounded-lg text-sm font-medium border transition-all ${
                        joinMode === "exam" ? "bg-[#2563EB] text-white border-[#2563EB]" : "bg-white text-[#64748B] border-[#CBD5E1] hover:border-[#94A3B8]"
                      }`}
                    >
                      Choose Exam
                    </button>
                    <button
                      type="button"
                      onClick={() => handleJoinModeChange("coupon")}
                      className={`py-2 rounded-lg text-sm font-medium border transition-all ${
                        joinMode === "coupon" ? "bg-[#2563EB] text-white border-[#2563EB]" : "bg-white text-[#64748B] border-[#CBD5E1] hover:border-[#94A3B8]"
                      }`}
                    >
                      I Have a Code
                    </button>
                  </div>
                )}

                {refKind && (
                  <p className="text-[11px] text-green-600 font-medium mb-2">✓ Referral code applied automatically</p>
                )}

                {joinMode === "exam" ? (
                  <div className="relative">
                    <span className={`absolute inset-y-0 left-0 flex items-center pl-3 ${fieldErrors.exam ? 'text-red-400' : 'text-[#94A3B8]'}`}>
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                    </span>
                    <select name="exam" value={formData.exam} onChange={handleChange} className={`${getInputClass('exam')} appearance-none cursor-pointer`}>
                      <option value="" disabled>Select Exam</option>
                      {examList.length > 0 ? (
                        examList.map((examName, index) => (
                          <option key={index} value={examName}>{examName}</option>
                        ))
                      ) : (
                        <option value="" disabled>Loading exams...</option>
                      )}
                    </select>
                    <span className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none text-[#94A3B8]">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7"></path></svg>
                    </span>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {!refKind && (
                      <div className="relative">
                        <span className={`absolute inset-y-0 left-0 flex items-center pl-3 ${fieldErrors.couponCode ? 'text-red-400' : 'text-[#94A3B8]'}`}>
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z" /></svg>
                        </span>
                        <input
                          type="text"
                          name="couponCode"
                          value={formData.couponCode}
                          onChange={(e) => setFormData((prev) => ({ ...prev, couponCode: e.target.value.toUpperCase() }))}
                          placeholder="Teacher ya Promoter ka code"
                          className={getInputClass('couponCode')}
                        />
                      </div>
                    )}
                    {refKind !== "teacher" && (
                      <div className="relative">
                        <span className={`absolute inset-y-0 left-0 flex items-center pl-3 ${fieldErrors.exam ? 'text-red-400' : 'text-[#94A3B8]'}`}>
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                        </span>
                        <select name="exam" value={formData.exam} onChange={handleChange} className={`${getInputClass('exam')} appearance-none cursor-pointer`}>
                          <option value="" disabled={refKind === "promoter"}>
                            {refKind === "promoter" ? "Select Exam" : "Exam (sirf Promoter code ke liye zaroori)"}
                          </option>
                          {examList.map((examName, index) => (
                            <option key={index} value={examName}>{examName}</option>
                          ))}
                        </select>
                        <span className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none text-[#94A3B8]">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7"></path></svg>
                        </span>
                      </div>
                    )}
                  </div>
                )}
                {joinMode === "coupon" && !refKind && (
                  <p className="text-[11px] text-[#64748B] mt-1.5">Teacher/batch ka code ho to exam automatically set ho jayega. Promoter ka code ho to upar exam bhi select karein.</p>
                )}''',
    "Singup.jsx: unified code + exam block",
)

print("")
print("Done. Read every OK/WARNING line above.")
print("Agar koi WARNING aaya hai to wo file manually check karni hogi — patch skip ho gaya hai, koi nuksan nahi hua.")
