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


# ═════════════════════════════════════════════
# CustomTest.jsx — ad in sidebar, refresh on goNext
# ═════════════════════════════════════════════
patch(
    "frontend/src/pages/CustomTest.jsx",
    'import api from "../api/api";',
    'import api from "../api/api";\nimport AdBanner from "../components/AdBanner";',
    "CustomTest.jsx: import AdBanner",
)

patch(
    "frontend/src/pages/CustomTest.jsx",
    '''  const [activeSubjectIdx, setActiveSubjectIdx] = useState(0);
  const [activeQIdx, setActiveQIdx] = useState(0);
  const [answers, setAnswers] = useState({});
  const [visited, setVisited] = useState(() => new Set());
  const [revealed, setRevealed] = useState(() => new Set()); // 🆕 questions already checked''',
    '''  const [activeSubjectIdx, setActiveSubjectIdx] = useState(0);
  const [activeQIdx, setActiveQIdx] = useState(0);
  const [adRefreshCount, setAdRefreshCount] = useState(0);
  const [answers, setAnswers] = useState({});
  const [visited, setVisited] = useState(() => new Set());
  const [revealed, setRevealed] = useState(() => new Set()); // 🆕 questions already checked''',
    "CustomTest.jsx: adRefreshCount state",
)

patch(
    "frontend/src/pages/CustomTest.jsx",
    '''  const goNext = () => {
    if (!testData) return;
    const subj = testData.subjects[activeSubjectIdx];
    if (activeQIdx < subj.questions.length - 1) {
      goToQuestion(activeSubjectIdx, activeQIdx + 1);
    } else if (activeSubjectIdx < testData.subjects.length - 1) {
      goToQuestion(activeSubjectIdx + 1, 0);
    }
  };''',
    '''  const goNext = () => {
    if (!testData) return;
    const subj = testData.subjects[activeSubjectIdx];
    if (activeQIdx < subj.questions.length - 1) {
      setAdRefreshCount((c) => c + 1);
      goToQuestion(activeSubjectIdx, activeQIdx + 1);
    } else if (activeSubjectIdx < testData.subjects.length - 1) {
      setAdRefreshCount((c) => c + 1);
      goToQuestion(activeSubjectIdx + 1, 0);
    }
  };''',
    "CustomTest.jsx: increment adRefreshCount in goNext",
)

patch(
    "frontend/src/pages/CustomTest.jsx",
    '''          <div className="w-full lg:w-72 bg-[#111827] border border-gray-800 rounded-2xl p-5 h-fit">
            <div className="grid grid-cols-1 gap-2 text-[11px] mb-5">
              <div className="flex items-center gap-1.5 text-gray-400">
                <span className="w-2.5 h-2.5 rounded-full bg-green-500" /> Correct ({summary.correct})''',
    '''          <div className="w-full lg:w-72 bg-[#111827] border border-gray-800 rounded-2xl p-5 h-fit">
            <AdBanner adSlot="YOUR_AD_SLOT_ID" refreshTrigger={adRefreshCount} className="mb-4" />
            <div className="grid grid-cols-1 gap-2 text-[11px] mb-5">
              <div className="flex items-center gap-1.5 text-gray-400">
                <span className="w-2.5 h-2.5 rounded-full bg-green-500" /> Correct ({summary.correct})''',
    "CustomTest.jsx: AdBanner in sidebar",
)

# ═════════════════════════════════════════════
# PreviousYearTest.jsx — ad in TestScreen sidebar, refresh on goNext
# ═════════════════════════════════════════════
patch(
    "frontend/src/pages/PreviousYearTest.jsx",
    'import api from "../api/api";',
    'import api from "../api/api";\nimport AdBanner from "../components/AdBanner";',
    "PreviousYearTest.jsx: import AdBanner",
)

patch(
    "frontend/src/pages/PreviousYearTest.jsx",
    '''  const [activeSubjectIdx, setActiveSubjectIdx] = useState(0);
  const [activeQIdx, setActiveQIdx] = useState(0);
  const [answers, setAnswers] = useState({});''',
    '''  const [activeSubjectIdx, setActiveSubjectIdx] = useState(0);
  const [activeQIdx, setActiveQIdx] = useState(0);
  const [adRefreshCount, setAdRefreshCount] = useState(0);
  const [answers, setAnswers] = useState({});''',
    "PreviousYearTest.jsx: adRefreshCount state",
)

