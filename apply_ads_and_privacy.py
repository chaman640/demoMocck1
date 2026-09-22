import os

PATCHES = {
    "frontend/index.html": [
        (
            '    <title>frontend</title>\n  </head>',
            '    <title>frontend</title>\n'
            '    <script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-XXXXXXXXXXXXXXXX" crossorigin="anonymous"></script>\n'
            '  </head>',
        ),
    ],
    "frontend/src/App.jsx": [
        (
            "import ForgotPassword from './pages/ForgotPassword';",
            "import ForgotPassword from './pages/ForgotPassword';\nimport PrivacyPolicy from './pages/PrivacyPolicy';",
        ),
        (
            '<Route path="/ForgotPassword" element={<ForgotPassword />} />',
            '<Route path="/ForgotPassword" element={<ForgotPassword />} />\n'
            '            <Route path="/PrivacyPolicy" element={<PrivacyPolicy />} />',
        ),
    ],
    "frontend/src/pages/Singup.jsx": [
        (
            '''          {/* Bottom Navigation Links */}
          <div className="mt-5 text-center text-xs text-[#64748B]">
            Already have an account?{' '}
            <Link to="/Login" className="text-[#2563EB] font-bold hover:underline ml-1">
              Log In
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Singup;''',
            '''          {/* Bottom Navigation Links */}
          <div className="mt-5 text-center text-xs text-[#64748B]">
            Already have an account?{' '}
            <Link to="/Login" className="text-[#2563EB] font-bold hover:underline ml-1">
              Log In
            </Link>
          </div>

          <div className="mt-3 text-center text-[11px] text-[#94A3B8]">
            <Link to="/PrivacyPolicy" className="hover:underline">
              Privacy Policy
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Singup;''',
        ),
    ],
    "frontend/src/pages/MockTest.jsx": [
        (
            'import api from "../api/api";\nimport BottomNav from "../components/BottomNav";',
            'import api from "../api/api";\nimport BottomNav from "../components/BottomNav";\nimport AdBanner from "../components/AdBanner";',
        ),
        (
            '  const [reviewConfig, setReviewConfig] = useState({ subjectName: null, filter: "all" });',
            '  const [reviewConfig, setReviewConfig] = useState({ subjectName: null, filter: "all" });\n'
            '  const [adRefreshCount, setAdRefreshCount] = useState(0);',
        ),
        (
            '''  const goNext = () => {
    if (!mockData) return;
    const subj = mockData.subjects[activeSubjectIdx];
    if (activeQIdx < subj.questions.length - 1) {
      goToQuestion(activeSubjectIdx, activeQIdx + 1);
    } else if (activeSubjectIdx < mockData.subjects.length - 1) {
      goToQuestion(activeSubjectIdx + 1, 0);
    }
  };''',
            '''  const goNext = () => {
    if (!mockData) return;
    const subj = mockData.subjects[activeSubjectIdx];
    if (activeQIdx < subj.questions.length - 1) {
      setAdRefreshCount((c) => c + 1);
      goToQuestion(activeSubjectIdx, activeQIdx + 1);
    } else if (activeSubjectIdx < mockData.subjects.length - 1) {
      setAdRefreshCount((c) => c + 1);
      goToQuestion(activeSubjectIdx + 1, 0);
    }
  };''',
        ),
        (
            '''        onPrev={goPrev}
        onNext={goNext}
        onSubmitClick={() => setShowSubmitConfirm(true)}''',
            '''        onPrev={goPrev}
        onNext={goNext}
        adRefreshTrigger={adRefreshCount}
        onSubmitClick={() => setShowSubmitConfirm(true)}''',
        ),
        (
            '''  onPrev,
  onNext,
  onSubmitClick,''',
            '''  onPrev,
  onNext,
  adRefreshTrigger,
  onSubmitClick,''',
        ),
        (
            '''        <div className="w-full lg:w-72 bg-[#111827] border border-gray-800 rounded-2xl p-5 h-fit">
          <div className="grid grid-cols-2 gap-2 text-[11px] mb-5">''',
            '''        <div className="w-full lg:w-72 bg-[#111827] border border-gray-800 rounded-2xl p-5 h-fit">
          <AdBanner adSlot="YOUR_AD_SLOT_ID" refreshTrigger={adRefreshTrigger} className="mb-4" />
          <div className="grid grid-cols-2 gap-2 text-[11px] mb-5">''',
        ),
    ],
}


def main():
    for rel_path, patches in PATCHES.items():
        if not os.path.exists(rel_path):
            print(f"Nahi mili: {rel_path} — skip.")
            continue

        with open(rel_path, "r", encoding="utf-8") as f:
            content = f.read()

        original = content
        for old, new in patches:
            if new in content:
                continue
            if old in content:
                content = content.replace(old, new, 1)
            else:
                print(f"WARNING: {rel_path} — ek patch ka purana pattern nahi mila, manually check karein.")

        if content != original:
            with open(rel_path, "w", encoding="utf-8") as f:
                f.write(content)
            print(f"OK: {rel_path} patched.")
        else:
            print(f"SKIP: {rel_path} — kuch badla nahi (already patched ho sakta hai).")

    print("\nDone.")


if __name__ == "__main__":
    main()