patch(
    "frontend/src/pages/PreviousYearTest.jsx",
    '''  const goNext = () => {
    if (!testData) return;
    const subj = testData.subjects[activeSubjectIdx];
    if (activeQIdx < subj.questions.length - 1) {
      goToQuestion(activeSubjectIdx, activeQIdx + 1);
    } else if (activeSubjectIdx < testData.subjects.length - 1) {
      goToQuestion(activeSubjectIdx + 1, 0);
    }
  };''',
    '''  const goNext = () => {
    if (!testData) return;
    const subj = testData.subjects[activeSubjectIdx];
    if (activeQIdx < subj.questions.length - 1) {
      setAdRefreshCount((c) => c + 1);
      goToQuestion(activeSubjectIdx, activeQIdx + 1);
    } else if (activeSubjectIdx < testData.subjects.length - 1) {
      setAdRefreshCount((c) => c + 1);
      goToQuestion(activeSubjectIdx + 1, 0);
    }
  };''',
    "PreviousYearTest.jsx: increment adRefreshCount in goNext",
)

patch(
    "frontend/src/pages/PreviousYearTest.jsx",
    '''        onPrev={goPrev}
        onNext={goNext}
        onSubmitClick={() => setShowSubmitConfirm(true)}''',
    '''        onPrev={goPrev}
        onNext={goNext}
        adRefreshTrigger={adRefreshCount}
        onSubmitClick={() => setShowSubmitConfirm(true)}''',
    "PreviousYearTest.jsx: pass adRefreshTrigger to TestScreen",
)

patch(
    "frontend/src/pages/PreviousYearTest.jsx",
    '''  onPrev,
  onNext,
  onSubmitClick,''',
    '''  onPrev,
  onNext,
  adRefreshTrigger,
  onSubmitClick,''',
    "PreviousYearTest.jsx: TestScreen accepts adRefreshTrigger",
)

patch(
    "frontend/src/pages/PreviousYearTest.jsx",
    '''        <div className="w-full lg:w-72 bg-[#111827] border border-gray-800 rounded-2xl p-5 h-fit">
          <div className="grid grid-cols-1 gap-2 text-[11px] mb-5">
            <LegendItem colorClass="bg-green-500" label="Answered" count={summary.answered} />''',
    '''        <div className="w-full lg:w-72 bg-[#111827] border border-gray-800 rounded-2xl p-5 h-fit">
          <AdBanner adSlot="YOUR_AD_SLOT_ID" refreshTrigger={adRefreshTrigger} className="mb-4" />
          <div className="grid grid-cols-1 gap-2 text-[11px] mb-5">
            <LegendItem colorClass="bg-green-500" label="Answered" count={summary.answered} />''',
    "PreviousYearTest.jsx: AdBanner in TestScreen sidebar",
)

# ═════════════════════════════════════════════
# CurrentAffairs.jsx — ad below question card, refresh on goNext
# ═════════════════════════════════════════════
patch(
    "frontend/src/pages/CurrentAffairs.jsx",
    'import api from "../api/api";',
    'import api from "../api/api";\nimport AdBanner from "../components/AdBanner";',
    "CurrentAffairs.jsx: import AdBanner",
)

patch(
    "frontend/src/pages/CurrentAffairs.jsx",
    '''  const [activeQIdx, setActiveQIdx] = useState(0);
  const [resultData, setResultData] = useState(null);''',
    '''  const [activeQIdx, setActiveQIdx] = useState(0);
  const [adRefreshCount, setAdRefreshCount] = useState(0);
  const [resultData, setResultData] = useState(null);''',
    "CurrentAffairs.jsx: adRefreshCount state",
)

patch(
    "frontend/src/pages/CurrentAffairs.jsx",
    '''  const goNext = () => {
    if (quiz && activeQIdx < quiz.questions.length - 1) setActiveQIdx((i) => i + 1);
  };''',
    '''  const goNext = () => {
    if (quiz && activeQIdx < quiz.questions.length - 1) {
      setAdRefreshCount((c) => c + 1);
      setActiveQIdx((i) => i + 1);
    }
  };''',
    "CurrentAffairs.jsx: increment adRefreshCount in goNext",
)

patch(
    "frontend/src/pages/CurrentAffairs.jsx",
    '''          </div>

          <div className="flex gap-3">
            <button onClick={goPrev} disabled={activeQIdx === 0} className="px-4 py-2 rounded-lg border border-gray-700 text-sm text-gray-300 disabled:opacity-40">
              Previous
            </button>''',
    '''          </div>

          <AdBanner adSlot="YOUR_AD_SLOT_ID" refreshTrigger={adRefreshCount} className="mb-4" />

          <div className="flex gap-3">
            <button onClick={goPrev} disabled={activeQIdx === 0} className="px-4 py-2 rounded-lg border border-gray-700 text-sm text-gray-300 disabled:opacity-40">
              Previous
            </button>''',
    "CurrentAffairs.jsx: AdBanner below question card",
)

# ═════════════════════════════════════════════
# TeacherCoupons.jsx — codeless signup link per batch
# ═════════════════════════════════════════════
patch(
    "frontend/src/pages/teacher/TeacherCoupons.jsx",
    "  const [copiedCode, setCopiedCode] = useState(null);",
    "  const [copiedCode, setCopiedCode] = useState(null);\n  const [copiedLink, setCopiedLink] = useState(null);",
    "TeacherCoupons.jsx: copiedLink state",
)

patch(
    "frontend/src/pages/teacher/TeacherCoupons.jsx",
    '''  const copyCode = (code) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 1500);
  };''',
    '''  const copyCode = (code) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 1500);
  };

  const copySignupLink = (code) => {
    const link = `${window.location.origin}/#/Singup?ref=${code}&kind=teacher`;
    navigator.clipboard.writeText(link);
    setCopiedLink(code);
    setTimeout(() => setCopiedLink(null), 1500);
  };''',
    "TeacherCoupons.jsx: copySignupLink function",
)

patch(
    "frontend/src/pages/teacher/TeacherCoupons.jsx",
    '''                  <button
                    onClick={() => copyCode(c.code)}
                    className="flex items-center gap-2 bg-[#0A0D14] border border-gray-700 rounded-lg px-3 py-2 mb-3 hover:border-gray-500 transition-colors"
                  >
                    <span className="font-mono text-sm tracking-wider text-gray-200">{c.code}</span>
                    <span className="text-[11px] text-gray-500 ml-auto">
                      {copiedCode === c.code ? "Copied ✓" : "Copy"}
                    </span>
                  </button>''',
    '''                  <button
                    onClick={() => copyCode(c.code)}
                    className="flex items-center gap-2 bg-[#0A0D14] border border-gray-700 rounded-lg px-3 py-2 mb-2 hover:border-gray-500 transition-colors"
                  >
                    <span className="font-mono text-sm tracking-wider text-gray-200">{c.code}</span>
                    <span className="text-[11px] text-gray-500 ml-auto">
                      {copiedCode === c.code ? "Copied ✓" : "Copy"}
                    </span>
                  </button>

                  <button
                    onClick={() => copySignupLink(c.code)}
                    className="flex items-center gap-2 bg-[#0A0D14] border border-gray-700 rounded-lg px-3 py-2 mb-3 hover:border-gray-500 transition-colors w-full"
                  >
                    <span className="text-xs text-gray-400">Signup Link (bina code ke)</span>
                    <span className="text-[11px] text-gray-500 ml-auto flex-shrink-0">
                      {copiedLink === c.code ? "Copied ✓" : "Copy"}
                    </span>
                  </button>''',
    "TeacherCoupons.jsx: signup link button",
)

print("")
print("Done. Read every OK/WARNING line above.")
print("Agar koi WARNING aaya hai to wo file manually check karni hogi — patch skip ho gaya hai, koi nuksan nahi hua.")
